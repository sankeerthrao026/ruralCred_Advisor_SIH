/**
 * RuralCred Advisor — Deterministic & Transparent Business Feasibility Engine.
 * 
 * Strict Multi-Dimensional Feasibility Formulation:
 * 1. Financial Viability (30% weight) — Margin %, DSCR, Debt Burden
 * 2. Market Viability (25% weight) — Local Demand, Competitor Density, Pricing Moat
 * 3. Operational Readiness (20% weight) — Resource availability, Capacity alignment, Gestation reserve
 * 4. Location Suitability (15% weight) — Grounded District/Cluster fit, Mandi access
 * 5. Risk Profile (10% weight) — Deterministic Invariant Safeguards
 * 
 * Generates an explainable 0–100 score + Grade (A/B/C/D) + Positive/Negative Driver Reasons.
 * Zero Black-Box, Zero Randomness.
 */

import { DetectedRisk, evaluateFinancialRisks } from '@/lib/risk/engine';
import { calculateFinancePlan, SCHEMES } from './engine';

export type FeasibilityGrade =
  | 'Grade A (Highly Feasible)'
  | 'Grade B (Conditionally Feasible)'
  | 'Grade C (Marginal / High Risk)'
  | 'Grade D (Unviable / Insufficient Capital)';

export type DimensionKey =
  | 'financialViability'
  | 'marketViability'
  | 'operationalReadiness'
  | 'locationSuitability'
  | 'riskProfile';

export interface FeasibilityDimensionScore {
  key: DimensionKey;
  label: string;
  labelTe: string;
  weight: number; // e.g. 0.30
  weightedPoints: number; // score * weight
  score: number; // 0 - 100
  status: 'strong' | 'moderate' | 'weak' | 'insufficient_data';
  statusTe: string;
  reasons: string[];
  reasonsTe: string[];
  isInsufficientData?: boolean;
}

export interface FeasibilityAssessmentResult {
  overallScore: number; // 0 - 100
  grade: FeasibilityGrade;
  gradeTe: string;
  summary: string;
  summaryTe: string;
  dimensions: Record<DimensionKey, FeasibilityDimensionScore>;
  strengths: string[];
  strengthsTe: string[];
  vulnerabilities: string[];
  vulnerabilitiesTe: string[];
  recommendedActions: string[];
  recommendedActionsTe: string[];
  assumptionsUsed: string[];
  calculatedAt: string;
}

export interface FeasibilityInput {
  category?: string;
  location?: string;
  projectCost?: number;
  marginCapital?: number;
  loanAmount?: number;
  monthlyRevenueEstimate?: number;
  monthlyExpenseEstimate?: number;
  competitorDensityLevel?: 'Low' | 'Moderate' | 'High';
  hasActiveLoan?: boolean;
  simulatingSecondLoan?: boolean;
  detectedRisks?: DetectedRisk[];
  rawMaterialAccess?: 'easy' | 'moderate' | 'difficult';
  hasMandiAccess?: boolean;
}

/**
 * Evaluates deterministic business feasibility across 5 strict dimensions.
 */
