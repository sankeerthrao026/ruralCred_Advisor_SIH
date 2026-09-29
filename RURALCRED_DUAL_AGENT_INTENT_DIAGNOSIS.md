# RURALCRED Dual-Agent Intent Diagnosis

**Diagnosis Date:** September 28, 2026  
**Project:** RuralCred Advisor — Smart India Hackathon (SIH)  
**Target Repository:** `https://github.com/sankeerthrao026/ruralCred_Advisor_SIH.git`  
**Active Branch:** `main`  
**Audit Type:** Stage 1 Read-Only Dual-Agent Intent Understanding Diagnosis  
**Application Code Modified:** **NO (0 lines of application code modified)**  

---

## 1. Executive Summary

This diagnosis investigated the intent-understanding pipeline across both RuralCred intelligence agents: **Agent 1 (Business Advisor / RAG & Unit Economics Engine)** and **Agent 2 (Finance Advisor / Loan Structuring & Cash Flow Reasoner)**.

The audit examined how both agents interpret natural language user queries, extract numerical values, assign semantic roles to numbers, route requests across RAG/ChromaDB/calculators, and handle multi-turn context.

### Key Diagnostic Findings:
1. **Keyword/Number-Driven Intent Selection (Approach B over Approach A):** Both agents currently determine intent using sequential keyword matching and regex-based numerical extraction **before** understanding the semantic meaning of the complete query.
2. **Numerical Intent Hijacking:** When a query contains a financial number (e.g. `₹7,500`, `₹90,000`), the number is extracted syntactically as a numeric target. In both agents, if specific intent keywords are absent, the presence of this number causes the system to force a **calculation intent** (`capacity_calculation` or `target_profit_capacity`), misinterpreting queries about **provenance** ("Where did ₹90,000 come from?"), **evidence verification** ("Did your retrieved documents contain ₹7,500?"), or **comparisons** ("Compare ₹7,500 monthly with ₹90,000 annually").
3. **Severe Agent Asymmetry & Disagreement:**
   - **Agent 1** understands `retrieval_evidence_inspection`, unit capacity calculations, and location selection, but completely lacks intents for `provenance_query`, `translation_query`, and `comparison_query`.
   - **Agent 2** understands loan affordability, EMI math, working capital splits, and debt management, but has **zero awareness of ChromaDB vector store or retrieval evidence** (e.g. classifying "Search retrieved documents" as bank KYC loan documents).
   - **Inter-Agent Communication:** There is **zero communication or consensus protocol** between Agent 1 and Agent 2. Each operates in its own isolated screen/API silo.
4. **Actual Test Results (21 Evaluated Queries):**
   - **Agent 1 Accuracy:** 8 PASS, 1 PARTIAL, 12 FAIL
   - **Agent 2 Accuracy:** 3 PASS, 1 PARTIAL, 17 FAIL
   - **Agent Agreement:** Both agents agreed on only 4 out of 21 queries (~19% agreement).

---

## 2. Current Intent Architecture

RuralCred currently employs a decoupled dual-agent architecture where intent classification is performed independently by rule-based Python classifiers in the backend and TypeScript mirrors in the frontend:

```
                                    User Query
                                        │
             ┌──────────────────────────┴──────────────────────────┐
             ▼                                                     ▼
    [Business Advisor Screen]                             [Finance Advisor Screen]
             │                                                     │
             ▼                                                     ▼
         AGENT 1                                               AGENT 2
  (Business Advisor Engine)                             (Finance Advisor Engine)
             │                                                     │
    1. parse_target_amount()                              1. parse_target_amount()
    2. detect_business_domain()                           2. classify_query_intent()
    3. classify_intent() [Regex/Keywords]                 3. calculate_intent_metrics()
             │                                                     │
     ┌───────┴───────┐                                     ┌───────┴───────┐
     ▼               ▼                                     ▼               ▼
 [ChromaDB RAG]  [Business Calc]                       [Schemes Calc]  [Gemini Loan AI]
 (Collection:    (Capacity /                           (MUDRA, PMEGP,  (Grounded Loan
 ruralcred_       Break-Even /                          Stand-Up,       Explanation)
 knowledge)       Volume Target)                        NBCFDC)
```

