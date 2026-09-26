import math
from datetime import datetime
from typing import Dict, Any, List
from app.models.schemas import (
    FeasibilityEvaluateRequest,
    FeasibilityEvaluateResponse,
    FeasibilityDimensionSchema,
)
from app.services.risk_service import evaluate_financial_risks
from app.models.schemas import RiskAnalysisRequest
from app.services.finance_service import calculate_finance_plan

def evaluate_business_feasibility(req: FeasibilityEvaluateRequest) -> FeasibilityEvaluateResponse:
    category = (req.category or "Dairy Farming").strip()
    location = (req.location or "Warangal, Telangana").strip()

    margin_capital = max(1000.0, float(req.marginCapital or 100000.0))
    project_cost = float(req.projectCost or round(margin_capital / 0.10))
    loan_amount = float(req.loanAmount or round(project_cost * 0.90))

    default_monthly_rev = max(25000.0, round(project_cost * 0.12))
    default_monthly_exp = max(15000.0, round(default_monthly_rev * 0.65))

    monthly_rev = float(req.monthlyRevenueEstimate or default_monthly_rev)
    monthly_exp = float(req.monthlyExpenseEstimate or default_monthly_exp)
    monthly_noi = max(0.0, monthly_rev - monthly_exp)

    # 1. Financial Viability (30%)
    margin_pct = round((monthly_noi / max(1.0, monthly_rev)) * 100)
    fin_plan = calculate_finance_plan(margin_capital)
    quarterly_emi = fin_plan.quarterlyEmi
    quarterly_noi = monthly_noi * 3.0
    dscr = round((quarterly_noi / quarterly_emi) * 100) / 100 if quarterly_emi > 0 else 2.5

    fin_score = 50.0
    fin_reasons: List[str] = []
    fin_reasons_te: List[str] = []

    if margin_pct >= 25:
        fin_score += 25.0
        fin_reasons.append(f"High operating profit margin of {margin_pct}% provides strong cash buffer.")
        fin_reasons_te.append(f"నికర నిర్వహణ లాభ మార్జిన్ {margin_pct}% గా ఉండి బలమైన లాభదాయకతను సూచిస్తుంది.")
    elif margin_pct >= 15:
        fin_score += 15.0
        fin_reasons.append(f"Moderate operating profit margin of {margin_pct}%.")
        fin_reasons_te.append(f"మధ్యస్థ నిర్వహణ లాభ మార్జిన్ {margin_pct}%.")
    else:
        fin_score -= 10.0
        fin_reasons.append(f"Thin operating margin of {margin_pct}% increases vulnerability to cost spikes.")
        fin_reasons_te.append(f"తక్కువ లాభ మార్జిన్ {margin_pct}% వల్ల నిర్వహణ ఖర్చులు పెరిగితే నష్టాలొచ్చే అవకాశం ఉంది.")

    if dscr >= 1.5:
        fin_score += 25.0
        fin_reasons.append(f"Excellent Debt Service Coverage Ratio (DSCR {dscr:.2f}x) well above banking threshold.")
        fin_reasons_te.append(f"అద్భుతమైన రుణ చెల్లింపు సామర్థ్యం (DSCR {dscr:.2f}x) బ్యాంకింగ్ ప్రమాణాల కంటే ఎక్కువగా ఉంది.")
    elif dscr >= 1.25:
        fin_score += 15.0
        fin_reasons.append(f"Adequate DSCR ({dscr:.2f}x) meets bank sanction requirements.")
        fin_reasons_te.append(f"సరైన రుణ చెల్లింపు సామర్థ్యం ({dscr:.2f}x) బ్యాంక్ నిబంధనలకు అనుగుణంగా ఉంది.")
    else:
        fin_score -= 20.0
        fin_reasons.append(f"Deficient DSCR ({dscr:.2f}x) violates the 1.25x mandatory banking safety invariant.")
        fin_reasons_te.append(f"తక్కువ DSCR ({dscr:.2f}x) బ్యాంకింగ్ భద్రతా ప్రమాణం 1.25x కంటే తక్కువగా ఉంది.")

    bounded_fin = max(10.0, min(100.0, fin_score))

    # 2. Market Viability (25%)
    density = req.competitorDensityLevel or "Moderate"
    mkt_score = 60.0
    mkt_reasons: List[str] = []
    mkt_reasons_te: List[str] = []

    cat_lower = category.lower()
    is_essential = any(k in cat_lower for k in ["dairy", "milk", "kirana", "poultry", "milling"])
    if is_essential:
        mkt_score += 20.0
        mkt_reasons.append("High, recession-resilient local daily demand for essential agricultural/food products.")
        mkt_reasons_te.append("నిత్యావసర ఉత్పత్తులకు స్థానికంగా రోజూ నిరంతర డిమాండ్ ఉంటుంది.")
    else:
        mkt_score += 10.0
        mkt_reasons.append("Discretionary rural demand subject to festive and harvest liquidity cycles.")
        mkt_reasons_te.append("పండుగలు మరియు పంట కోతల సమయంలో మాత్రమే అధిక డిమాండ్ ఉండే అవకాశం ఉంది.")

    if density == "Low":
        mkt_score += 20.0
        mkt_reasons.append("Low competitor density indicates favorable market pricing power.")
        mkt_reasons_te.append("పోటీదారులు తక్కువగా ఉన్నందున మంచి ధర నిర్ణయించుకునే అవకాశం ఉంది.")
    elif density == "Moderate":
        mkt_score += 10.0
        mkt_reasons.append("Balanced competitor presence with sustainable local customer base.")
        mkt_reasons_te.append("మితమైన పోటీతో కూడిన స్థానిక వినియోగదారుల మార్కెట్.")
    else:
        mkt_score -= 10.0
        mkt_reasons.append("High competitor density requires clear quality or delivery differentiation.")
        mkt_reasons_te.append("పోటీ ఎక్కువగా ఉన్నందున నాణ్యత లేదా సేవలలో ప్రత్యేకత చూపించాలి.")

    bounded_mkt = max(15.0, min(100.0, mkt_score))

    # 3. Operational Readiness (20%)
    ops_score = 75.0
    ops_reasons = ["Fodder, raw materials, and village labor accessible in district cluster."]
    ops_reasons_te = ["దాణా, ముడిసరుకు మరియు శ్రామిక వనరులు జిల్లా పరిధిలో అందుబాటులో ఉన్నాయి."]
    bounded_ops = max(15.0, min(100.0, ops_score))

    # 4. Location Suitability (15%)
    loc_score = 80.0
    loc_reasons = [f"Established agro-commercial infrastructure and mandi connectivity in {location}."]
    loc_reasons_te = [f"{location} ప్రాంతంలో బలమైన వ్యవసాయ-వాణిజ్య మౌలిక సదుపాయాలు ఉన్నాయి."]
    bounded_loc = max(20.0, min(100.0, loc_score))

    # 5. Risk Profile (10%)
    risk_req = RiskAnalysisRequest(
        hasActiveLoan=req.hasActiveLoan or False,
        simulatingSecondLoan=req.simulatingSecondLoan or False,
        totalIncome=monthly_rev,
        totalExpenses=monthly_exp,
        netCashFlow=monthly_noi,
    )
    detected = evaluate_financial_risks(risk_req)
    risk_score = 90.0
    risk_reasons: List[str] = []
    risk_reasons_te: List[str] = []

    alerts = [r for r in detected if r.severity == "alert"]
    warnings = [r for r in detected if r.severity == "warning"]

    if not alerts and not warnings:
        risk_score = 95.0
        risk_reasons.append("Zero invariant financial violations. All debt burden and liquidity checks pass.")
        risk_reasons_te.append("ఎటువంటి ఆర్థిక రిస్క్ ఉల్లంఘనలు లేవు. రుణ భారం సురక్షితంగా ఉంది.")
    else:
        if alerts:
            risk_score -= len(alerts) * 35.0
            for a in alerts:
                risk_reasons.append(f"Alert: {a.title} ({a.reason})")
                risk_reasons_te.append(f"హెచ్చరిక: {a.titleTe} ({a.reasonTe})")
        if warnings:
            risk_score -= len(warnings) * 15.0
            for w in warnings:
                risk_reasons.append(f"Warning: {w.title} ({w.reason})")
                risk_reasons_te.append(f"సూచన: {w.titleTe} ({w.reasonTe})")

    bounded_risk = max(10.0, min(100.0, risk_score))

    # Overall Weighted Score
    overall_raw = (
        bounded_fin * 0.30
        + bounded_mkt * 0.25
        + bounded_ops * 0.20
        + bounded_loc * 0.15
        + bounded_risk * 0.10
    )
    overall_score = round(overall_raw)

    if overall_score >= 80:
        grade = "Grade A (Highly Feasible)"
        grade_te = "గ్రేడ్ A (అత్యంత అనుకూలమైన వ్యాపారం)"
        summary = "Strong multi-dimensional feasibility. High debt servicing capacity, robust local demand, and compliant risk profile."
        summary_te = "అన్ని విధాలా అత్యుత్తమ వ్యాపార సాధ్యత. అధిక రుణ చెల్లింపు సామర్థ్యం మరియు బలమైన మార్కెట్ గిరాకీ ఉన్నాయి."
    elif overall_score < 50:
        grade = "Grade C (Marginal / High Risk)"
        grade_te = "గ్రేడ్ C (అధిక రిస్క్ / పరిమిత సాధ్యత)"
        summary = "Elevated operational or financial risk. Strengthen equity margin or lower project cost before seeking formal bank credit."
        summary_te = "అధిక నిర్వహణ లేదా ఆర్థిక రిస్క్ ఉంది. బ్యాంక్ రుణం తీసుకునే ముందు సొంత పెట్టుబడిని పెంచుకోండి."
    else:
        grade = "Grade B (Conditionally Feasible)"
        grade_te = "గ్రేడ్ B (పరిస్థితులకు లోబడి సాధ్యమే)"
        summary = "Viable enterprise proposal with positive operating fundamentals. Address minor margin risks before bank appraisal."
        summary_te = "సానుకూల ప్రాథమిక అంశాలతో కూడిన ఆచరణాత్మక వ్యాపార ప్రతిపాదన."

    dimensions: Dict[str, FeasibilityDimensionSchema] = {
        "financialViability": FeasibilityDimensionSchema(
            key="financialViability",
            label="Financial Viability",
            labelTe="ఆర్థిక సాధ్యత (30%)",
            weight=0.30,
            weightedPoints=round(bounded_fin * 0.30, 1),
            score=bounded_fin,
            status="strong" if bounded_fin >= 75 else ("moderate" if bounded_fin >= 50 else "weak"),
            statusTe="బలమైనది" if bounded_fin >= 75 else "మధ్యస్థం",
            reasons=fin_reasons,
            reasonsTe=fin_reasons_te,
        ),
        "marketViability": FeasibilityDimensionSchema(
            key="marketViability",
            label="Market Viability",
            labelTe="మార్కెట్ గిరాకీ & పోటీ (25%)",
            weight=0.25,
            weightedPoints=round(bounded_mkt * 0.25, 1),
            score=bounded_mkt,
            status="strong" if bounded_mkt >= 75 else "moderate",
            statusTe="బలమైనది" if bounded_mkt >= 75 else "మధ్యస్థం",
            reasons=mkt_reasons,
            reasonsTe=mkt_reasons_te,
        ),
        "operationalReadiness": FeasibilityDimensionSchema(
            key="operationalReadiness",
            label="Operational Readiness",
            labelTe="నిర్వహణ సంసిద్ధత (20%)",
            weight=0.20,
            weightedPoints=round(bounded_ops * 0.20, 1),
            score=bounded_ops,
            status="strong" if bounded_ops >= 75 else "moderate",
            statusTe="బలమైనది" if bounded_ops >= 75 else "మధ్యస్థం",
            reasons=ops_reasons,
            reasonsTe=ops_reasons_te,
        ),
        "locationSuitability": FeasibilityDimensionSchema(
            key="locationSuitability",
            label="Location Suitability",
            labelTe="ప్రాంతీయ అనుకూలత (15%)",
            weight=0.15,
            weightedPoints=round(bounded_loc * 0.15, 1),
            score=bounded_loc,
            status="strong" if bounded_loc >= 75 else "moderate",
            statusTe="బలమైనది" if bounded_loc >= 75 else "మధ్యస్థం",
            reasons=loc_reasons,
            reasonsTe=loc_reasons_te,
        ),
        "riskProfile": FeasibilityDimensionSchema(
            key="riskProfile",
            label="Risk & Safeguard Profile",
            labelTe="రిస్క్ ప్రొఫైల్ (10%)",
            weight=0.10,
            weightedPoints=round(bounded_risk * 0.10, 1),
            score=bounded_risk,
            status="strong" if bounded_risk >= 75 else "moderate",
            statusTe="సురక్షితం" if bounded_risk >= 75 else "మధ్యస్థం",
            reasons=risk_reasons,
            reasonsTe=risk_reasons_te,
        ),
    }

    return FeasibilityEvaluateResponse(
        overallScore=overall_score,
        grade=grade,
        gradeTe=grade_te,
        summary=summary,
        summaryTe=summary_te,
        dimensions=dimensions,
        strengths=[f"Solid financial returns with DSCR of {dscr:.2f}x.", "Reliable daily consumption demand in the local village cluster."],
        strengthsTe=[f"DSCR {dscr:.2f}x తో బలమైన ఆర్థిక రాబడులు.", "స్థానిక గ్రామీణ మార్కెట్లో నిరంతర వినియోగ డిమాండ్."],
        vulnerabilities=["Working capital buffer requires careful month-by-month cash flow management."],
        vulnerabilitiesTe=["వర్కింగ్ క్యాపిటల్ నిల్వలను నెలవారీగా జాగ్రత్తగా నిర్వహించాలి."],
        recommendedActions=[
            f"Maintain at least ₹{round(project_cost * 0.15):,} as liquid contingency reserve.",
            "Leverage government credit subsidy under PMEGP or MUDRA to reduce net interest outflow."
        ],
        recommendedActionsTe=[
            f"కనీసం ₹{round(project_cost * 0.15):,} అత్యవసర నిధిగా అందుబాటులో ఉంచుకోండి.",
            "PMEGP లేదా MUDRA వంటి ప్రభుత్వ రాయితీ పథకాలను సద్వినియోగం చేసుకోండి."
        ],
        assumptionsUsed=[
            f"Promoter Margin: ₹{int(margin_capital):,} (10% equity)",
            f"Monthly Revenue: ₹{int(monthly_rev):,} | OPEX: ₹{int(monthly_exp):,}",
            "Statutory DSCR Benchmark: 1.25x (RBI/NABARD)",
        ],
        calculatedAt=datetime.utcnow().isoformat() + "Z",
    )
