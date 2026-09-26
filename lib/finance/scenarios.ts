/**
 * RuralCred Advisor — Interactive Business Scenario Simulator & Risk Integration Engine.
 * 
 * Capabilities:
 * 1. Simulates Base, Conservative, Optimistic, and Dynamic User-Adjusted Scenarios.
 * 2. Strict integration with existing Financial Engine (10/90 equity split, reducing-balance EMI).
 * 3. Direct pipeline feed into the existing Risk Engine (evaluating DSCR 1.25x, Working Capital 20%, Cost of Debt).
 * 4. Deterministic mathematical cause-and-effect explanations of risk shifts (zero LLM hallucination).
 */

import { DetectedRisk, evaluateFinancialRisks } from '@/lib/risk/engine';
import { calculateFinancePlan, SCHEMES, FinanceAnalysisResult } from './engine';

export type ScenarioType = 'base' | 'conservative' | 'optimistic' | 'custom';

export interface ScenarioPresetConfig {
  id: ScenarioType;
  name: string;
  nameTe: string;
  description: string;
  descriptionTe: string;
  revenueDeltaPct: number; // e.g. -20% or +15%
  expenseDeltaPct: number; // e.g. +10% or -5%
  interestRateDeltaPct?: number; // e.g. +1.0%
}

export const SCENARIO_PRESETS: Record<'base' | 'conservative' | 'optimistic', ScenarioPresetConfig> = {
  base: {
    id: 'base',
    name: 'Base Case (Expected)',
    nameTe: 'సాధారణ ప్రణాళిక (బేస్ కేస్)',
    description: 'Expected operational performance under normal market and climate conditions.',
    descriptionTe: 'సాధారణ మార్కెట్ పరిస్థితులలో ఆశించిన పనితీరు.',
    revenueDeltaPct: 0,
    expenseDeltaPct: 0,
    interestRateDeltaPct: 0,
  },
  conservative: {
    id: 'conservative',
    name: 'Conservative Case (Stress Test)',
    nameTe: 'సంక్షోభ పరీక్ష (కన్జర్వేటివ్ కేస్)',
    description: 'Adverse stress shock: 20% drop in sales volume/price, 10% rise in feed/raw material costs.',
    descriptionTe: 'అమ్మకాలలో 20% తగ్గుదల మరియు ముడిసరుకు ఖర్చులలో 10% పెరుగుదల వంటి ప్రతికూల పరిస్థితులు.',
    revenueDeltaPct: -20,
    expenseDeltaPct: 10,
    interestRateDeltaPct: 1.0,
  },
  optimistic: {
    id: 'optimistic',
    name: 'Optimistic Case (High Growth)',
    nameTe: 'అభివృద్ధి ప్రణాళిక (ఆప్టిమిస్టిక్ కేస్)',
    description: 'Favorable peak performance: 15% increase in demand off-take and 5% bulk procurement savings.',
    descriptionTe: 'అధిక గిరాకీ (15% పెరుగుదల) మరియు ఖర్చుల ఆదా (5%) తో కూడిన వృద్ధి ప్రణాళిక.',
    revenueDeltaPct: 15,
    expenseDeltaPct: -5,
    interestRateDeltaPct: 0,
  },
};

export interface ScenarioBaseParams {
  marginCapital: number;
  projectCost?: number;
  loanAmount?: number;
  baseMonthlyRevenue?: number;
  baseMonthlyExpense?: number;
  interestRateAnnual?: number;
  tenureYears?: number;
  hasActiveLoan?: boolean;
  simulatingSecondLoan?: boolean;
}

export interface ScenarioSimulationResult {
  scenarioId: ScenarioType;
  name: string;
  nameTe: string;
  description: string;
  descriptionTe: string;
  revenueDeltaPct: number;
  expenseDeltaPct: number;
  interestRateAnnual: number;
  projectCost: number;
  marginCapital: number;
  loanAmount: number;