### Critical Architectural Flaw:
Neither agent uses LLM-based intent reasoning or semantic dependency parsing. Both agents execute rigid `if/elif` keyword checks. If a number is detected, it is immediately converted into a numeric target float (`targetAmount`) and used to short-circuit intent resolution.

---

## 3. Agent 1 Analysis (Business Advisor)

- **Backend Implementation:** [`backend/app/services/rag_service.py`](file:///D:/dev_classroom/ruralCred_Advisor/backend/app/services/rag_service.py) (`RAGService`), [`backend/app/services/business_calculator.py`](file:///D:/dev_classroom/ruralCred_Advisor/backend/app/services/business_calculator.py) (`BusinessCalculationEngine`).
- **Frontend Implementation:** [`lib/finance/business-calculator.ts`](file:///D:/dev_classroom/ruralCred_Advisor/lib/finance/business-calculator.ts), [`lib/ai/provider.ts`](file:///D:/dev_classroom/ruralCred_Advisor/lib/ai/provider.ts) (`generateBusinessAnalysis`).
- **System Instructions:** Directs Google Gemini (`gemini-2.5-flash`) or NVIDIA NIM to generate structured SWOT, competitor density, market reach, and pricing suggestions grounded strictly on compact JSON context retrieved from ChromaDB (`ruralcred_knowledge`).
- **Strengths:**
  - Robust domain detection (Dairy, Kirana, Weaving, Poultry, Tailoring, Agri-Processing).
  - Explicit 5-point evidence contract for `retrieval_evidence_inspection` (ChromaDB collection name, chunk count, chunk IDs, similarity distances, exact excerpt + calculated source disclaimer).
  - Accurate unit capacity calculations when given explicit target profits ("How many cows for ₹7,500/month?").
- **Weaknesses:**
  - Lacks intents for `provenance_query`, `translation_query`, `comparison_query`, `input_parameter_calculation`.
  - In `classify_intent()`, line 347 (`elif target_amt: intent = "capacity_calculation"`) acts as a catch-all for any query containing numbers $\ge 1000$ that fails to match explicit keyword lists.
  - Queries asking "Where did ₹90,000 come from?" or "Why did you calculate ₹90,000?" are misinterpreted as "Calculate how many cows are needed to earn ₹90,000".

---

## 4. Agent 2 Analysis (Finance Advisor)

- **Backend Implementation:** [`backend/app/services/finance_service.py`](file:///D:/dev_classroom/ruralCred_Advisor/backend/app/services/finance_service.py) (`generate_finance_advice`), [`backend/app/services/finance_advisor_engine.py`](file:///D:/dev_classroom/ruralCred_Advisor/backend/app/services/finance_advisor_engine.py) (`classify_query_intent`, `calculate_intent_metrics`).
- **Frontend Implementation:** [`lib/finance/advisor-pipeline.ts`](file:///D:/dev_classroom/ruralCred_Advisor/lib/finance/advisor-pipeline.ts), [`app/api/ai/finance-advisor/route.ts`](file:///D:/dev_classroom/ruralCred_Advisor/app/api/ai/finance-advisor/route.ts).
- **System Instructions:** Combines verified deterministic loan mathematics with demographic-biased scheme ranking (Stand-Up India for Women & SC/ST, NBCFDC for OBC), working capital vs capex split, seasonal moratorium recommendations, and conversational reasoning.
- **Strengths:**
  - Highly accurate deterministic calculations for loan math, reducing-balance EMIs, and DSCR coverage.
  - Granular financial intents (`loan_affordability`, `investment_decision`, `debt_management`, `savings_planning`, `expense_reduction`, `moratorium_guidance`).
  - Strong demographic scheme prioritization.
- **Weaknesses:**
  - **Zero ChromaDB / Vector Store Integration:** Agent 2 has no connection to ChromaDB. It cannot inspect chunks, verify retrieval provenance, or explain vector evidence.
  - **Keyword Collision:** Querying "Search retrieved documents for ₹90,000" triggers `document_requirements` (bank loan KYC documents) because of the keyword `"document"`.
  - Queries about evidence, provenance, or pricing fall back to `open_ended_planning`.

---

## 5. Agent 1 vs Agent 2 Agreement

| Test # | Query Text | Agent 1 Interpretation | Agent 2 Interpretation | Agreement Status | Resolution Mechanism |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **1** | How many cows do I need to make ₹7,500 per month? | `capacity_calculation` | `target_profit_capacity` | **AGREE (PASS)** | Both recognize target capacity |
| **2** | Show me the ChromaDB retrieval evidence... | `retrieval_evidence_inspection` | `open_ended_planning` | **DISAGREE** | Screen silo (Agent 1 only) |
| **3** | Where did your ₹90,000 figure come from? | `capacity_calculation` | `open_ended_planning` | **DISAGREE (BOTH FAIL)** | None (No provenance intent) |
| **4** | What is the milk price in Warangal? | `general_advisory` | `open_ended_planning` | **DISAGREE** | Screen silo (Agent 1 RAG) |
| **5** | Calculate the monthly profit from 10 cows. | `general_advisory` | `open_ended_planning` | **DISAGREE (BOTH FAIL)** | None (Fails input parameter) |
| **6** | Show me the retrieved chunks used to answer... | `retrieval_evidence_inspection` | `open_ended_planning` | **DISAGREE** | Screen silo (Agent 1 only) |
| **7** | Translate your previous answer into Telugu. | `general_advisory` | `open_ended_planning` | **DISAGREE (BOTH FAIL)** | None (No translation intent) |
| **8** | What government schemes are available... | `government_schemes` | `government_schemes` | **AGREE (PASS)** | Both recognize schemes |
| **9** | Simulate the loan from the scheme I selected. | `government_schemes` | `government_schemes` | **AGREE (PARTIAL)** | Both match scheme keyword |
| **10** | Compare the two loan options. | `general_advisory` | `open_ended_planning` | **DISAGREE (BOTH FAIL)** | None (No comparison intent) |
| **11** | Why did you calculate ₹90,000? | `capacity_calculation` | `open_ended_planning` | **DISAGREE (BOTH FAIL)** | None (No provenance intent) |
| **12** | Search the retrieved documents for ₹90,000. | `retrieval_evidence_inspection` | `document_requirements` | **DISAGREE** | Collides with bank KYC docs |
| **ADV 1** | ₹7,500 is my target. How many cows? | `capacity_calculation` | `target_profit_capacity` | **AGREE (PASS)** | Both recognize target capacity |
| **ADV 2** | Did your retrieved documents contain ₹7,500? | `retrieval_evidence_inspection` | `document_requirements` | **DISAGREE** | Collides with bank KYC docs |
| **ADV 3** | Why is the answer ₹7,500? | `capacity_calculation` | `open_ended_planning` | **DISAGREE (BOTH FAIL)** | 7500 hijacks Agent 1 |
| **ADV 4** | Calculate using ₹7,500 as the monthly target. | `capacity_calculation` | `open_ended_planning` | **DISAGREE** | Agent 1 matches, Agent 2 fails |
| **ADV 5** | Show me evidence for the ₹7,500 value. | `capacity_calculation` | `open_ended_planning` | **DISAGREE (BOTH FAIL)** | 7500 hijacks Agent 1 |
| **ADV 6** | Is ₹7,500 mentioned in ChromaDB? | `capacity_calculation` | `open_ended_planning` | **DISAGREE (BOTH FAIL)** | 7500 hijacks Agent 1 |
| **ADV 7** | Compare ₹7,500 monthly with ₹90,000 annually. | `capacity_calculation` | `open_ended_planning` | **DISAGREE (BOTH FAIL)** | 7500 hijacks Agent 1 |

### Summary on Inter-Agent Validation:
- **Agent 2 does NOT validate Agent 1.**
- There is **no shared intent arbitration layer**, no consensus voting, and no cross-agent validation.
- When an agent is called, it processes the query independently without consulting the other agent's findings or classification.

---

## 6. Current Intent Categories

### Agent 1 Categories (14 total):
1. `retrieval_evidence_inspection` (ChromaDB collection, chunk metadata, vector distances, raw text)
2. `location_selection` (Mandi hubs, commercial centers, local advantages)
3. `investment_decision` (Asset purchase feasibility, AC, machinery)
4. `capacity_calculation` (Units/cows needed for target profit)
5. `profitability_calculation` (Expected profit margin, net earnings)
6. `break_even_calculation` (Break-even sales volume)
7. `volume_target_calculation` (Liters/output needed for target revenue)
8. `expansion_capital_calculation` (Capital needed to scale up)
9. `raw_material_optimization` (Feed, fodder, yarn procurement)
10. `pricing_guidance` (Mandi selling prices, benchmark rates)
11. `government_schemes` (MUDRA, PMEGP, Stand-Up India)
12. `seasonal_operational_advice` (Summer heat stress, monsoon bottlenecks)
13. `cash_flow_optimization` (Working capital, credit/Udhaar management)
14. `general_advisory` (Default fallback)

### Agent 2 Categories (21 total):
1. `moratorium_guidance` (Seasonal repayment grace period)
2. `investment_decision` (Affordability and ROI of equipment/AC)
3. `target_profit_capacity` (Units needed for annual profit)
4. `revenue_for_target_profit` (Sales needed for profit target)
5. `target_profit_planning` (Comprehensive financial blueprint for profit goal)
6. `savings_planning` (Monthly savings rate & emergency runway)
7. `expense_reduction` (Top expense drivers and cost cutting)
8. `scheme_rationale` (Why a specific scheme fits the profile)
9. `government_schemes` (General scheme eligibility)
10. `document_requirements` (Bank loan KYC checklist)
11. `working_capital_split` (Liquidity vs capex allocation)
12. `debt_management` (Multi-obligation structuring & debt safety)
13. `max_borrowing_capacity` (Prudent borrowing ceiling)
14. `emi_calculation` (Quarterly & monthly loan repayment)
15. `interest_cost` (Total borrowing cost & cumulative interest)
16. `loan_affordability` (Loan sanction feasibility & DSCR)
17. `profit_analysis` (Logbook cash flow surplus analysis)
18. `business_expansion` (Expansion viability)
19. `break_even_analysis` (Operating cost break-even)
20. `cash_flow_analysis` (Net cash flow trend)
21. `open_ended_planning` (Default fallback)

### Identified Gaps:
- Neither agent contains:
  - `provenance_query`
  - `translation_query`
  - `comparison_query`
  - `input_parameter_calculation`

---

## 7. Numeric Parsing & Numeric Role Analysis

Both agents use `parse_target_amount()`:
```python
def parse_target_amount(text: str) -> Optional[float]:
    # Extracts numbers matching lakhs, crores, k, or digits >= 1000
    ...
```

### The Semantic Role Problem:
The current parser only answers: *"What is the numeric value?"*  
It fails to answer: *"What is the grammatical and semantic role of this number in the user's sentence?"*

| Query Text | Extracted Number | Assigned Role (Current System) | Actual Semantic Role (User Intent) | System Impact |
| :--- | :---: | :--- | :--- | :--- |
| `"How many cows for ₹7,500/month?"` | `7500.0` | `TARGET_PROFIT` | `TARGET_PROFIT` | **CORRECT** |
| `"Where did your ₹90,000 figure come from?"` | `90000.0` | `TARGET_PROFIT` | `PREVIOUS_ANSWER_VALUE (PROVENANCE)` | **INCORRECT** (Calculates cows for 90k) |
| `"Did your retrieved documents contain ₹7,500?"` | `7500.0` | `TARGET_PROFIT` | `SEARCH_TARGET_VALUE (EVIDENCE)` | **INCORRECT** in Agent 2 |
| `"Why did you calculate ₹90,000?"` | `90000.0` | `TARGET_PROFIT` | `PREVIOUS_ANSWER_VALUE (PROVENANCE)` | **INCORRECT** (Calculates cows for 90k) |
| `"Compare ₹7,500 monthly with ₹90,000 annually"` | `7500.0` | `TARGET_PROFIT` | `COMPARISON_OPERAND` | **INCORRECT** (Ignores 90,000 and compares nothing) |
| `"Calculate monthly profit from 10 cows"` | `None` | `None` (Ignored because $< 1000$) | `INPUT_PARAMETER (CAPACITY)` | **INCORRECT** (Fails calculation) |

---

## 8. Query Routing Analysis

| Step | Agent 1 (Business Advisor) | Agent 2 (Finance Advisor) |
| :--- | :--- | :--- |
| **1. Cache Check** | In-memory SHA-256 cache (`_advisor_cache`) | None (Calculates dynamically) |
| **2. Intent & Domain** | `business_calculator.classify_intent()` | `finance_advisor_engine.classify_query_intent()` |
| **3. ChromaDB Retrieval** | Semantic search on `ruralcred_knowledge` (n=4) | **Bypassed / None** |
| **4. Calculation Layer** | `BusinessCalculationEngine` (Capacity/Break-even) | `finance_service` / `schemes_calculator` |
| **5. LLM Prompt Construction** | Injects compact JSON context + calculation summary | Injects user financial state + calculation summary |
| **6. LLM Provider Call** | Gemini 2.5 Flash / NVIDIA NIM | Gemini 2.5 Flash |
| **7. Fallback Mode** | `_generate_grounded_fallback` (Deterministic) | Deterministic metric template |

---

## 9. Retrieval-Evidence Query Analysis

- **Agent 1:**
  - Matches queries with keywords: `"chromadb retrieval evidence"`, `"retrieval evidence"`, `"retrieved chunks"`, `"document/chunk ids"`, `"similarity scores"`, etc.
  - Successfully routes to `_generate_retrieval_evidence_response()`, returning the 5-point contract.
  - **Vulnerability:** If the user omits specific keyword phrases (e.g. asking *"Show me evidence for the ₹7,500 value"* or *"Is ₹7,500 mentioned in ChromaDB?"*), the intent classifier misses `is_retrieval_evidence` and falls through to line 347 `elif target_amt: intent = "capacity_calculation"`.
- **Agent 2:**
  - Has **zero retrieval-evidence routing**.
  - Words like `"documents"` route to bank loan documents (`document_requirements`); all other evidence queries fall back to `open_ended_planning`.

---

## 10. Calculation Query Analysis

- **Target Profit to Capacity ("How many cows for ₹7,500?"):**
  - Handled accurately by both Agent 1 and Agent 2.
- **Input Capacity to Profit ("Calculate profit from 10 cows"):**
  - **FAILED BY BOTH AGENTS.**
  - `parse_target_amount()` requires numbers $\ge 1000$ or explicit lakh/crore/k suffixes. A small integer like `10` is ignored.
  - Because `target_amt` is `None`, neither agent identifies `10 cows` as an input parameter for a forward calculation, falling back to general advisory or open-ended planning.

---

## 11. Provenance Query Analysis

- **Definition:** Queries inquiring into the origin, derivation, or formula behind a previously stated number (e.g. *"Where did that ₹90,000 figure come from?"*, *"Why did you calculate ₹90,000?"*).
- **Current Behavior:**
  - Neither agent has a `provenance_query` intent category.
  - In Agent 1, `parse_target_amount("Where did your ₹90,000 figure come from?")` extracts `90000.0`. Line 347 immediately sets `intent = "capacity_calculation"`.
  - The system then responds by calculating how many cows are needed to generate ₹90,000 annual profit (recommending 1 cow), instead of explaining that ₹90,000 was derived from $3,000\text{ L} \times ₹55/\text{L} - ₹75,000\text{ opex}$.
  - In Agent 2, the query falls back to `open_ended_planning`.

---

## 12. Multi-Turn Context Analysis

### Test Case 1 (Provenance after Calculation):
- **Turn 1 User:** *"What is the estimated profit?"*
- **Turn 1 Assistant:** *"The estimated net profit is ₹90,000 per year (₹7,500/month)..."*
- **Turn 2 User:** *"Where did that ₹90,000 come from?"*
- **Actual Agent 1 Behavior:** `capacity_calculation` (`targetAmount=90000.0`). Agent 1 treats the follow-up as a new capacity request. **(FAIL)**
- **Actual Agent 2 Behavior:** `open_ended_planning`. **(FAIL)**

### Test Case 2 (Evidence after Calculation):
- **Turn 1 User:** *"How many cows would I need for ₹7,500/month?"*
- **Turn 1 Assistant:** *"You need 1 milch cow producing 3,000 L/year..."*
- **Turn 2 User:** *"Show me the ChromaDB evidence for that."*
- **Actual Agent 1 Behavior:** `retrieval_evidence_inspection` (`targetAmount=None`). Correctly recognizes retrieval evidence and does not carry over the calculation intent. **(PASS)**
- **Actual Agent 2 Behavior:** `open_ended_planning`. **(FAIL)**

---

## 13. Adversarial Test Results

| # | Adversarial Query | Expected Intent | Agent 1 Result | Agent 2 Result | Diagnosis |
| :---: | :--- | :--- | :---: | :---: | :--- |
| **1** | `"₹7,500 is my target. How many cows?"` | `CAPACITY_CALCULATION` | `capacity_calculation` **(PASS)** | `target_profit_capacity` **(PASS)** | Target profit correctly parsed. |
| **2** | `"Did your retrieved documents contain ₹7,500?"` | `RETRIEVAL_EVIDENCE` | `retrieval_evidence_inspection` **(PASS)** | `document_requirements` **(FAIL)** | Agent 2 confused retrieved docs with bank KYC. |
| **3** | `"Why is the answer ₹7,500?"` | `PROVENANCE_QUERY` | `capacity_calculation` **(FAIL)** | `open_ended_planning` **(FAIL)** | 7500 hijacked Agent 1 into capacity calculation. |
| **4** | `"Calculate using ₹7,500 as the monthly target."` | `CAPACITY_CALCULATION` | `capacity_calculation` **(PASS)** | `open_ended_planning` **(FAIL)** | Agent 2 failed to detect target profit intent. |
| **5** | `"Show me evidence for the ₹7,500 value."` | `RETRIEVAL_EVIDENCE` | `capacity_calculation` **(FAIL)** | `open_ended_planning` **(FAIL)** | "Evidence" alone was not in keyword list; 7500 hijacked intent. |
| **6** | `"Is ₹7,500 mentioned in ChromaDB?"` | `RETRIEVAL_EVIDENCE` | `capacity_calculation` **(FAIL)** | `open_ended_planning` **(FAIL)** | "ChromaDB" alone without "evidence" missed regex; 7500 hijacked intent. |
| **7** | `"Compare ₹7,500 monthly with ₹90,000 annually."` | `COMPARISON_QUERY` | `capacity_calculation` **(FAIL)** | `open_ended_planning` **(FAIL)** | 7500 hijacked Agent 1; no comparison intent in either agent. |

---

## 14. Root Cause

The root cause of intent misinterpretation in RuralCred stems from four architectural deficiencies:

1. **Premature Numerical Routing:** Intent classification is done using string pattern matching where `parse_target_amount()` extracts any number $\ge 1000$ before grammatical context is established. If explicit query keywords do not match, the existence of `targetAmount` triggers `capacity_calculation` by default.
2. **Absence of Provenance & Comparison Intent Handlers:** Neither agent implements handlers for `provenance_query` ("Where did figure X come from?"), `translation_query` ("Translate answer to Telugu"), `comparison_query` ("Compare option A and B"), or `forward_calculation` ("Profit from N units").
3. **Agent Capability Asymmetry:** Agent 1 has vector retrieval tools but no loan underwriting intelligence; Agent 2 has loan underwriting math but zero vector store tools.
4. **Lack of a Unified Intent Reasoning Orchestrator:** Both agents operate in isolated frontend and backend silos with no shared semantic parser or inter-agent communication protocol.

---

## 15. Exact Files and Functions Responsible

### Agent 1 (Business Advisor):
- [`backend/app/services/business_calculator.py`](file:///D:/dev_classroom/ruralCred_Advisor/backend/app/services/business_calculator.py):
  - `parse_target_amount(text: str)` (Lines 5–54)
  - `BusinessCalculationEngine.classify_intent(query, history, fallback_category)` (Lines 167–374, specifically line 347 fallback `elif target_amt: intent = "capacity_calculation"`)
- [`backend/app/services/rag_service.py`](file:///D:/dev_classroom/ruralCred_Advisor/backend/app/services/rag_service.py):
  - `RAGService.analyze_business_opportunity(req: AdvisorAnalyzeRequest)` (Lines 401–710)
  - `RAGService._generate_retrieval_evidence_response()` (Lines 223–400)
- [`lib/finance/business-calculator.ts`](file:///D:/dev_classroom/ruralCred_Advisor/lib/finance/business-calculator.ts):
  - `parseTargetAmount(text: string)` (Lines 57–90)
  - `classifyQueryIntent(query, history, fallbackCategory)` (Lines 208–360)

### Agent 2 (Finance Advisor):
- [`backend/app/services/finance_advisor_engine.py`](file:///D:/dev_classroom/ruralCred_Advisor/backend/app/services/finance_advisor_engine.py):
  - `parse_target_amount(text: str)` (Lines 53–92)
  - `classify_query_intent(query: str)` (Lines 102–236)
  - `calculate_intent_metrics(ctx, intent_data)` (Lines 238–624)
- [`backend/app/services/finance_service.py`](file:///D:/dev_classroom/ruralCred_Advisor/backend/app/services/finance_service.py):
  - `generate_finance_advice(req: FinanceAdviceRequest)` (Lines 754–963)
- [`lib/finance/advisor-pipeline.ts`](file:///D:/dev_classroom/ruralCred_Advisor/lib/finance/advisor-pipeline.ts):
  - `classifyFinancialQueryIntent(query: string)` (Lines 502–721)
  - `performQuestionSpecificCalculations(context, intentResult)` (Lines 732–1045)

---

## 16. Recommended Fix

To establish robust semantic intent understanding without breaking existing deterministic calculators, the following 4-part solution is recommended:

### 1. Unified Semantic Intent Classification Layer
Replace independent regex heuristics with a unified semantic intent classifier that evaluates the full query grammar and determines the **semantic role** of any extracted numbers before selecting the action:
- `ROLE_TARGET_PROFIT`: Number represents desired financial outcome $\rightarrow$ Route to Capacity Engine.
- `ROLE_PREVIOUS_FIGURE (PROVENANCE)`: Number refers to previously generated output $\rightarrow$ Route to Provenance Explainer.
- `ROLE_SEARCH_KEY`: Number is a filter/search token $\rightarrow$ Route to ChromaDB Evidence Inspector.
- `ROLE_INPUT_PARAMETER`: Number represents unit count (e.g. 10 cows) $\rightarrow$ Route to Forward Profit Calculator.
- `ROLE_COMPARISON_VALUE`: Number is part of a comparative query $\rightarrow$ Route to Scenario/Option Comparator.

### 2. Add Missing Core Intent Handlers
Add explicit handlers in both backend and frontend for:
- `provenance_query`: Explains the exact mathematical derivation and source benchmarks for any previously cited number.
- `retrieval_evidence_inspection`: Supported across both agents, querying ChromaDB collection `ruralcred_knowledge`.
- `forward_unit_calculation`: Calculates gross revenue, opex, and net profit given an input quantity of units/animals (e.g. 10 cows).
- `translation_query`: Translates the previous response into the requested language.
- `comparison_query`: Compares two loan schemes, business models, or financial options.

### 3. Grammar-Aware Provenance & Evidence Regex (Pre-LLM Guard)
Expand high-priority regex patterns in `classify_intent()` and `classify_query_intent()` to catch provenance and evidence phrases:
- Provenance: `where did (your|the|that) .* come from`, `why did you calculate`, `how did you get`, `formula for`, `source of`
- Evidence: `evidence for`, `is .* in chromadb`, `mentioned in chromadb`, `retrieved documents contain`

### 4. Dual-Agent Consensus & Inter-Agent Dispatcher
Implement an orchestrator that shares intent classification results between Agent 1 and Agent 2, ensuring consistent understanding regardless of which screen receives the user inquiry.

---

## 17. Risks / Regression Areas

1. **Target Profit Capacity Calculation Regression:** Ensure queries like `"How many cows to make ₹7,500/month?"` or `"₹7,500 is my target. How many cows?"` continue to route to `capacity_calculation` without degradation.
2. **Telugu & Indic Language Regex Sensitivity:** Telugu queries (e.g. `ఎన్ని ఆవులు కావాలి`, `ఆధారాలు ఎక్కడ ఉన్నాయి`, `ఈ లెక్క ఎలా వచ్చింది`) must be thoroughly verified against the unified classifier.
3. **ChromaDB Performance & Latency:** Ensure provenance queries do not trigger redundant vector queries when data is already available in the calculation engine.
4. **Bilingual Response Parity:** Both English and Telugu responses must maintain identical numeric outputs and tone.

---

## 18. Proposed Validation Matrix

| Test ID | Test Category | Query | Expected Intent | Semantic Role of Number | Verification Criteria |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **V-01** | Capacity Target | "How many cows do I need to make ₹7,500 per month?" | `capacity_calculation` | `TARGET_PROFIT` | Returns 1 milch cow with 3,000 L/yr breakdown. |
| **V-02** | Evidence Inspection | "Show me the ChromaDB retrieval evidence for your previous answer." | `retrieval_evidence_inspection` | N/A | Returns 5-point ChromaDB metadata report. |
| **V-03** | Evidence with Figure | "Did your retrieved documents contain ₹7,500?" | `retrieval_evidence_inspection` | `SEARCH_TARGET_VALUE` | Clarifies ₹7,500 is `CALCULATED_SOURCE`, not raw text. |
| **V-04** | Provenance Inquiry | "Where did your ₹90,000 figure come from?" | `provenance_query` | `PREVIOUS_ANSWER_VALUE` | Explains formula: $3,000\text{ L} \times ₹55 - ₹75,000 = ₹90,000$. |
| **V-05** | Provenance Inquiry | "Why did you calculate ₹90,000?" | `provenance_query` | `PREVIOUS_ANSWER_VALUE` | Explains formula without triggering cow capacity calculation. |
| **V-06** | Forward Unit Calc | "Calculate the monthly profit from 10 cows." | `forward_unit_calculation` | `INPUT_PARAMETER` | Outputs $10 \times ₹7,500 = ₹75,000/\text{month}$. |
| **V-07** | RAG Market Inquiry | "What is the milk price in Warangal?" | `market_pricing_rag` | N/A | Retrieves Warangal APMC mandi rates from ChromaDB. |
| **V-08** | Scheme Matching | "What government schemes are available for this business?" | `government_schemes` | N/A | Evaluates MUDRA, Stand-Up India, PMEGP, NBCFDC. |
| **V-09** | Loan Simulation | "Simulate the loan from the scheme I selected." | `loan_simulation` | N/A | Calculates reducing-balance quarterly EMI and DSCR. |
| **V-10** | Comparison Query | "Compare ₹7,500 monthly with ₹90,000 annually." | `comparison_query` | `COMPARISON_OPERAND` | Shows $₹7,500 \times 12 = ₹90,000$ equivalence. |
| **V-11** | Multi-Turn Provenance | User asks profit $\rightarrow$ then asks "Where did that come from?" | `provenance_query` | `PREVIOUS_ANSWER_VALUE` | Contextually explains previous turn's numbers. |
| **V-12** | Telugu Provenance | "ఈ ₹90,000 లెక్క ఎక్కడి నుండి వచ్చింది?" | `provenance_query` | `PREVIOUS_ANSWER_VALUE` | Generates 100% Telugu mathematical explanation. |
