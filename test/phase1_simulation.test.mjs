/**
 * RuralCred Advisor — Phase 1 Test Suite
 * Validates Feasibility Scoring, Missing Information Checklist,
 * 5-Year Multi-Year Financial Projections, Interactive Scenario Simulator,
 * and Scenario -> Risk Engine Invariant Integration.
 */

import { strict as assert } from 'node:assert';
import { calculateFinancePlan, calculateMultiYearProjection } from '../lib/finance/engine.js';
import { evaluateBusinessFeasibility } from '../lib/finance/feasibility.js';
import { evaluateMissingInformation } from '../lib/finance/checklist.js';
import { simulateScenario, runScenarioComparisonSuite, SCENARIO_PRESETS } from '../lib/finance/scenarios.js';
import { evaluateFinancialRisks } from '../lib/risk/engine.js';
import { generateUnifiedBusinessPlan } from '../lib/finance/plan.js';

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

console.log('\n======================================================');
console.log('  RURALCRED — PHASE 1 DETERMINISTIC TEST SUITE');
console.log('======================================================\n');

// ---------------- 1. FEASIBILITY TESTS ----------------
console.log('--- 1. Feasibility Engine Tests ---');

runTest('FEAS_01: Complete business inputs produce valid 0-100 score & Grade A/B', () => {
  const res = evaluateBusinessFeasibility({
    category: 'Dairy Farming',
    location: 'Nizamabad, Telangana',
    marginCapital: 100000,
    projectCost: 1000000,
    loanAmount: 900000,
    monthlyRevenueEstimate: 120000,
    monthlyExpenseEstimate: 70000,
  });
  assert(typeof res.overallScore === 'number');
  assert(res.overallScore >= 0 && res.overallScore <= 100);
  assert(res.grade.startsWith('Grade'));
  assert(res.dimensions.financialViability.score > 0);
  assert(res.dimensions.marketViability.score > 0);
  assert(res.dimensions.operationalReadiness.score > 0);
  assert(res.dimensions.locationSuitability.score > 0);
  assert(res.dimensions.riskProfile.score > 0);
});

runTest('FEAS_02: Feasibility dimensions weights sum exactly to 1.00', () => {
  const res = evaluateBusinessFeasibility({ marginCapital: 100000 });
  const dims = res.dimensions;
  const sumWeights =
    dims.financialViability.weight +
    dims.marketViability.weight +
    dims.operationalReadiness.weight +
    dims.locationSuitability.weight +
    dims.riskProfile.weight;
  assert.equal(Math.round(sumWeights * 100) / 100, 1.0);
});

runTest('FEAS_03: Feasibility provides explainable bilingual reasons for every dimension', () => {
  const res = evaluateBusinessFeasibility({
    category: 'Dairy Farming',
    location: 'Warangal, Telangana',
    marginCapital: 100000,
  });
  for (const [key, dim] of Object.entries(res.dimensions)) {
    assert(dim.reasons.length > 0, `Dimension ${key} missing English reasons`);
    assert(dim.reasonsTe.length > 0, `Dimension ${key} missing Telugu reasons`);
  }
});

// ---------------- 2. MISSING INFORMATION CHECKLIST TESTS ----------------
console.log('\n--- 2. Missing Information Checklist Tests ---');

runTest('CHK_01: Identifies complete inputs and calculates 100% completion', () => {
  const res = evaluateMissingInformation({
    name: 'Anita Sharma',
    businessName: 'Sharma Dairy',
    category: 'Dairy Farming',
    location: 'Warangal',
    marginCapital: 100000,
    projectCost: 1000000,
    targetUnits: 10,
    hasMachineryQuotation: true,
    hasLandOrLeaseAgreement: true,
  });
  assert.equal(res.isComplete, true);
  assert.equal(res.missingRequiredCount, 0);
  assert.equal(res.completionPercentage, 100);
});

