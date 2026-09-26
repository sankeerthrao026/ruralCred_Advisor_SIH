# RuralCred Phase 1 Audit: Scenario → Risk Integration

**Audit Document:** `RURALCRED_PHASE1_SCENARIO_RISK_INTEGRATION_AUDIT.md`  
**Feature:** Phase 1 Feature #5 — Scenario → Risk Integration  
**Date:** 2026-09-25  
**Audit Scope:** Code-level inspection of Scenario Simulator, Financial Calculations, DSCR formulas, Deterministic Risk Engine integration, and UI reactivity.

---

# 1. Executive Summary

### Verdict: **COMPLETE**

The **Scenario → Risk Integration** in RuralCred is **COMPLETE**, verified, and operating in production without mocked or disconnected components. 

When a user adjusts custom scenario sliders (Revenue, Operating Expenses, Interest Rate, Project Cost), the values are directly calculated through reducing-balance debt servicing and net cash-flow equations, then fed into the authoritative deterministic risk engine (`evaluateFinancialRisks`), triggering invariant safeguards (`INVARIANT_DSCR_BORDERLINE`, `INVARIANT_DSCR_CRITICAL`, `RULE_1`, `RULE_2`, `RULE_3`). The final risk classification (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`) and dynamic mathematical reasoning are generated live from the computed state and rendered reactively in the UI.

---

# 2. Scenario Simulator

- **React Component:** [`ScenarioSimulatorCard`](file:///D:/dev_classroom/ruralCred_Advisor/components/simulator/ScenarioSimulatorCard.tsx#L30)
- **Source File:** [`components/simulator/ScenarioSimulatorCard.tsx`](file:///D:/dev_classroom/ruralCred_Advisor/components/simulator/ScenarioSimulatorCard.tsx)
- **Host Screens:** Rendered in [`BusinessAdvisorScreen.tsx`](file:///D:/dev_classroom/ruralCred_Advisor/components/screens/BusinessAdvisorScreen.tsx#L1349), [`FinancialAnalyticsScreen.tsx`](file:///D:/dev_classroom/ruralCred_Advisor/components/screens/FinancialAnalyticsScreen.tsx), and [`BusinessPlanScreen.tsx`](file:///D:/dev_classroom/ruralCred_Advisor/components/screens/BusinessPlanScreen.tsx).
- **Component State Variables:**
  - `activeTab`: `'suite' | 'custom'` (Toggle between 3-case preset comparison grid and interactive custom sliders)
  - `revenueDelta`: `number` (Slider: $-40\%$ to $+40\%$, step $5\%$)
  - `expenseDelta`: `number` (Slider: $-20\%$ to $+40\%$, step $5\%$)
  - `customRate`: `number` (Slider: $4.0\%$ to $16.0\%$ p.a., step $0.5\%$)
  - `customProjectCost`: `number` (Derived or user adjusted)
- **Scenario Modes:**
  1. **Base Case (`base`):** $0\%$ revenue delta, $0\%$ expense delta, standard interest rate ($8.0\%$ or $6.5\%$).
  2. **Conservative Case (`conservative`):** $-20\%$ adverse revenue shock, $+10\%$ operating expense increase, $+1.0\%$ interest rate stress.
  3. **Optimistic Case (`optimistic`):** $+15\%$ revenue expansion, $-5\%$ operational cost efficiency.
  4. **Custom Scenario (`custom`):** Live reactive calculations driven by user slider inputs.

---

# 3. Financial Calculation Flow

All scenario calculations occur deterministically in [`lib/finance/scenarios.ts`](file:///D:/dev_classroom/ruralCred_Advisor/lib/finance/scenarios.ts) (function `simulateScenario`) and [`backend/app/services/scenario_service.py`](file:///D:/dev_classroom/ruralCred_Advisor/backend/app/services/scenario_service.py) (function `simulate_scenario`).

### Step-by-Step Flow:

1. **Revenue Adjustment:**
   $$\text{revMultiplier} = \max\left(0.2,\, 1 + \frac{\text{revenueDeltaPct}}{100}\right)$$
   $$\text{monthlyRevenue} = \text{round}(\text{nominalRev} \times \text{revMultiplier})$$
   $$\text{annualRevenue} = \text{monthlyRevenue} \times 12$$

2. **Operating Cost Adjustment:**
   $$\text{expMultiplier} = \max\left(0.3,\, 1 + \frac{\text{expenseDeltaPct}}{100}\right)$$
   $$\text{monthlyExpense} = \text{round}(\text{nominalExp} \times \text{expMultiplier})$$
   $$\text{annualExpense} = \text{monthlyExpense} \times 12$$

3. **Monthly Net Surplus / Net Operating Income (NOI):**
   $$\text{monthlyNOI} = \text{monthlyRevenue} - \text{monthlyExpense}$$
   $$\text{annualNOI} = \text{monthlyNOI} \times 12$$

4. **Interest Rate & Reducing-Balance Debt Servicing:**
   - Effective interest rate: $\text{interestRateAnnual} = \max(1.0, \text{baseRate} + \text{rateDelta})$
   - Quarterly rate: $r = \frac{\text{interestRateAnnual} / 100}{4}$
   - Repayment quarters: $n = (\text{tenureYears} \times 4) - \text{moratoriumQuarters}$
   - Quarterly reducing-balance EMI formula:
     $$\text{quarterlyEmi} = \text{round}\left(\frac{P \times r \times (1 + r)^n}{(1 + r)^n - 1}\right)$$
   - Annual debt service: $\text{annualDebtService} = \text{quarterlyEmi} \times 4$
   - Annual Net Cash Flow: $\text{netAnnualCashFlow} = \text{annualNOI} - \text{annualDebtService}$

5. **Debt Service Coverage Ratio (DSCR):**
   $$\text{DSCR} = \text{round}\left(\frac{\text{annualNOI}}{\text{annualDebtService}} \times 100\right) / 100$$
   $$\text{isDscrHealthy} = (\text{DSCR} \ge 1.25)$$

---

# 4. Risk Engine

- **Risk Engine Function:** [`evaluateFinancialRisks()`](file:///D:/dev_classroom/ruralCred_Advisor/lib/risk/engine.ts#L47-L113)
- **Source File:** [`lib/risk/engine.ts`](file:///D:/dev_classroom/ruralCred_Advisor/lib/risk/engine.ts) (TypeScript) and [`backend/app/services/risk_service.py`](file:///D:/dev_classroom/ruralCred_Advisor/backend/app/services/risk_service.py) (Python)
- **Risk Invariant Rules Evaluated:**
  - **`RULE_1` (`active_loan_multiple`):** Triggered when applicant has an active loan while simulating another loan (`severity: alert`).
  - **`RULE_2` (`negative_cash_flow`):** Triggered when monthly expenses exceed monthly income or net cash flow $< 0$ (`severity: alert`).
  - **`RULE_3` (`downward_profit_trend`):** Triggered when simulated net cash flow drops $>30\%$ compared to baseline (`severity: warning`).
  - **`INVARIANT_DSCR_CRITICAL`:** Triggered when $\text{DSCR} < 1.00\text{x}$ (`severity: alert`). Operating income cannot cover mandatory bank debt service.
  - **`INVARIANT_DSCR_BORDERLINE`:** Triggered when $1.00\text{x} \le \text{DSCR} < 1.25\text{x}$ (`severity: warning`). Debt cushion is below MSME statutory safety standards.

### Severity Aggregation Logic:

In [`lib/finance/scenarios.ts`](file:///D:/dev_classroom/ruralCred_Advisor/lib/finance/scenarios.ts#L252-L267):

```typescript
const alertCount = detectedRisks.filter((r) => r.severity === 'alert').length;
const warningCount = detectedRisks.filter((r) => r.severity === 'warning').length;

if (alertCount >= 2 || dscr < 1.0 || netAnnualCashFlow < 0) {
  riskSeverity = 'critical';
} else if (alertCount === 1 || dscr < 1.25) {
  riskSeverity = 'high';
} else if (warningCount >= 1) {
  riskSeverity = 'moderate';
} else {
  riskSeverity = 'low';
}
```

---

# 5. Scenario → Risk Connection

The outputs of the scenario simulation are **directly passed into the deterministic risk engine**.

### Execution Chain:

```text
User Moves Slider in UI
        ↓
ScenarioSimulatorCard.tsx
  - Updates revenueDelta / expenseDelta / customRate in React state
        ↓
runScenarioComparisonSuite(baseParams, customConfig) (lib/finance/scenarios.ts)
        ↓
simulateScenario(base, config) (lib/finance/scenarios.ts)
  - Computes monthlyRevenue, monthlyExpense, monthlyNetOperatingIncome, quarterlyEmi, annualDebtService, DSCR
        ↓
evaluateFinancialRisks(RiskEvaluationInput) (lib/risk/engine.ts)
  - Inputs passed:
      totalIncome: monthlyRevenue
      totalExpenses: monthlyExpense
      netCashFlow: monthlyNetOperatingIncome
      previousNetCashFlow: nominalRev - nominalExp
      hasActiveLoan: base.hasActiveLoan
      simulatingSecondLoan: base.simulatingSecondLoan
        ↓
Invariant Safeguards Evaluation (lib/finance/scenarios.ts)
  - Checks if dscr < 1.00x → Appends INVARIANT_DSCR_CRITICAL
  - Checks if 1.00x ≤ dscr < 1.25x → Appends INVARIANT_DSCR_BORDERLINE
        ↓
Final Risk Classification Mapping (lib/finance/scenarios.ts)
  - Maps to: 'low' | 'moderate' | 'high' | 'critical'
        ↓
Dynamic Risk Shift Formulation (lib/finance/scenarios.ts)
  - Generates custom.riskShiftExplanation (interpolating live values)
        ↓
UI Rendering (ScenarioSimulatorCard.tsx)
  - Renders Risk Badge (LOW / MODERATE / HIGH / CRITICAL)
  - Renders DSCR gauge with color thresholds
  - Renders "Deterministic Risk Shift Reasoning" banner
  - Renders Triggered Invariant Warnings list
```

---

# 6. Risk Reasoning

The "Deterministic Risk Shift Reasoning" is **100% dynamically generated from calculated values**, NOT static or hard-coded.

### Source Evidence:

In [`lib/finance/scenarios.ts`](file:///D:/dev_classroom/ruralCred_Advisor/lib/finance/scenarios.ts#L273-L282):

```typescript
if (config.revenueDeltaPct < 0 || config.expenseDeltaPct > 0) {
  riskShiftExplanation = `Under ${config.name || 'this scenario'} (${config.revenueDeltaPct}% revenue, +${config.expenseDeltaPct}% opex), monthly net surplus shifts to ₹${monthlyNetOperatingIncome.toLocaleString('en-IN')}. DSCR changes to ${dscr.toFixed(2)}x, placing the risk level at ${riskSeverity.toUpperCase()}.`;
  riskShiftExplanationTe = `${config.nameTe || 'ఈ పరిస్థితి'}లో (${config.revenueDeltaPct}% రాబడి, +${config.expenseDeltaPct}% ఖర్చులు), నెలవారీ నికర లాభం ₹${monthlyNetOperatingIncome.toLocaleString('en-IN')} గా మారుతుంది. DSCR ${dscr.toFixed(2)}x కి చేరి రిస్క్ స్థాయిని ${riskSeverityTe} గా మార్చింది.`;
} else if (config.revenueDeltaPct > 0) {
  riskShiftExplanation = `Under ${config.name || 'this scenario'} (+${config.revenueDeltaPct}% revenue), monthly net surplus expands to ₹${monthlyNetOperatingIncome.toLocaleString('en-IN')}. DSCR strengthens to ${dscr.toFixed(2)}x, ensuring robust bankability.`;
  riskShiftExplanationTe = `${config.nameTe || 'ఈ పరిస్థితి'}లో (+${config.revenueDeltaPct}% రాబడి), నెలవారీ నికర లాభం ₹${monthlyNetOperatingIncome.toLocaleString('en-IN')} కి పెరుగుతుంది. DSCR ${dscr.toFixed(2)}x కి మెరుగై బలమైన ఆర్థిక స్థిరత్వాన్ని ఇస్తుంది.`;
} else {
  riskShiftExplanation = `Base scenario yields steady monthly net surplus of ₹${monthlyNetOperatingIncome.toLocaleString('en-IN')} with healthy DSCR of ${dscr.toFixed(2)}x.`;
  riskShiftExplanationTe = `సాధారణ బేస్ కేస్ లో నెలవారీ నికర లాభం ₹${monthlyNetOperatingIncome.toLocaleString('en-IN')} మరియు స్థిరమైన DSCR ${dscr.toFixed(2)}x నమోదైంది.`;
}
```

Every parameter (deltas, monthly surplus in ₹, DSCR ratio to 2 decimals, and risk level in uppercase) is interpolated dynamically in English and Telugu.

---

# 7. Three-Case Comparison

- **Base Case:** Passed to `simulateScenario(base, SCENARIO_PRESETS.base)` $\implies$ calls `evaluateFinancialRisks`.
- **Conservative Case:** Passed to `simulateScenario(base, SCENARIO_PRESETS.conservative)` $\implies$ calls `evaluateFinancialRisks`.
- **Optimistic Case:** Passed to `simulateScenario(base, SCENARIO_PRESETS.optimistic)` $\implies$ calls `evaluateFinancialRisks`.

**Confirmation:** All three preset cases pass through the **exact same underlying financial and risk calculation pipeline** as the custom slider case.

---

# 8. Custom Slider Verification

### Verification Scenario 1: Base Case Baseline
- **Inputs:** Margin Capital = ₹1,00,000, Project Cost = ₹10,00,000, Loan Amount = ₹9,00,000, Interest Rate = $8.0\%$, Revenue $\Delta = 0\%$, Expense $\Delta = 0\%$.
- **Calculated:** Monthly Revenue = ₹1,20,000, Monthly Expense = ₹78,000, Monthly NOI = ₹42,000, Annual Debt Service = ₹1,78,916, $\text{DSCR} = 2.82\text{x}$.
- **Result:** Alerts = 0, Warnings = 0, $\text{DSCR} \ge 1.25\text{x} \implies$ **`LOW RISK`**.

### Verification Scenario 2: Moderate Stress Slider
- **Inputs:** Revenue $\Delta = -20\%$, Expense $\Delta = +10\%$, Interest Rate = $8.0\%$.
- **Calculated:** Monthly Revenue = ₹96,000, Monthly Expense = ₹85,800, Monthly NOI = ₹10,200, Annual NOI = ₹1,22,400, $\text{DSCR} = 0.68\text{x}$.
- **Result:** Triggers `INVARIANT_DSCR_CRITICAL` ($\text{DSCR} < 1.00\text{x}$) and `RULE_3` (Cash flow drop $> 30\%$) $\implies$ Risk escalates to **`CRITICAL RISK`**.

### Verification Scenario 3: High Interest Rate Slider
- **Inputs:** Revenue $\Delta = 0\%$, Expense $\Delta = 0\%$, Interest Rate = $16.0\%$ (Commercial Rate).
- **Calculated:** Quarterly EMI increases to ₹56,220, Annual Debt Service = ₹2,24,880, DSCR drops to $2.24\text{x}$.
- **Result:** Validates that rate shifts directly alter debt obligations and DSCR coverage.

---

# 9. Hard-Coded / Duplicated Logic Audit

| Audit Check | Status | Observations |
| :--- | :--- | :--- |
| **Hard-coded Risk Labels** | **CLEAN** | Risk severity labels (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`) are dynamically derived from `alertCount`, `warningCount`, and `dscr`. |
| **Duplicated Risk Thresholds** | **CLEAN** | Both TypeScript and Python implementations share identical statutory standards: $\text{DSCR} < 1.00\text{x}$ (Critical) and $\text{DSCR} < 1.25\text{x}$ (Borderline). |
| **Mock Calculations** | **NONE** | No static mock arrays or hardcoded simulation tables exist. |
| **Static Reasoning Text** | **NONE** | Reasoning strings use template literals with formatted currency and calculated ratios. |
| **Separate / Divergent Risk Engines** | **NONE** | Scenarios explicitly import `evaluateFinancialRisks` from `lib/risk/engine.ts`. |
| **UI-Only Risk Classification** | **NONE** | UI components read `custom.riskSeverity` directly from engine calculation results. |

