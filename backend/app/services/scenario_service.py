import math
from typing import Dict, Any, Optional, List
from app.models.schemas import (
    ScenarioSimulateRequest,
    ScenarioResultSchema,
    ScenarioComparisonSuiteResponse,
    RiskAnalysisRequest,
)
from app.services.finance_service import calculate_finance_plan
from app.services.risk_service import evaluate_financial_risks

def simulate_scenario(
    base: ScenarioSimulateRequest,
    scenario_id: str,
    name: str,
    name_te: str,
    description: str,
    description_te: str,
    rev_delta: float,
    exp_delta: float,
    rate_delta: float = 0.0,
    custom_cost: Optional[float] = None,
    custom_loan: Optional[float] = None,
    custom_rate: Optional[float] = None,
) -> ScenarioResultSchema:
    margin_capital = max(1000.0, float(base.marginCapital or 100000.0))
    project_cost = float(custom_cost or (base.projectCost or round(margin_capital / 0.10)))
    loan_amount = float(custom_loan or (base.loanAmount or round(project_cost * 0.90)))

    default_monthly_rev = max(25000.0, round(project_cost * 0.12))
    default_monthly_exp = max(15000.0, round(default_monthly_rev * 0.65))

    nominal_rev = float(base.baseMonthlyRevenue or default_monthly_rev)
    nominal_exp = float(base.baseMonthlyExpense or default_monthly_exp)

    rev_mult = max(0.2, 1.0 + (rev_delta / 100.0))
    exp_mult = max(0.3, 1.0 + (exp_delta / 100.0))

    monthly_rev = round(nominal_rev * rev_mult)
    monthly_exp = round(nominal_exp * exp_mult)
    monthly_noi = monthly_rev - monthly_exp

    annual_rev = monthly_rev * 12.0
    annual_exp = monthly_exp * 12.0
    annual_noi = monthly_noi * 12.0

    is_micro = project_cost <= 140000.0
    base_rate = float(custom_rate or (base.interestRateAnnual or (6.5 if is_micro else 8.0)))
    annual_rate_val = max(1.0, base_rate + rate_delta)
    tenure_years = float(base.tenureYears or (3.0 if is_micro else 7.0))
    moratorium_months = 3 if is_micro else 6

    quarterly_rate = (annual_rate_val / 100.0) / 4.0
    total_quarters = int(tenure_years * 4)
    moratorium_quarters = round(moratorium_months / 3)
    repayment_quarters = max(1, total_quarters - moratorium_quarters)

    p = float(loan_amount)
    r = quarterly_rate
    n = repayment_quarters

    if r > 0 and n > 0:
        factor = math.pow(1.0 + r, n)
        quarterly_emi = round((p * r * factor) / (factor - 1.0))
    else:
        quarterly_emi = round(p / n) if n > 0 else 0

    annual_debt = quarterly_emi * 4.0
    net_annual_cash = annual_noi - annual_debt

    dscr = round((annual_noi / annual_debt) * 100) / 100 if annual_debt > 0 else 2.5
    is_dscr_healthy = dscr >= 1.25

    margin_pct = round((monthly_noi / max(1.0, monthly_rev)) * 100)
    monthly_fixed = round(quarterly_emi / 3.0) + round(monthly_exp * 0.40)
    cm = max(0.1, 1.0 - ((monthly_exp * 0.60) / max(1.0, monthly_rev)))
    break_even = round(monthly_fixed / cm)

    # Risk integration
    risk_req = RiskAnalysisRequest(
        hasActiveLoan=base.hasActiveLoan or False,
        simulatingSecondLoan=base.simulatingSecondLoan or False,
        totalIncome=monthly_rev,
        totalExpenses=monthly_exp,
        netCashFlow=monthly_noi,
        previousNetCashFlow=nominal_rev - nominal_exp,
    )
    detected = evaluate_financial_risks(risk_req)

    triggered = []
    triggered_te = []

    if dscr < 1.0:
        triggered.append(f"Critical DSCR Deficit ({dscr:.2f}x < 1.00x): Enterprise income cannot cover EMI.")
        triggered_te.append(f"తీవ్రమైన రుణ చెల్లింపు లోటు ({dscr:.2f}x < 1.00x).")
    elif dscr < 1.25:
        triggered.append(f"DSCR Below Safe Threshold ({dscr:.2f}x < 1.25x).")
        triggered_te.append(f"DSCR భద్రతా ప్రమాణం కంటే తక్కువ ({dscr:.2f}x < 1.25x).")

    risk_items = detected.detectedRisks if hasattr(detected, "detectedRisks") else detected
    alerts = [x for x in risk_items if getattr(x, "severity", None) == "alert"]
    warnings = [x for x in risk_items if getattr(x, "severity", None) == "warning"]


    risk_sev = "low"
    risk_sev_te = "తక్కువ రిస్క్ (Low)"
    if len(alerts) >= 2 or dscr < 1.0 or net_annual_cash < 0:
        risk_sev = "critical"
        risk_sev_te = "తీవ్రమైన రిస్క్ (Critical)"
    elif len(alerts) == 1 or dscr < 1.25:
        risk_sev = "high"
        risk_sev_te = "అధిక రిస్క్ (High)"
    elif len(warnings) >= 1:
        risk_sev = "moderate"
        risk_sev_te = "మధ్యస్థ రిస్క్ (Moderate)"

    if rev_delta < 0 or exp_delta > 0:
        shift_exp = f"Under {name} ({rev_delta}% revenue, +{exp_delta}% opex), monthly net surplus shifts to ₹{int(monthly_noi):,}. DSCR changes to {dscr:.2f}x, escalating risk to {risk_sev.upper()}."
        shift_exp_te = f"{name_te} లో ({rev_delta}% రాబడి, +{exp_delta}% ఖర్చులు), నెలవారీ నికర లాభం ₹{int(monthly_noi):,} గా మారుతుంది. DSCR {dscr:.2f}x కి చేరి రిస్క్ ను {risk_sev_te} గా మార్చింది."
    elif rev_delta > 0:
        shift_exp = f"Under {name} (+{rev_delta}% revenue), monthly net surplus expands to ₹{int(monthly_noi):,}. DSCR strengthens to {dscr:.2f}x."
        shift_exp_te = f"{name_te} లో (+{rev_delta}% రాబడి), నెలవారీ నికర లాభం ₹{int(monthly_noi):,} కి పెరుగుతుంది. DSCR {dscr:.2f}x కి మెరుగైంది."
    else:
        shift_exp = f"Base scenario yields steady monthly net surplus of ₹{int(monthly_noi):,} with healthy DSCR of {dscr:.2f}x."
        shift_exp_te = f"సాధారణ బేస్ కేస్ లో నెలవారీ నికర లాభం ₹{int(monthly_noi):,} మరియు స్థిరమైన DSCR {dscr:.2f}x నమోదైంది."

    return ScenarioResultSchema(
        scenarioId=scenario_id,
        name=name,
        nameTe=name_te,
        description=description,
        descriptionTe=description_te,
        revenueDeltaPct=rev_delta,
        expenseDeltaPct=exp_delta,
        interestRateAnnual=annual_rate_val,
        projectCost=project_cost,
        marginCapital=margin_capital,
        loanAmount=loan_amount,
        monthlyRevenue=monthly_rev,
        monthlyExpense=monthly_exp,
        monthlyNetOperatingIncome=monthly_noi,
        annualRevenue=annual_rev,
        annualExpense=annual_exp,
        annualNetOperatingIncome=annual_noi,
        quarterlyEmi=quarterly_emi,
        annualDebtService=annual_debt,
        netAnnualCashFlow=net_annual_cash,
        dscr=dscr,
        isDscrHealthy=is_dscr_healthy,
        operatingMarginPct=margin_pct,
        breakEvenMonthlyRevenue=break_even,
        riskSeverity=risk_sev,
        riskSeverityTe=risk_sev_te,
        riskShiftExplanation=shift_exp,
        riskShiftExplanationTe=shift_exp_te,
        triggeredSafeguards=triggered,
        triggeredSafeguardsTe=triggered_te,
    )