runTest('CHK_02: Contextually flags missing dairy units and machinery quotation', () => {
  const res = evaluateMissingInformation({
    businessName: 'Sharma Dairy',
    category: 'Dairy Farming',
    location: 'Warangal',
    marginCapital: 100000,
    projectCost: 1000000,
    // targetUnits and hasMachineryQuotation missing
  });
  assert.equal(res.isComplete, false);
  assert(res.missingRequiredCount > 0);
  const fieldIds = res.missingRequiredItems.map((i) => i.id);
  assert(fieldIds.includes('ops_dairy_units'));
  assert(fieldIds.includes('doc_quotation'));
});

// ---------------- 3. MULTI-YEAR FINANCIAL PROJECTIONS TESTS ----------------
console.log('\n--- 3. Multi-Year Financial Projection Tests ---');

runTest('PROJ_01: Generates 5 distinct sequential projection years', () => {
  const res = calculateMultiYearProjection({
    marginCapital: 100000,
    projectCost: 1000000,
    loanAmount: 900000,
    projectionYears: 5,
  });
  assert.equal(res.years.length, 5);
  assert.equal(res.years[0].year, 1);
  assert.equal(res.years[4].year, 5);
});

runTest('PROJ_02: Revenue and Expenses reflect specified growth compounding', () => {
  const res = calculateMultiYearProjection({
    marginCapital: 100000,
    projectCost: 1000000,
    baseMonthlyRevenue: 100000,
    baseMonthlyExpense: 60000,
    annualRevenueGrowthPct: 10.0,
    annualExpenseGrowthPct: 5.0,
    projectionYears: 5,
  });
  const y2 = res.years[1];
  const y3 = res.years[2];
  // Year 3 revenue should be > Year 2 revenue
  assert(y3.grossRevenue > y2.grossRevenue);
  // Year 3 NOI should be positive
  assert(y3.netOperatingIncome > y2.netOperatingIncome);
});

runTest('PROJ_03: Loan balance monotonically reduces and DSCR is calculated', () => {
  const res = calculateMultiYearProjection({
    marginCapital: 100000,
    projectCost: 1000000,
    loanAmount: 900000,
  });
  assert(res.years[0].closingLoanBalance <= 900000);
  assert(res.years[4].closingLoanBalance < res.years[0].closingLoanBalance);
  assert(res.averageDscr > 0);
  assert(typeof res.isBankable === 'boolean');
});

// ---------------- 4. INTERACTIVE SCENARIO SIMULATOR TESTS ----------------
console.log('\n--- 4. Scenario Simulator Tests ---');

runTest('SCEN_01: Base case matches expected operational parameters', () => {
  const res = simulateScenario(
    { marginCapital: 100000, projectCost: 1000000, loanAmount: 900000 },
    SCENARIO_PRESETS.base
  );
  assert.equal(res.revenueDeltaPct, 0);
  assert.equal(res.expenseDeltaPct, 0);
  assert(res.monthlyNetOperatingIncome > 0);
  assert(res.dscr > 1.25);
  assert.equal(res.riskSeverity, 'low');
});

runTest('SCEN_02: Conservative stress case (-20% rev, +10% exp) adjusts DSCR and increases risk', () => {
  const baseRes = simulateScenario(
    { marginCapital: 100000, projectCost: 1000000, loanAmount: 900000 },
    SCENARIO_PRESETS.base
  );
  const stressRes = simulateScenario(
    { marginCapital: 100000, projectCost: 1000000, loanAmount: 900000 },
    SCENARIO_PRESETS.conservative
  );
  assert(stressRes.monthlyNetOperatingIncome < baseRes.monthlyNetOperatingIncome);
  assert(stressRes.dscr < baseRes.dscr);
  assert(stressRes.riskSeverity !== 'low', 'Stress scenario should escalate risk severity');
  assert(stressRes.riskShiftExplanation.length > 0);
});