export function evaluateBusinessFeasibility(
  input: FeasibilityInput
): FeasibilityAssessmentResult {
  const category = (input.category || 'Dairy Farming').trim();
  const location = (input.location || 'Warangal, Telangana').trim();

  const marginCapital = Math.max(1000, input.marginCapital ?? 100000);
  const projectCost = input.projectCost ?? Math.round(marginCapital / 0.10);
  const loanAmount = input.loanAmount ?? Math.round(projectCost * 0.90);

  // Baseline turnover and expenses if not supplied
  const defaultMonthlyRev = Math.max(25000, Math.round(projectCost * 0.12));
  const defaultMonthlyExp = Math.max(15000, Math.round(defaultMonthlyRev * 0.65));

  const monthlyRev = input.monthlyRevenueEstimate ?? defaultMonthlyRev;
  const monthlyExp = input.monthlyExpenseEstimate ?? defaultMonthlyExp;
  const monthlyNOI = Math.max(0, monthlyRev - monthlyExp);

  // 1. FINANCIAL VIABILITY (Weight: 30%)
  const marginPct = Math.round((monthlyNOI / Math.max(1, monthlyRev)) * 100);
  const finPlan = calculateFinancePlan(marginCapital);
  const quarterlyEmi = finPlan.quarterlyEmi;
  const quarterlyNOI = monthlyNOI * 3;
  const dscr = quarterlyEmi > 0 ? Math.round((quarterlyNOI / quarterlyEmi) * 100) / 100 : 2.5;

  let finScore = 50;
  const finReasons: string[] = [];
  const finReasonsTe: string[] = [];

  if (marginPct >= 25) {
    finScore += 25;
    finReasons.push(`High operating profit margin of ${marginPct}% provides strong cash buffer.`);
    finReasonsTe.push(`నికర నిర్వహణ లాభ మార్జిన్ ${marginPct}% గా ఉండి బలమైన లాభదాయకతను సూచిస్తుంది.`);
  } else if (marginPct >= 15) {
    finScore += 15;
    finReasons.push(`Moderate operating profit margin of ${marginPct}%.`);
    finReasonsTe.push(`మధ్యస్థ నిర్వహణ లాభ మార్జిన్ ${marginPct}%.`);
  } else {
    finScore -= 10;
    finReasons.push(`Thin operating margin of ${marginPct}% increases vulnerability to cost spikes.`);
    finReasonsTe.push(`తక్కువ లాభ మార్జిన్ ${marginPct}% వల్ల నిర్వహణ ఖర్చులు పెరిగితే నష్టాలొచ్చే అవకాశం ఉంది.`);
  }

  if (dscr >= 1.5) {
    finScore += 25;
    finReasons.push(`Excellent Debt Service Coverage Ratio (DSCR ${dscr.toFixed(2)}x) well above banking threshold.`);
    finReasonsTe.push(`అద్భుతమైన రుణ చెల్లింపు సామర్థ్యం (DSCR ${dscr.toFixed(2)}x) బ్యాంకింగ్ ప్రమాణాల కంటే ఎక్కువగా ఉంది.`);
  } else if (dscr >= 1.25) {
    finScore += 15;
    finReasons.push(`Adequate DSCR (${dscr.toFixed(2)}x) meets bank sanction requirements.`);
    finReasonsTe.push(`సరైన రుణ చెల్లింపు సామర్థ్యం (${dscr.toFixed(2)}x) బ్యాంక్ నిబంధనలకు అనుగుణంగా ఉంది.`);
  } else {
    finScore -= 20;
    finReasons.push(`Deficient DSCR (${dscr.toFixed(2)}x) violates the 1.25x mandatory banking safety invariant.`);
    finReasonsTe.push(`తక్కువ DSCR (${dscr.toFixed(2)}x) బ్యాంకింగ్ భద్రతా ప్రమాణం 1.25x కంటే తక్కువగా ఉంది.`);
  }

  const boundedFinScore = Math.max(10, Math.min(100, finScore));

  // 2. MARKET VIABILITY (Weight: 25%)
  const density = input.competitorDensityLevel ?? 'Moderate';
  let mktScore = 60;
  const mktReasons: string[] = [];
  const mktReasonsTe: string[] = [];

  const catLower = category.toLowerCase();
  const isEssentialCommodity =
    catLower.includes('dairy') ||
    catLower.includes('milk') ||
    catLower.includes('kirana') ||
    catLower.includes('poultry') ||
    catLower.includes('milling');

  if (isEssentialCommodity) {
    mktScore += 20;
    mktReasons.push('High, recession-resilient local daily demand for essential agricultural/food products.');
    mktReasonsTe.push('నిత్యావసర ఉత్పత్తులకు స్థానికంగా రోజూ నిరంతర డిమాండ్ ఉంటుంది.');
  } else {
    mktScore += 10;
    mktReasons.push('Discretionary rural demand subject to festive and harvest liquidity cycles.');
    mktReasonsTe.push('పండుగలు మరియు పంట కోతల సమయంలో మాత్రమే అధిక డిమాండ్ ఉండే అవకాశం ఉంది.');
  }

  if (density === 'Low') {
    mktScore += 20;
    mktReasons.push('Low competitor density indicates favorable market pricing power.');
    mktReasonsTe.push('పోటీదారులు తక్కువగా ఉన్నందున మంచి ధర నిర్ణయించుకునే అవకాశం ఉంది.');
  } else if (density === 'Moderate') {
    mktScore += 10;
    mktReasons.push('Balanced competitor presence with sustainable local customer base.');
    mktReasonsTe.push('మితమైన పోటీతో కూడిన స్థానిక వినియోగదారుల మార్కెట్.');
  } else {
    mktScore -= 10;
    mktReasons.push('High competitor density requires clear quality or delivery differentiation.');
    mktReasonsTe.push('పోటీ ఎక్కువగా ఉన్నందున నాణ్యత లేదా సేవలలో ప్రత్యేకత చూపించాలి.');
  }

  const boundedMktScore = Math.max(15, Math.min(100, mktScore));

  // 3. OPERATIONAL READINESS (Weight: 20%)
  let opsScore = 65;
  const opsReasons: string[] = [];
  const opsReasonsTe: string[] = [];

  const rawAccess = input.rawMaterialAccess ?? 'easy';
  if (rawAccess === 'easy') {
    opsScore += 20;
    opsReasons.push('Fodder, raw materials, and skilled village labor readily accessible locally.');
    opsReasonsTe.push('దాణా, ముడిసరుకు మరియు స్థానిక కూలీలు సులభంగా అందుబాటులో ఉన్నారు.');
  } else if (rawAccess === 'moderate') {
    opsScore += 10;
    opsReasons.push('Input supplies available within 15 km commercial cluster radius.');
    opsReasonsTe.push('ముడిసరుకు 15 కి.మీ పరిధిలోని వాణిజ్య కేంద్రాలలో లభిస్తుంది.');
  } else {
    opsScore -= 15;
    opsReasons.push('Remote input sourcing increases logistics costs and inventory working capital.');
    opsReasonsTe.push('ముడిసరుకు రవాణా దూరం ఎక్కువగా ఉండటం వల్ల ఖర్చులు పెరిగే అవకాశం ఉంది.');
  }

  // Working capital buffer check
  const wcRatio = (marginCapital * 0.20) / Math.max(1, monthlyExp);
  if (wcRatio >= 1.0) {
    opsScore += 15;
    opsReasons.push('Adequate liquid working capital reserve buffer exceeding 30 days of operations.');
    opsReasonsTe.push('30 రోజులకు పైగా వ్యాపార నిర్వహణకు సరిపడా నగదు నిల్వలు ఉన్నాయి.');
  } else {
    opsScore -= 10;
    opsReasons.push('Tight initial working capital; monitor feed and vendor credit terms closely.');
    opsReasonsTe.push('ప్రారంభ వర్కింగ్ క్యాపిటల్ పరిమితంగా ఉంది; ఖర్చులను జాగ్రత్తగా పర్యవేక్షించండి.');
  }

  const boundedOpsScore = Math.max(15, Math.min(100, opsScore));

  // 4. LOCATION SUITABILITY (Weight: 15%)
  let locScore = 70;
  const locReasons: string[] = [];
  const locReasonsTe: string[] = [];

  const locLower = location.toLowerCase();
  const isTelanganaCore =
    locLower.includes('warangal') ||
    locLower.includes('nizamabad') ||
    locLower.includes('karimnagar') ||
    locLower.includes('nalgonda') ||
    locLower.includes('khammam') ||
    locLower.includes('bodhan') ||
    locLower.includes('armoor');

  if (isTelanganaCore) {
    locScore += 20;
    locReasons.push(`Established agro-commercial infrastructure and APMC connectivity in ${location}.`);
    locReasonsTe.push(`${location} ప్రాంతంలో బలమైన వ్యవసాయ-వాణిజ్య మౌలిక సదుపాయాలు మరియు APMC మార్కెట్ లింకేజ్ ఉన్నాయి.`);
  } else {
    locScore += 10;
    locReasons.push(`Standard rural cluster environment in ${location}.`);
    locReasonsTe.push(`${location} లో సాధారణ గ్రామీణ వ్యాపార వాతావరణం.`);
  }

  if (input.hasMandiAccess ?? true) {
    locScore += 10;
    locReasons.push('Direct access to rural cooperative milk chilling centre / grain market yard.');
    locReasonsTe.push('సహకార పాల శీతలీకరణ కేంద్రం / వ్యవసాయ మార్కెట్ యార్డుకు ప్రత్యక్ష అనుసంధానం.');
  }

  const boundedLocScore = Math.max(20, Math.min(100, locScore));

  // 5. RISK PROFILE (Weight: 10%)
  const detectedRisks =
    input.detectedRisks ??
    evaluateFinancialRisks({
      hasActiveLoan: input.hasActiveLoan ?? false,
      simulatingSecondLoan: input.simulatingSecondLoan ?? false,
      totalIncome: monthlyRev,
      totalExpenses: monthlyExp,
      netCashFlow: monthlyNOI,
    });

  let riskScore = 90;
  const riskReasons: string[] = [];
  const riskReasonsTe: string[] = [];

  const alerts = detectedRisks.filter((r) => r.severity === 'alert');
  const warnings = detectedRisks.filter((r) => r.severity === 'warning');

  if (alerts.length === 0 && warnings.length === 0) {
    riskScore = 95;
    riskReasons.push('Zero invariant financial violations. All debt burden and liquidity checks pass.');
    riskReasonsTe.push('ఎటువంటి ఆర్థిక రిస్క్ ఉల్లంఘనలు లేవు. రుణ భారం మరియు నగదు నిల్వలు సురక్షితంగా ఉన్నాయి.');
  } else {
    if (alerts.length > 0) {
      riskScore -= alerts.length * 35;
      for (const a of alerts) {
        riskReasons.push(`Alert: ${a.title} (${a.reason})`);
        riskReasonsTe.push(`హెచ్చరిక: ${a.titleTe} (${a.reasonTe})`);
      }
    }
    if (warnings.length > 0) {
      riskScore -= warnings.length * 15;
      for (const w of warnings) {
        riskReasons.push(`Warning: ${w.title} (${w.reason})`);
        riskReasonsTe.push(`సూచన: ${w.titleTe} (${w.reasonTe})`);
      }
    }
  }

  const boundedRiskScore = Math.max(10, Math.min(100, riskScore));

  // OVERALL WEIGHTED CALCULATION
  const overallRaw =
    boundedFinScore * 0.30 +
    boundedMktScore * 0.25 +
    boundedOpsScore * 0.20 +
    boundedLocScore * 0.15 +
    boundedRiskScore * 0.10;

  const overallScore = Math.round(overallRaw);

  let grade: FeasibilityGrade = 'Grade B (Conditionally Feasible)';
  let gradeTe = 'గ్రేడ్ B (పరిస్థితులకు లోబడి సాధ్యమే)';
  let summary = 'Viable enterprise proposal with positive operating fundamentals. Address minor margin risks before bank appraisal.';
  let summaryTe = 'సానుకూల ప్రాథమిక అంశాలతో కూడిన ఆచరణాత్మక వ్యాపార ప్రతిపాదన. రుణ దరఖాస్తుకు ముందు సూచించిన జాగ్రత్తలు పాటించండి.';

  if (overallScore >= 80) {
    grade = 'Grade A (Highly Feasible)';
    gradeTe = 'గ్రేడ్ A (అత్యంత అనుకూలమైన వ్యాపారం)';
    summary = 'Strong multi-dimensional feasibility. High debt servicing capacity, robust local demand, and compliant risk profile.';
    summaryTe = 'అన్ని విధాలా అత్యుత్తమ వ్యాపార సాధ్యత. అధిక రుణ చెల్లింపు సామర్థ్యం మరియు బలమైన మార్కెట్ గిరాకీ ఉన్నాయి.';
  } else if (overallScore < 50) {
    grade = 'Grade C (Marginal / High Risk)';
    gradeTe = 'గ్రేడ్ C (అధిక రిస్క్ / పరిమిత సాధ్యత)';
    summary = 'Elevated operational or financial risk. Strengthen equity margin or lower project cost before seeking formal bank credit.';
    summaryTe = 'అధిక నిర్వహణ లేదా ఆర్థిక రిస్క్ ఉంది. బ్యాంక్ రుణం తీసుకునే ముందు సొంత పెట్టుబడిని పెంచుకోండి.';
  }

  // Key Strengths & Vulnerabilities
  const strengths: string[] = [];
  const strengthsTe: string[] = [];
  const vulnerabilities: string[] = [];
  const vulnerabilitiesTe: string[] = [];

  if (boundedFinScore >= 75) {
    strengths.push(`Solid financial returns with DSCR of ${dscr.toFixed(2)}x.`);
    strengthsTe.push(`DSCR ${dscr.toFixed(2)}x తో బలమైన ఆర్థిక రాబడులు.`);
  } else {
    vulnerabilities.push(`Debt burden is elevated relative to operating surplus (DSCR: ${dscr.toFixed(2)}x).`);
    vulnerabilitiesTe.push(`నికర లాభంతో పోలిస్తే రుణ భారం ఎక్కువగా ఉంది (DSCR: ${dscr.toFixed(2)}x).`);
  }

  if (boundedMktScore >= 75) {
    strengths.push('Reliable daily consumption demand in the local village cluster.');
    strengthsTe.push('స్థానిక గ్రామీణ మార్కెట్లో నిరంతర వినియోగ డిమాండ్.');
  }

  if (boundedOpsScore >= 75) {
    strengths.push('Ready availability of local agricultural inputs and labor.');
    strengthsTe.push('స్థానిక ముడిసరుకు మరియు శ్రామిక వనరుల లభ్యత.');
  } else {
    vulnerabilities.push('Working capital buffer requires careful month-by-month cash flow management.');
    vulnerabilitiesTe.push('వర్కింగ్ క్యాపిటల్ నిల్వలను నెలవారీగా జాగ్రత్తగా నిర్వహించాలి.');
  }

  const recommendedActions = [
    `Maintain at least ₹${Math.round(projectCost * 0.15).toLocaleString('en-IN')} as liquid contingency reserve during the initial 6 months.`,
    `Leverage government credit subsidy under PMEGP or MUDRA to reduce net interest outflow.`,
    `Establish direct supply contracts with local mandis or dairy cooperatives to lock in minimum off-take pricing.`,
  ];

  const recommendedActionsTe = [
    `ప్రారంభ 6 నెలల్లో కనీసం ₹${Math.round(projectCost * 0.15).toLocaleString('en-IN')} అత్యవసర నిధిగా అందుబాటులో ఉంచుకోండి.`,
    `వడ్డీ భారాన్ని తగ్గించుకోవడానికి PMEGP లేదా MUDRA వంటి ప్రభుత్వ రాయితీ పథకాలను సద్వినియోగం చేసుకోండి.`,
    `స్థిరమైన రాబడి కోసం స్థానిక మిల్క్ డెయిరీ లేదా మార్కెట్ యార్డులతో ముందస్తు ఒప్పందాలు చేసుకోండి.`,
  ];

  return {
    overallScore,
    grade,
    gradeTe,
    summary,
    summaryTe,
    dimensions: {
      financialViability: {
        key: 'financialViability',
        label: 'Financial Viability',
        labelTe: 'ఆర్థిక సాధ్యత (30%)',
        weight: 0.30,
        weightedPoints: Math.round(boundedFinScore * 0.30 * 10) / 10,
        score: boundedFinScore,
        status: boundedFinScore >= 75 ? 'strong' : boundedFinScore >= 50 ? 'moderate' : 'weak',
        statusTe: boundedFinScore >= 75 ? 'బలమైనది (Strong)' : boundedFinScore >= 50 ? 'మధ్యస్థం (Moderate)' : 'బలహీనం (Weak)',
        reasons: finReasons,
        reasonsTe: finReasonsTe,
      },
      marketViability: {
        key: 'marketViability',
        label: 'Market Viability',
        labelTe: 'మార్కెట్ గిరాకీ & పోటీ (25%)',
        weight: 0.25,
        weightedPoints: Math.round(boundedMktScore * 0.25 * 10) / 10,
        score: boundedMktScore,
        status: boundedMktScore >= 75 ? 'strong' : boundedMktScore >= 50 ? 'moderate' : 'weak',
        statusTe: boundedMktScore >= 75 ? 'బలమైనది (Strong)' : boundedMktScore >= 50 ? 'మధ్యస్థం (Moderate)' : 'బలహీనం (Weak)',
        reasons: mktReasons,
        reasonsTe: mktReasonsTe,
      },
      operationalReadiness: {
        key: 'operationalReadiness',
        label: 'Operational Readiness',
        labelTe: 'నిర్వహణ సంసిద్ధత (20%)',
        weight: 0.20,
        weightedPoints: Math.round(boundedOpsScore * 0.20 * 10) / 10,
        score: boundedOpsScore,
        status: boundedOpsScore >= 75 ? 'strong' : boundedOpsScore >= 50 ? 'moderate' : 'weak',
        statusTe: boundedOpsScore >= 75 ? 'బలమైనది (Strong)' : boundedOpsScore >= 50 ? 'మధ్యస్థం (Moderate)' : 'బలహీనం (Weak)',
        reasons: opsReasons,
        reasonsTe: opsReasonsTe,
      },
      locationSuitability: {
        key: 'locationSuitability',
        label: 'Location Suitability',
        labelTe: 'ప్రాంతీయ అనుకూలత (15%)',
        weight: 0.15,
        weightedPoints: Math.round(boundedLocScore * 0.15 * 10) / 10,
        score: boundedLocScore,
        status: boundedLocScore >= 75 ? 'strong' : boundedLocScore >= 50 ? 'moderate' : 'weak',
        statusTe: boundedLocScore >= 75 ? 'బలమైనది (Strong)' : boundedLocScore >= 50 ? 'మధ్యస్థం (Moderate)' : 'బలహీనం (Weak)',
        reasons: locReasons,
        reasonsTe: locReasonsTe,
      },
      riskProfile: {
        key: 'riskProfile',
        label: 'Risk & Safeguard Profile',
        labelTe: 'రిస్క్ ప్రొఫైల్ & భద్రతా నియమాలు (10%)',
        weight: 0.10,
        weightedPoints: Math.round(boundedRiskScore * 0.10 * 10) / 10,
        score: boundedRiskScore,
        status: boundedRiskScore >= 75 ? 'strong' : boundedRiskScore >= 50 ? 'moderate' : 'weak',
        statusTe: boundedRiskScore >= 75 ? 'సురక్షితం (Low Risk)' : boundedRiskScore >= 50 ? 'మధ్యస్థం (Moderate)' : 'హెచ్చరిక (High Risk)',
        reasons: riskReasons,
        reasonsTe: riskReasonsTe,
      },
    },
    strengths,
    strengthsTe,
    vulnerabilities,
    vulnerabilitiesTe,
    recommendedActions,
    recommendedActionsTe,
    assumptionsUsed: [
      `Promoter Equity Margin: ₹${marginCapital.toLocaleString('en-IN')} (10.0% of ₹${projectCost.toLocaleString('en-IN')} project outlay)`,
      `Estimated Monthly Turnover: ₹${monthlyRev.toLocaleString('en-IN')} | OPEX: ₹${monthlyExp.toLocaleString('en-IN')}`,
      `Statutory DSCR Benchmark: 1.25x (RBI/NABARD Priority Sector Norms)`,
    ],
    calculatedAt: new Date().toISOString(),
  };
}
