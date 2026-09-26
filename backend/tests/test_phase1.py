import pytest
from app.models.schemas import (
    MultiYearProjectionRequest,
    FeasibilityEvaluateRequest,
    MissingInfoEvaluateRequest,
    ScenarioSimulateRequest,
)
from app.services.finance_service import calculate_multi_year_projection
from app.services.feasibility_service import evaluate_business_feasibility
from app.services.checklist_service import evaluate_missing_information
from app.services.scenario_service import simulate_scenario, run_scenario_comparison_suite

def test_multi_year_projection_5_years():
    req = MultiYearProjectionRequest(
        marginCapital=100000.0,
        projectCost=1000000.0,
        loanAmount=900000.0,
        projectionYears=5,
    )
    res = calculate_multi_year_projection(req)
    assert len(res.years) == 5
    assert res.years[0].year == 1
    assert res.years[4].year == 5
    assert res.averageDscr > 0
    assert res.totalFiveYearNetCashFlow > 0
    assert res.years[4].closingLoanBalance < res.years[0].closingLoanBalance

def test_multi_year_projection_growth():
    req = MultiYearProjectionRequest(
        marginCapital=100000.0,
        projectCost=1000000.0,
        baseMonthlyRevenue=100000.0,
        baseMonthlyExpense=60000.0,
        annualRevenueGrowthPct=10.0,
        annualExpenseGrowthPct=5.0,
        projectionYears=5,
    )
    res = calculate_multi_year_projection(req)
    y2 = res.years[1]
    y3 = res.years[2]
    assert y3.grossRevenue > y2.grossRevenue
    assert y3.netOperatingIncome > y2.netOperatingIncome

def test_feasibility_scoring_dimensions():
    req = FeasibilityEvaluateRequest(
        category="Dairy Farming",
        location="Warangal, Telangana",
        marginCapital=100000.0,
        projectCost=1000000.0,
        loanAmount=900000.0,
    )
    res = evaluate_business_feasibility(req)
    assert 0 <= res.overallScore <= 100
    assert res.grade.startswith("Grade")
    assert "financialViability" in res.dimensions
    assert "marketViability" in res.dimensions
    assert "operationalReadiness" in res.dimensions
    assert "locationSuitability" in res.dimensions
    assert "riskProfile" in res.dimensions
    
    total_w = sum(d.weight for d in res.dimensions.values())
    assert round(total_w, 2) == 1.0

def test_missing_info_checklist():
    req_complete = MissingInfoEvaluateRequest(
        name="Anita",
        businessName="Sharma Dairy",
        category="Dairy Farming",
        location="Warangal",
        marginCapital=100000.0,
        projectCost=1000000.0,
        targetUnits=10.0,
        hasMachineryQuotation=True,
    )
    res = evaluate_missing_information(req_complete)
    assert res.isComplete is True
    assert res.missingRequiredCount == 0

    req_incomplete = MissingInfoEvaluateRequest(
        businessName="Sharma Dairy",
        category="Dairy Farming",
    )
    res_inc = evaluate_missing_information(req_incomplete)
    assert res_inc.isComplete is False
    assert res_inc.missingRequiredCount > 0

def test_scenario_simulation_suite():
    req = ScenarioSimulateRequest(
        marginCapital=100000.0,
        projectCost=1000000.0,
        loanAmount=900000.0,
    )
    suite = run_scenario_comparison_suite(req)
    assert suite.base.revenueDeltaPct == 0.0
    assert suite.conservative.revenueDeltaPct == -20.0
    assert suite.optimistic.revenueDeltaPct == 15.0

    # Stress case must reduce NOI and DSCR
    assert suite.conservative.monthlyNetOperatingIncome < suite.base.monthlyNetOperatingIncome
    assert suite.conservative.dscr < suite.base.dscr
    assert suite.conservative.riskSeverity != "low"

def test_scenario_risk_integration_safeguard():
    # Simulate severe shock
    base = ScenarioSimulateRequest(
        marginCapital=50000.0,
        projectCost=500000.0,
        loanAmount=450000.0,
        baseMonthlyRevenue=25000.0,
        baseMonthlyExpense=22000.0,
    )
    custom = simulate_scenario(
        base=base,
        scenario_id="custom",
        name="Custom Shock",
        name_te="కస్టమ్",
        description="Shock",
        description_te="షాక్",
        rev_delta=-30.0,
        exp_delta=20.0,
    )
    assert custom.riskSeverity in ["high", "critical"]
    assert custom.dscr < 1.25
    assert len(custom.triggeredSafeguards) > 0