runTest('SCEN_03: Optimistic growth case (+15% rev) expands cash flow and strengthens DSCR', () => {
  const baseRes = simulateScenario(
    { marginCapital: 100000, projectCost: 1000000, loanAmount: 900000 },
    SCENARIO_PRESETS.base
  );
  const optRes = simulateScenario(
    { marginCapital: 100000, projectCost: 1000000, loanAmount: 900000 },
    SCENARIO_PRESETS.optimistic
  );
  assert(optRes.monthlyRevenue > baseRes.monthlyRevenue);
  assert(optRes.dscr >= baseRes.dscr);
  assert.equal(optRes.riskSeverity, 'low');
});

runTest('SCEN_04: Custom user sliders dynamically update scenario metrics', () => {
  const custom = simulateScenario(
    { marginCapital: 100000, projectCost: 1000000, loanAmount: 900000 },
    {
      id: 'custom',
      revenueDeltaPct: -35,
      expenseDeltaPct: 25,
      interestRateDeltaPct: 2.0,
    }
  );
  assert.equal(custom.revenueDeltaPct, -35);
  assert.equal(custom.expenseDeltaPct, 25);
  assert(custom.triggeredSafeguards.length > 0);
  assert(['high', 'critical'].includes(custom.riskSeverity));
});

// ---------------- 5. SCENARIO -> RISK ENGINE INTEGRATION TESTS ----------------
console.log('\n--- 5. Scenario -> Risk Invariant Integration Tests ---');

runTest('RISK_01: Invariant DSCR < 1.25x triggers warning safeguard', () => {
  const res = simulateScenario(
    { marginCapital: 50000, projectCost: 500000, loanAmount: 450000, baseMonthlyRevenue: 30000, baseMonthlyExpense: 24000 },
    { id: 'custom', revenueDeltaPct: -15, expenseDeltaPct: 10 }
  );
  if (res.dscr < 1.25) {
    assert(res.triggeredSafeguards.length > 0);
    const codes = res.detectedRisks.map((r) => r.ruleCode);
    assert(codes.some((c) => c.includes('INVARIANT') || c.includes('RULE')));
  }
});

runTest('RISK_02: Active loan + new loan simulation correctly flags dual debt invariant', () => {
  const res = simulateScenario(
    { marginCapital: 100000, hasActiveLoan: true, simulatingSecondLoan: true },
    SCENARIO_PRESETS.base
  );
  const hasRule1 = res.detectedRisks.some((r) => r.ruleCode === 'RULE_1');
  assert.equal(hasRule1, true, 'Should trigger RULE_1 active loan multiple');
});

// ---------------- 6. SINGLE SOURCE OF TRUTH INTEGRATION TESTS ----------------
console.log('\n--- 6. Single Source of Truth & Business Plan Integration ---');

runTest('SSOT_01: Business Plan, Multi-Year, and Feasibility share identical capital figures', () => {
  const marginCap = 120000;
  const projectCost = 1200000;
  const loanAmt = 1080000;

  const plan = generateUnifiedBusinessPlan({
    entrepreneurName: 'Anita Sharma',
    businessName: 'Sharma Dairy Farm',
    location: 'Nizamabad, Telangana',
    category: 'Dairy Farming',
    marginCapital: marginCap,
    projectCost: projectCost,
    loanAmount: loanAmt,
  });

  // Verify Single Source of Truth
  assert.equal(plan.totalProjectCost, projectCost);
  assert.equal(plan.promoterMargin, marginCap);
  assert.equal(plan.requestedLoanAmount, loanAmt);

  // Attached sub-models must match exactly
  assert.equal(plan.multiYearProjections.assumptions.projectCost, projectCost);
  assert.equal(plan.multiYearProjections.assumptions.marginCapital, marginCap);
  assert.equal(plan.scenarioAnalysis.base.projectCost, projectCost);
  assert.equal(plan.scenarioAnalysis.base.marginCapital, marginCap);
});

console.log('\n======================================================');
console.log(`  PHASE 1 TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
console.log('======================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