  // Monthly & Annual Cash Flow
  monthlyRevenue: number;
  monthlyExpense: number;
  monthlyNetOperatingIncome: number;
  annualRevenue: number;
  annualExpense: number;
  annualNetOperatingIncome: number;

  // Debt servicing
  quarterlyEmi: number;
  annualDebtService: number;
  netAnnualCashFlow: number;

  // Key Ratios
  dscr: number;
  isDscrHealthy: boolean; // >= 1.25
  operatingMarginPct: number;
  breakEvenMonthlyRevenue: number;

  // Risk Engine Output
  detectedRisks: DetectedRisk[];
  riskSeverity: 'low' | 'moderate' | 'high' | 'critical';
  riskSeverityTe: string;
  riskShiftExplanation: string;
  riskShiftExplanationTe: string;
  triggeredSafeguards: string[];
  triggeredSafeguardsTe: string[];
}

export interface ScenarioSuiteComparison {
  base: ScenarioSimulationResult;
  conservative: ScenarioSimulationResult;
  optimistic: ScenarioSimulationResult;
  custom?: ScenarioSimulationResult;
  resilienceRating: 'High Resilience' | 'Moderate Resilience' | 'Vulnerable to Shocks';
  resilienceRatingTe: string;
  executiveSummary: string;
  executiveSummaryTe: string;
  recommendations: string[];
  recommendationsTe: string[];
}

/**
 * Simulates a single scenario using the existing Financial and Risk Engines.
 */