---

# 10. Tests

The following automated test cases in [`test/phase1_simulation.test.ts`](file:///D:/dev_classroom/ruralCred_Advisor/test/phase1_simulation.test.ts) cover this integration:

1. **`SCEN_01`:** *Base case matches expected operational parameters* — Validates positive NOI, $\text{DSCR} > 1.25\text{x}$, and `riskSeverity === 'low'`.
2. **`SCEN_02`:** *Conservative stress case (-20% rev, +10% exp) adjusts DSCR and increases risk* — Validates that stress scenario reduces NOI and DSCR, escalates risk severity, and generates dynamic explanation.
3. **`SCEN_03`:** *Optimistic growth case (+15% rev) expands cash flow and strengthens DSCR* — Validates increased revenue, improved DSCR, and maintained `low` risk.
4. **`SCEN_04`:** *Custom user sliders dynamically update scenario metrics* — Validates extreme slider settings ($-35\%$ rev, $+25\%$ exp) triggering safeguards and escalating to `high`/`critical`.
5. **`RISK_01`:** *Invariant DSCR < 1.25x triggers warning safeguard* — Validates borderline DSCR condition attaching `INVARIANT_DSCR_BORDERLINE`.
6. **`RISK_02`:** *Active loan + new loan simulation correctly flags dual debt invariant* — Validates dual loan scenario triggering `RULE_1`.
7. **`SSOT_01`:** *Business Plan, Multi-Year, and Feasibility share identical capital figures* — Validates single source of truth across all modules.

---

# 11. Findings

### What is Working:
- Reactive slider updates in [`ScenarioSimulatorCard.tsx`](file:///D:/dev_classroom/ruralCred_Advisor/components/simulator/ScenarioSimulatorCard.tsx).
- Complete mathematical linkage from sliders $\to$ EMI/NOI $\to$ DSCR $\to$ `evaluateFinancialRisks` $\to$ severity classification.
- Live bilingual cause-and-effect risk explanation generation.
- Full unit test validation (15/15 tests passing).
- Zero TypeScript errors (`npx tsc --noEmit` code 0) and clean Next.js build.

### What is Incomplete:
- *None.* All specified Phase 1 requirements for Scenario → Risk Integration are fulfilled.

### What is Inconsistent:
- *None.* Parity is maintained between TypeScript (`lib/finance/scenarios.ts`) and Python (`backend/app/services/scenario_service.py`).

---

# 12. Final Verdict

### **COMPLETE**

**Justification:**  
Feature #5 (Scenario → Risk Integration) is fully implemented, verified, and integrated into RuralCred. The slider controls directly compute reducing-balance debt servicing and cash flows, feed into the shared deterministic risk engine, enforce statutory DSCR invariant safeguards ($1.25\text{x}$ and $1.00\text{x}$), dynamically generate mathematical explanations, and render reactively in the UI.
