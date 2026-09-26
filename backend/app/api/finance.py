from typing import Optional, List
from fastapi import APIRouter, Depends
from app.auth import get_auth_context, AuthContext
from app.models.schemas import (
    FinanceCalculateRequest,
    FinancePlanResponse,
    FinancialHealthResponse,
    FinanceAdviceRequest,
    FinanceAdviceResponse,
    SchemeEligibilityInput,
    SchemeCalculationResult,
    MultiYearProjectionRequest,
    MultiYearProjectionResponse,
    FeasibilityEvaluateRequest,
    FeasibilityEvaluateResponse,
    ScenarioSimulateRequest,
    ScenarioComparisonSuiteResponse,
    MissingInfoEvaluateRequest,
    MissingInfoEvaluateResponse,
)
from app.services.finance_service import (
    calculate_finance_plan,
    calculate_financial_health,
    generate_finance_advice,
    calculate_multi_year_projection,
)
from app.services.feasibility_service import evaluate_business_feasibility
from app.services.scenario_service import run_scenario_comparison_suite
from app.services.checklist_service import evaluate_missing_information
from app.services.firestore_service import firestore_service
from app.services.logbook_service import logbook_service

router = APIRouter(prefix="/finance", tags=["Finance Engine"])

@router.post("/calculate", response_model=FinancePlanResponse)
def calculate_plan(req: FinanceCalculateRequest):
    """
    100% Deterministic Financial Calculation Endpoint.
    Calculates Project Cost, Loan Amount, Scheme, EMI, and Amortization.
    """
    return calculate_finance_plan(req.marginCapital)

@router.post("/multi-year", response_model=MultiYearProjectionResponse)
def multi_year_projections(req: MultiYearProjectionRequest):
    """
    Deterministic Multi-Year Financial Projection Engine (5 Years).
    Calculates annual P&L, reducing-balance debt service, depreciation, and DSCR.
    """
    return calculate_multi_year_projection(req)

@router.post("/feasibility", response_model=FeasibilityEvaluateResponse)
def assess_feasibility(req: FeasibilityEvaluateRequest):
    """
    Structured, explainable 5-dimension business feasibility scoring engine.
    """
    return evaluate_business_feasibility(req)

@router.post("/scenarios", response_model=ScenarioComparisonSuiteResponse)
def simulate_scenarios(req: ScenarioSimulateRequest):
    """
    Interactive Scenario Simulation & Risk Engine Integration:
    Runs Base, Conservative, and Optimistic cases with direct Risk invariant checks.
    """
    return run_scenario_comparison_suite(req)

@router.post("/checklist", response_model=MissingInfoEvaluateResponse)
def evaluate_checklist(req: MissingInfoEvaluateRequest):
    """
    Contextual missing information checklist evaluation.
    """
    return evaluate_missing_information(req)

@router.get("", response_model=FinancePlanResponse)
def get_user_finance(auth: AuthContext = Depends(get_auth_context)):
    profile_data = firestore_service.get_user_profile(auth.user_id) or {}
    margin_capital = float(profile_data.get("marginCapital", 100000.0))
    return calculate_finance_plan(margin_capital)

@router.get("/health-score", response_model=FinancialHealthResponse)
def get_health_score(
    totalIncome: Optional[float] = None,
    totalExpenses: Optional[float] = None,
    entryCount: Optional[int] = None,
    hasDownwardTrend: Optional[bool] = None,
    auth: AuthContext = Depends(get_auth_context)
):
    if totalIncome is not None and totalExpenses is not None:
        inc = float(totalIncome)
        exp = float(totalExpenses)
        count = int(entryCount) if entryCount is not None else 6
        downward = bool(hasDownwardTrend) if hasDownwardTrend is not None else (inc - exp < 15000 and inc > 0)
    else:
        entries = logbook_service.get_entries(auth.user_id)
        aggs = logbook_service.calculate_aggregates(entries)
        inc = aggs["totalIncome"]
        exp = aggs["totalExpenses"]
        count = len(entries)
        downward = aggs["netCashFlow"] < 15000 and aggs["totalIncome"] > 0

    return calculate_financial_health(
        total_income=inc,
        total_expenses=exp,
        entry_count=count,
        has_downward_trend=downward,
    )

@router.post("/advisor-chat", response_model=FinanceAdviceResponse)
def advisor_chat(req: FinanceAdviceRequest):
    """
    Interactive AI Finance Advisor:
    Combines verified deterministic loan mathematics with demographic-biased scheme ranking,
    working capital vs. capex split, seasonal moratorium guidance, and multi-turn conversational AI.
    """
    return generate_finance_advice(req)

@router.post("/schemes/calculate", response_model=List[SchemeCalculationResult])
def calculate_schemes_comparison(req: SchemeEligibilityInput):
    """
    Pure deterministic multi-scheme calculation engine:
    Evaluates MUDRA (Shishu/Kishore/Tarun), PM Vishwakarma, Stand-Up India, PMEGP, and NBCFDC.
    Calculates eligible loan, EMI, subsidy, margin, and collateral guarantee side by side.
    """
    from app.services.schemes_calculator import calculate_all_eligible_schemes
    return calculate_all_eligible_schemes(req)