export function simulateScenario(
  base: ScenarioBaseParams,
  config: {
    id: ScenarioType;
    name?: string;
    nameTe?: string;
    description?: string;
    descriptionTe?: string;
    revenueDeltaPct: number;
    expenseDeltaPct: number;
    interestRateDeltaPct?: number;
    customProjectCost?: number;
    customLoanAmount?: number;
    customInterestRateAnnual?: number;
  }
): ScenarioSimulationResult {
  const marginCapital = Math.max(1000, base.marginCapital ?? 100000);
  const projectCost = config.customProjectCost ?? (base.projectCost ?? Math.round(marginCapital / 0.10));
  const loanAmount = config.customLoanAmount ?? (base.loanAmount ?? Math.round(projectCost * 0.90));

  // Determine standard baseline monthly revenue & expenses
  const defaultMonthlyRev = Math.max(25000, Math.round(projectCost * 0.12));
  const defaultMonthlyExp = Math.max(15000, Math.round(defaultMonthlyRev * 0.65));

  const nominalRev = base.baseMonthlyRevenue ?? defaultMonthlyRev;
  const nominalExp = base.baseMonthlyExpense ?? defaultMonthlyExp;

  // Apply scenario deltas
  const revMultiplier = Math.max(0.2, 1 + config.revenueDeltaPct / 100);
  const expMultiplier = Math.max(0.3, 1 + config.expenseDeltaPct / 100);

  const monthlyRevenue = Math.round(nominalRev * revMultiplier);
  const monthlyExpense = Math.round(nominalExp * expMultiplier);
  const monthlyNetOperatingIncome = monthlyRevenue - monthlyExpense;

  const annualRevenue = monthlyRevenue * 12;
  const annualExpense = monthlyExpense * 12;
  const annualNetOperatingIncome = monthlyNetOperatingIncome * 12;

  // Loan Scheme and Amortization calculation
  const scheme = projectCost <= 140000 ? SCHEMES['micro-finance'] : SCHEMES['term-loan'];
  const baseRate = config.customInterestRateAnnual ?? (base.interestRateAnnual ?? scheme.interestRateAnnual);
  const interestRateAnnual = Math.max(1, baseRate + (config.interestRateDeltaPct ?? 0));
  const tenureYears = base.tenureYears ?? scheme.tenureYears;

  // Quarterly reducing balance EMI formula
  const annualRate = interestRateAnnual / 100;
  const quarterlyRate = annualRate / 4;
  const totalQuarters = tenureYears * 4;
  const moratoriumQuarters = Math.round(scheme.moratoriumMonths / 3);
  const repaymentQuarters = Math.max(1, totalQuarters - moratoriumQuarters);

  const p = loanAmount;
  const r = quarterlyRate;
  const n = repaymentQuarters;

  let quarterlyEmi = 0;
  if (r > 0 && n > 0) {
    const compoundFactor = Math.pow(1 + r, n);
    quarterlyEmi = Math.round((p * r * compoundFactor) / (compoundFactor - 1));
  } else {
    quarterlyEmi = Math.round(p / n);
  }

  const annualDebtService = quarterlyEmi * 4;
  const netAnnualCashFlow = annualNetOperatingIncome - annualDebtService;

  // DSCR calculation
  let dscr = 2.5;
  if (annualDebtService > 0) {
    dscr = Math.round((annualNetOperatingIncome / annualDebtService) * 100) / 100;
  }
  const isDscrHealthy = dscr >= 1.25;

  const operatingMarginPct = Math.round((monthlyNetOperatingIncome / Math.max(1, monthlyRevenue)) * 100);
  const monthlyFixedCost = Math.round(quarterlyEmi / 3) + Math.round(monthlyExpense * 0.40);
  const contributionMargin = Math.max(0.1, 1 - (monthlyExpense * 0.60) / Math.max(1, monthlyRevenue));
  const breakEvenMonthlyRevenue = Math.round(monthlyFixedCost / contributionMargin);

  // Direct integration with existing Risk Engine
  const detectedRisks = evaluateFinancialRisks({
    hasActiveLoan: base.hasActiveLoan ?? false,
    simulatingSecondLoan: base.simulatingSecondLoan ?? false,
    totalIncome: monthlyRevenue,
    totalExpenses: monthlyExpense,
    netCashFlow: monthlyNetOperatingIncome,
    previousNetCashFlow: nominalRev - nominalExp,
  });

  // Additional Invariant DSCR check
  const triggeredSafeguards: string[] = [];
  const triggeredSafeguardsTe: string[] = [];

  if (dscr < 1.0) {
    triggeredSafeguards.push(`Critical DSCR Deficit (${dscr.toFixed(2)}x < 1.00x): Enterprise operating income cannot cover mandatory bank EMI.`);
    triggeredSafeguardsTe.push(`తీవ్రమైన రుణ చెల్లింపు లోటు (${dscr.toFixed(2)}x < 1.00x): రాబడి బ్యాంక్ రుణ వాయిదాలకు సరిపోదు.`);
    detectedRisks.push({
      riskType: 'negative_cash_flow',
      severity: 'alert',
      ruleCode: 'INVARIANT_DSCR_CRITICAL',
      title: 'Severe Debt Servicing Inability (DSCR < 1.00x)',
      titleTe: 'రుణ చెల్లింపు అసమర్థత (DSCR < 1.00x)',
      reason: `Projected annual operating income of ₹${annualNetOperatingIncome.toLocaleString('en-IN')} is insufficient to meet annual debt obligation of ₹${annualDebtService.toLocaleString('en-IN')}.`,
      reasonTe: `వార్షిక నిర్వహణ లాభం ₹${annualNetOperatingIncome.toLocaleString('en-IN')}, వార్షిక రుణ చెల్లింపు ₹${annualDebtService.toLocaleString('en-IN')} కంటే తక్కువగా ఉంది.`,
      metrics: { dscr, annualNetOperatingIncome, annualDebtService },
    });
  } else if (dscr < 1.25) {
    triggeredSafeguards.push(`DSCR Below Safe Threshold (${dscr.toFixed(2)}x < 1.25x): Limited safety cushion for unexpected cost spikes.`);
    triggeredSafeguardsTe.push(`DSCR భద్రతా ప్రమాణం కంటే తక్కువ (${dscr.toFixed(2)}x < 1.25x): అత్యవసర ఖర్చులకు నగదు రక్షణ తక్కువగా ఉంది.`);
    detectedRisks.push({
      riskType: 'downward_profit_trend',
      severity: 'warning',
      ruleCode: 'INVARIANT_DSCR_BORDERLINE',
      title: 'Marginal Debt Coverage (DSCR < 1.25x)',
      titleTe: 'పరిమిత రుణ రక్షణ (DSCR < 1.25x)',
      reason: `DSCR of ${dscr.toFixed(2)}x falls below the recommended 1.25x statutory benchmark for MSME priority sector loans.`,
      reasonTe: `DSCR ${dscr.toFixed(2)}x బ్యాంకింగ్ నిబంధన 1.25x కంటే తక్కువగా ఉంది.`,
      metrics: { dscr },
    });
  }

  // Determine aggregate risk severity
  const alertCount = detectedRisks.filter((r) => r.severity === 'alert').length;
  const warningCount = detectedRisks.filter((r) => r.severity === 'warning').length;

  let riskSeverity: ScenarioSimulationResult['riskSeverity'] = 'low';
  let riskSeverityTe = 'తక్కువ రిస్క్ (Low)';

  if (alertCount >= 2 || dscr < 1.0 || netAnnualCashFlow < 0) {
    riskSeverity = 'critical';
    riskSeverityTe = 'తీవ్రమైన రిస్క్ (Critical)';
  } else if (alertCount === 1 || dscr < 1.25) {
    riskSeverity = 'high';
    riskSeverityTe = 'అధిక రిస్క్ (High)';
  } else if (warningCount >= 1) {
    riskSeverity = 'moderate';
    riskSeverityTe = 'మధ్యస్థ రిస్క్ (Moderate)';
  }

  // Cause-and-effect Risk Shift Explanation
  let riskShiftExplanation = '';
  let riskShiftExplanationTe = '';

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

  return {
    scenarioId: config.id,
    name: config.name || SCENARIO_PRESETS[config.id as keyof typeof SCENARIO_PRESETS]?.name || 'Custom Scenario',
    nameTe: config.nameTe || SCENARIO_PRESETS[config.id as keyof typeof SCENARIO_PRESETS]?.nameTe || 'కస్టమ్ ప్రణాళిక',
    description: config.description || '',
    descriptionTe: config.descriptionTe || '',
    revenueDeltaPct: config.revenueDeltaPct,
    expenseDeltaPct: config.expenseDeltaPct,
    interestRateAnnual,
    projectCost,
    marginCapital,
    loanAmount,
    monthlyRevenue,
    monthlyExpense,
    monthlyNetOperatingIncome,
    annualRevenue,
    annualExpense,
    annualNetOperatingIncome,
    quarterlyEmi,
    annualDebtService,
    netAnnualCashFlow,
    dscr,
    isDscrHealthy,
    operatingMarginPct,
    breakEvenMonthlyRevenue,
    detectedRisks,
    riskSeverity,
    riskSeverityTe,
    riskShiftExplanation,
    riskShiftExplanationTe,
    triggeredSafeguards,
    triggeredSafeguardsTe,
  };
}

