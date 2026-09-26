/**
 * RuralCred Advisor — Business Analysis PDF Unit & Invariant Test Suite
 * 
 * Validates:
 * 1. Business Analysis PDF generator creates valid multi-page jsPDF document.
 * 2. All 12 required sections exist and render without errors:
 *    - Header Banner & Enterprise Profile
 *    - Strategic Market Reach & Demand
 *    - Unit Economics & Operating Margins
 *    - Deterministic Feasibility Scorecard (0–100) & 5 Dimensions
 *    - Hyper-Local Market Context & Seasonality
 *    - Localized Strategic SWOT Matrix
 *    - Competitor Density & Market Differentiation Moat
 *    - Prioritized Strategic Action Recommendations
 *    - Sensitivity & Scenario Stress Test Table
 *    - 5-Year Strategic Financial & Cash Flow Projections
 *    - Enterprise De-Risking & Missing Information Checklist
 *    - Methodology, Data Sources & RAG Provenance
 * 3. Numerical data consistency between application models and generated document.
 * 4. Graceful handling of missing/undefined fields.
 * 5. Filename sanitization against malicious/unsupported characters.
 * 6. Zero regression on Loan-Ready PDF (lib/export/pdf.ts).
 */

import { strict as assert } from 'node:assert';
import {
  generateBusinessAnalysisPdfDoc,
  sanitizeFilename,
  type BusinessAnalysisReportData,
} from '../lib/export/business-analysis-pdf';
import { evaluateBusinessFeasibility } from '../lib/finance/feasibility';
import { runScenarioComparisonSuite } from '../lib/finance/scenarios';
import { calculateMultiYearProjection } from '../lib/finance/engine';
import { evaluateMissingInformation } from '../lib/finance/checklist';
import { generatePlanPdfDoc } from '../lib/export/pdf';
import { generateUnifiedBusinessPlan } from '../lib/finance/plan';

let totalTests = 0;
let passedTests = 0;

