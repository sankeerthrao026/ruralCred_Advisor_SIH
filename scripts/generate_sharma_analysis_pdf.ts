import * as fs from 'node:fs';
import * as path from 'node:path';
import { generateBusinessAnalysisPdfDoc, BusinessAnalysisReportData } from '../lib/export/business-analysis-pdf';
import { evaluateBusinessFeasibility } from '../lib/finance/feasibility';
import { runScenarioComparisonSuite } from '../lib/finance/scenarios';
import { calculateMultiYearProjection } from '../lib/finance/engine';
import { evaluateMissingInformation } from '../lib/finance/checklist';

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
    strengths: ['Promoter has 6 years animal husbandry experience', 'Direct consumer distribution without middlemen'],
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
  sourcesUsed: ['APMC Mandi Price Indices (Warangal)', 'NBCFDC Rural Enterprise Benchmarks', 'ChromaDB Vector Store'],
  providerUsed: 'Google Gemini 2.5 Flash / NVIDIA NIM',
};

const payload: BusinessAnalysisReportData = {
  ...testProfile,
  advisorOutput: sampleAdvisorOutput,
  season: 'Year-Round Baseline',
  feasibility,
  scenarios,
  multiYearProjections,
  missingInformation,
  language: 'en',
};

const doc = generateBusinessAnalysisPdfDoc(payload);
const pdfBytes = doc.output('arraybuffer');
const outputPath = path.join(process.cwd(), 'Business_Analysis_Sharma_Dairy_Farm.pdf');
fs.writeFileSync(outputPath, Buffer.from(pdfBytes));

console.log(`Successfully generated: ${outputPath} (${pdfBytes.byteLength} bytes, ${doc.getNumberOfPages()} pages)`);