/**
 * Runs the full 3-scenario (Base, Conservative, Optimistic) suite plus optional Custom scenario.
 */
export function runScenarioComparisonSuite(
  base: ScenarioBaseParams,
  customConfig?: {
    revenueDeltaPct: number;
    expenseDeltaPct: number;
    interestRateDeltaPct?: number;
    customProjectCost?: number;
    customLoanAmount?: number;
    customInterestRateAnnual?: number;
  }
): ScenarioSuiteComparison {
  const baseRes = simulateScenario(base, SCENARIO_PRESETS.base);
  const conservativeRes = simulateScenario(base, SCENARIO_PRESETS.conservative);
  const optimisticRes = simulateScenario(base, SCENARIO_PRESETS.optimistic);

  let customRes: ScenarioSimulationResult | undefined = undefined;
  if (customConfig) {
    customRes = simulateScenario(base, {
      id: 'custom',
      name: 'Custom User Scenario',
      nameTe: 'వినియోగదారు కస్టమ్ ప్రణాళిక',
      description: 'Interactive user-tuned parameters.',
      descriptionTe: 'వినియోగదారు సర్దుబాటు చేసిన పారామితులు.',
      revenueDeltaPct: customConfig.revenueDeltaPct,
      expenseDeltaPct: customConfig.expenseDeltaPct,
      interestRateDeltaPct: customConfig.interestRateDeltaPct,
      customProjectCost: customConfig.customProjectCost,
      customLoanAmount: customConfig.customLoanAmount,
      customInterestRateAnnual: customConfig.customInterestRateAnnual,
    });
  }

  // Resilience Rating
  let resilienceRating: ScenarioSuiteComparison['resilienceRating'] = 'High Resilience';
  let resilienceRatingTe = 'అధిక సంక్షోభ నిరోధకత (High Resilience)';

  if (conservativeRes.dscr < 1.0 || conservativeRes.netAnnualCashFlow < 0) {
    resilienceRating = 'Vulnerable to Shocks';
    resilienceRatingTe = 'సంక్షోభాలకు లోనయ్యే అవకాశం (Vulnerable)';
  } else if (conservativeRes.dscr < 1.25) {
    resilienceRating = 'Moderate Resilience';
    resilienceRatingTe = 'మధ్యస్థ నిరోధకత (Moderate Resilience)';
  }

  const executiveSummary = `Business maintains positive annual cash flow (₹${baseRes.netAnnualCashFlow.toLocaleString('en-IN')}) with DSCR of ${baseRes.dscr.toFixed(2)}x under base assumptions. In conservative stress tests (-20% revenue), DSCR adjusts to ${conservativeRes.dscr.toFixed(2)}x with annual cash flow of ₹${conservativeRes.netAnnualCashFlow.toLocaleString('en-IN')}.`;
  const executiveSummaryTe = `సాధారణ స్థితిలో వ్యాపారం వార్షిక నికర నగదు ప్రవాహం ₹${baseRes.netAnnualCashFlow.toLocaleString('en-IN')} మరియు DSCR ${baseRes.dscr.toFixed(2)}x తో స్థిరంగా ఉంది. సంక్షోభ పరిస్థితులలో (-20% రాబడి), DSCR ${conservativeRes.dscr.toFixed(2)}x గా మరియు వార్షిక నగదు ప్రవాహం ₹${conservativeRes.netAnnualCashFlow.toLocaleString('en-IN')} గా ఉంటుంది.`;

  const recommendations = [
    `Stress test shows minimum break-even revenue of ₹${conservativeRes.breakEvenMonthlyRevenue.toLocaleString('en-IN')}/month must be maintained.`,
    `Maintain 20% working capital buffer to prevent cash deficits during agricultural off-seasons.`,
    `In case of demand drop, prioritize debt servicing (₹${baseRes.quarterlyEmi.toLocaleString('en-IN')}/quarter) to protect credit standing.`,
  ];

  const recommendationsTe = [
    `సంక్షోభ సమయంలో కూడా నెలకు కనీసం ₹${conservativeRes.breakEvenMonthlyRevenue.toLocaleString('en-IN')} అమ్మకాలు ఉండేలా చూసుకోండి.`,
    `ఆఫ్-సీజన్ లో నగదు కొరత రాకుండా 20% వర్కింగ్ క్యాపిటల్ రిజర్వ్ నిల్వ ఉంచండి.`,
    `అమ్మకాలు తగ్గినా క్రెడిట్ స్కోరు దెబ్బతినకుండా త్రైమాసిక వాయిదా (₹${baseRes.quarterlyEmi.toLocaleString('en-IN')}) ను సకాలంలో చెల్లించండి.`,
  ];

  return {
    base: baseRes,
    conservative: conservativeRes,
    optimistic: optimisticRes,
    custom: customRes,
    resilienceRating,
    resilienceRatingTe,
    executiveSummary,
    executiveSummaryTe,
    recommendations,
    recommendationsTe,
  };
}