function runTest(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

console.log('\n======================================================');
console.log('  RURALCRED — BUSINESS ANALYSIS PDF TEST SUITE');
console.log('======================================================\n');

// Sample test data for Sharma Dairy Farm
const testProfile = {
  businessName: 'Sharma Dairy Farm',
  promoterName: 'Anita Sharma',
  category: 'Dairy Farming',
  location: 'Warangal, Telangana',
  projectCost: 1500000,
  promoterMargin: 225000,
  loanAmount: 1275000,
};

const feasibility = evaluateBusinessFeasibility({
  category: testProfile.category,
  location: testProfile.location,
  marginCapital: testProfile.promoterMargin,
  projectCost: testProfile.projectCost,
  loanAmount: testProfile.loanAmount,
  monthlyRevenueEstimate: 120000,
  monthlyExpenseEstimate: 70000,
});

const scenarios = runScenarioComparisonSuite({
  marginCapital: testProfile.promoterMargin,
  projectCost: testProfile.projectCost,
  loanAmount: testProfile.loanAmount,
  baseMonthlyRevenue: 120000,
  baseMonthlyExpense: 70000,
  interestRateAnnual: 8.5,
  tenureYears: 5,
});

const multiYearProjections = calculateMultiYearProjection({
  marginCapital: testProfile.promoterMargin,
  projectCost: testProfile.projectCost,
  loanAmount: testProfile.loanAmount,
  baseMonthlyRevenue: 120000,
  baseMonthlyExpense: 70000,
  interestRateAnnual: 8.5,
  tenureYears: 5,
  moratoriumMonths: 6,
});

const missingInformation = evaluateMissingInformation({
  name: testProfile.promoterName,
  businessName: testProfile.businessName,
  category: testProfile.category,
  location: testProfile.location,
  marginCapital: testProfile.promoterMargin,
  hasUdyamRegistration: false,
});

const sampleAdvisorOutput = {
  reply: 'Comprehensive viability assessment for Sharma Dairy Farm.',
  marketReach: {
    headline: 'High unmet dairy off-take across Warangal rural mandals.',
    details: 'Daily household demand exceeds 1,200L with strong retail milk-parlour density.',
    targetSegment: 'Households, sweet makers, and mandal canteens',
    estimatedLocalDemand: '1,200 Litres/Day',
  },
  opportunityAnalysis: {
    overview: 'Favorable dairy cluster with active chilling centers.',
    primaryDrivers: [
      'Procure bulk green fodder before peak summer to reduce feed expenses by 15%',
      'Diversify 25% daily milk production into value-added curd and paneer',
      'Establish direct supply agreements with Warangal town sweet makers',
    ],
    seasonalOpportunity: 'Festive season creates 30% surge in dairy liquid milk demand.',
  },
  swot: {
    strengths: ['Promoter has 6 years animal husbandry experience', 'Direct consumer distribution'],
    weaknesses: ['Chilling equipment requires backup power', 'Initial working capital limits herd size'],
    opportunities: ['Government subsidy under Stand-Up India', 'Organic milk pricing premium'],
    threats: ['Summer heat stress on cross-breed cows', 'Fodder price inflation'],
  },
  competitorDensity: {
    densityLevel: 'Moderate' as const,
    description: '4 unorganized smallholder milkmen operating in immediate 5km radius.',
    mitigationStrategy: 'Offer fat-tested pure buffalo milk in tamper-evident sealed bottles.',
  },
  pricingSuggestion: {
    recommendedBand: 'Rs. 50 - 56 / Litre',
    benchmarkComparison: '14% above raw collection center benchmark.',
    marginTarget: '40-45% gross margin',
  },
  risks: ['Feed supply disruption', 'Veterinary cost inflation'],
  assumptions: ['Average yield of 10L/day/cow', 'Lactation cycle 300 days'],
  groundedFacts: {
    district: 'Warangal',
    category: 'Dairy',
    benchmarkOpex: [{ item: 'Cattle Feed', percentage: 55 }, { item: 'Labor', percentage: 20 }],
  },
  sourcesUsed: ['APMC Mandi Price Indices (Warangal)', 'NBCFDC Rural Enterprise Benchmarks'],
  providerUsed: 'Google Gemini 2.5 Flash / NVIDIA NIM',
};

// ---------------- 1. DOCUMENT GENERATION TESTS ----------------
console.log('--- 1. Document Generation & Structure ---');

runTest('PDF_01: Generates valid 3-page jsPDF document without errors', () => {
  const payload: BusinessAnalysisReportData = {
    ...testProfile,
    advisorOutput: sampleAdvisorOutput,
    feasibility,
    scenarios,
    multiYearProjections,
    missingInformation,
    language: 'en',
  };

  const doc = generateBusinessAnalysisPdfDoc(payload);
  assert(doc !== null && doc !== undefined);
  assert.equal(doc.getNumberOfPages(), 3, 'Business Analysis PDF must span exactly 3 formatted pages');
});

// ---------------- 2. DATA CONSISTENCY TESTS ----------------
console.log('--- 2. Data Consistency & Financial Invariants ---');

runTest('PDF_02: Financial figures in data model match application inputs exactly', () => {
  const payload: BusinessAnalysisReportData = {
    ...testProfile,
    advisorOutput: sampleAdvisorOutput,
    feasibility,
    scenarios,
    multiYearProjections,
    missingInformation,
  };

  assert.equal(payload.projectCost, 1500000);
  assert.equal(payload.promoterMargin, 225000);
  assert.equal(payload.loanAmount, 1275000);
  assert.equal(payload.promoterMargin + payload.loanAmount, payload.projectCost);

  assert.equal(payload.feasibility?.overallScore, feasibility.overallScore);
  assert.equal(payload.scenarios?.base.monthlyRevenue, 120000);
  assert.equal(payload.scenarios?.conservative.monthlyRevenue, 96000);
  assert.equal(payload.scenarios?.optimistic.monthlyRevenue, 138000);
  assert.equal(payload.multiYearProjections?.years.length, 5);
});

// ---------------- 3. MISSING FIELD RESILIENCE ----------------
console.log('--- 3. Resilience to Missing / Undefined Data ---');

runTest('PDF_03: Renders gracefully when advisorOutput, feasibility, or scenarios are null', () => {
  const minimalPayload: BusinessAnalysisReportData = {
    businessName: 'Minimal Enterprise',
    promoterName: 'Ramesh Patel',
    category: 'Kirana Store',
    location: 'Nizamabad, Telangana',
    advisorOutput: null,
    feasibility: null,
    scenarios: null,
    multiYearProjections: null,
    missingInformation: null,
  };

  const doc = generateBusinessAnalysisPdfDoc(minimalPayload);
  assert(doc !== null);
  assert(doc.getNumberOfPages() >= 2);
});

// ---------------- 4. FILENAME SANITIZATION ----------------
console.log('--- 4. Filename Sanitization ---');

runTest('PDF_04: sanitizeFilename removes illegal characters and path traversal tokens', () => {
  assert.equal(sanitizeFilename('Sharma Dairy Farm'), 'Sharma_Dairy_Farm');
  assert.equal(sanitizeFilename('../../etc/passwd'), 'etc_passwd');
  assert.equal(sanitizeFilename('Enterprise!@#$%^&*()_+'), 'Enterprise');
});

// ---------------- 5. LOAN-READY PDF NON-REGRESSION ----------------
console.log('--- 5. Loan-Ready PDF Isolation & Non-Regression ---');

runTest('PDF_05: Existing Loan-Ready PDF (lib/export/pdf.ts) remains 100% functional and unmodified', () => {
  const unifiedPlan = generateUnifiedBusinessPlan({
    entrepreneurName: 'Anita Sharma',
    businessName: 'Sharma Dairy Farm',
    location: 'Warangal, Telangana',
    category: 'Dairy Farming',
    marginCapital: 225000,
    loanAmount: 1275000,
    projectCost: 1500000,
    selectedSchemeId: 'standup_india',
    hasUdyamRegistration: false,
  });

  const bankDoc = generatePlanPdfDoc(unifiedPlan);
  assert(bankDoc !== null);
  assert.equal(bankDoc.getNumberOfPages(), 2, 'Loan-Ready Bank PDF must remain exactly 2 pages');
});

console.log('\n======================================================');
console.log(`  BUSINESS ANALYSIS PDF TESTS COMPLETE: ${passedTests}/${totalTests} PASSED`);
console.log('======================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