def run_scenario_comparison_suite(base: ScenarioSimulateRequest) -> ScenarioComparisonSuiteResponse:
    base_res = simulate_scenario(
        base,
        scenario_id="base",
        name="Base Case (Expected)",
        name_te="సాధారణ ప్రణాళిక (బేస్ కేస్)",
        description="Expected operational performance.",
        description_te="సాధారణ మార్కెట్ పరిస్థితులలో ఆశించిన పనితీరు.",
        rev_delta=0.0,
        exp_delta=0.0,
    )
    conservative_res = simulate_scenario(
        base,
        scenario_id="conservative",
        name="Conservative Case (Stress Test)",
        name_te="సంక్షోభ పరీక్ష (కన్జర్వేటివ్ కేస్)",
        description="Adverse shock: -20% revenue, +10% opex.",
        description_te="అమ్మకాలలో 20% తగ్గుదల మరియు ఖర్చులలో 10% పెరుగుదల.",
        rev_delta=-20.0,
        exp_delta=10.0,
        rate_delta=1.0,
    )
    optimistic_res = simulate_scenario(
        base,
        scenario_id="optimistic",
        name="Optimistic Case (High Growth)",
        name_te="అభివృద్ధి ప్రణాళిక (ఆప్టిమిస్టిక్ కేస్)",
        description="Growth: +15% revenue, -5% opex.",
        description_te="అధిక గిరాకీ (15% పెరుగుదల) మరియు ఖర్చుల ఆదా (5%).",
        rev_delta=15.0,
        exp_delta=-5.0,
    )

    custom_res = None
    if base.customRevenueDeltaPct is not None or base.customExpenseDeltaPct is not None:
        custom_res = simulate_scenario(
            base,
            scenario_id="custom",
            name="Custom User Scenario",
            name_te="కస్టమ్ ప్రణాళిక",
            description="User customized inputs.",
            description_te="వినియోగదారు సర్దుబాటు చేసిన పారామితులు.",
            rev_delta=float(base.customRevenueDeltaPct or 0.0),
            exp_delta=float(base.customExpenseDeltaPct or 0.0),
            rate_delta=float(base.customInterestRateDeltaPct or 0.0),
            custom_cost=base.customProjectCost,
            custom_loan=base.customLoanAmount,
        )

    resilience = "High Resilience"
    resilience_te = "అధిక సంక్షోభ నిరోధకత (High Resilience)"
    if conservative_res.dscr < 1.0 or conservative_res.netAnnualCashFlow < 0:
        resilience = "Vulnerable to Shocks"
        resilience_te = "సంక్షోభాలకు లోనయ్యే అవకాశం (Vulnerable)"
    elif conservative_res.dscr < 1.25:
        resilience = "Moderate Resilience"
        resilience_te = "మధ్యస్థ నిరోధకత (Moderate Resilience)"

    exec_sum = f"Business maintains positive annual cash flow (₹{int(base_res.netAnnualCashFlow):,}) with DSCR of {base_res.dscr:.2f}x under base conditions. Under conservative stress tests (-20% rev), DSCR adjusts to {conservative_res.dscr:.2f}x."
    exec_sum_te = f"సాధారణ స్థితిలో వార్షిక నికర నగదు ప్రవాహం ₹{int(base_res.netAnnualCashFlow):,} మరియు DSCR {base_res.dscr:.2f}x గా ఉంది. సంక్షోభంలో DSCR {conservative_res.dscr:.2f}x గా ఉంటుంది."

    return ScenarioComparisonSuiteResponse(
        base=base_res,
        conservative=conservative_res,
        optimistic=optimistic_res,
        custom=custom_res,
        resilienceRating=resilience,
        resilienceRatingTe=resilience_te,
        executiveSummary=exec_sum,
        executiveSummaryTe=exec_sum_te,
        recommendations=[
            f"Maintain minimum break-even monthly revenue of ₹{int(conservative_res.breakEvenMonthlyRevenue):,}.",
            "Hold 20% liquid working capital reserve buffer to prevent cash deficits.",
        ],
        recommendationsTe=[
            f"నెలకు కనీసం ₹{int(conservative_res.breakEvenMonthlyRevenue):,} అమ్మకాలు ఉండేలా చూసుకోండి.",
            "20% వర్కింగ్ క్యాపిటల్ రిజర్వ్ నిల్వ ఉంచండి.",
        ],
    )
