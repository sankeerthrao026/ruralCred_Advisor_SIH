export interface SchemeConfig {
  id: 'micro-finance' | 'term-loan';
  name: string;
  nameTe: string;
  agency: string;
  interestRateAnnual: number; // e.g. 6.5 or 8.0
  tenureYears: number; // e.g. 3 or 7
  moratoriumMonths: number; // e.g. 3 or 6
  maxProjectCost: number;
}

export const SCHEMES: Record<'micro-finance' | 'term-loan', SchemeConfig> = {
  'micro-finance': {
    id: 'micro-finance',
    name: 'Micro Finance Scheme',
    nameTe: 'సూక్ష్మ రుణ పథకం',
    agency: 'NBCFDC / State Minorities & Backward Classes Corporations',
    interestRateAnnual: 6.5,
    tenureYears: 3,
    moratoriumMonths: 3,
    maxProjectCost: 140000,
  },
  'term-loan': {
    id: 'term-loan',
    name: 'Term Loan Scheme',
    nameTe: 'టర్మ్ లోన్ పథకం',
    agency: 'National Backward Classes Finance & Development Corporation (NBCFDC)',
    interestRateAnnual: 8.0,
    tenureYears: 7,
    moratoriumMonths: 6,
    maxProjectCost: 5000000,
  },
};

export interface AmortizationQuarter {
  quarter: number;
  isMoratorium: boolean;
  startingPrincipal: number;
  principalPaid: number;
  interestPaid: number;
  totalPayment: number;
  remainingBalance: number;
}

export interface FinanceAnalysisResult {
  marginCapital: number;
  projectCost: number;
  loanAmount: number;
  marginPercentage: number;
  loanPercentage: number;
  scheme: SchemeConfig;
  quarterlyEmi: number;
  totalQuarters: number;
  moratoriumQuarters: number;
  repaymentQuarters: number;
  totalInterestPaid: number;
  totalRepayment: number;
  amortizationSchedule: AmortizationQuarter[];
}

/**
 * Deterministic Financial Calculations for RuralCred Advisor.
 * Project Cost = Margin Capital / 0.10
 * Loan Amount = 90% of Project Cost
 * Scheme Routing:
 *   If Project Cost <= ₹1,40,000 -> Micro Finance Scheme (6.5% p.a., 3 yrs, 3 mos moratorium)
 *   If ₹1,40,000 < Project Cost <= ₹50,00,000 -> Term Loan Scheme (8.0% p.a., 7 yrs, 6 mos moratorium)
 */
export function calculateFinancePlan(marginCapital: number): FinanceAnalysisResult {
  const cleanMargin = Math.max(1000, marginCapital || 0);

  // Deterministic Project Cost & Loan Amount
  const projectCost = Math.round(cleanMargin / 0.10);
  const loanAmount = Math.round(projectCost * 0.90);

  // Deterministic Scheme Routing
  const scheme: SchemeConfig =
    projectCost <= 140000 ? SCHEMES['micro-finance'] : SCHEMES['term-loan'];

  const annualRate = scheme.interestRateAnnual / 100;
  const quarterlyRate = annualRate / 4;
  const totalQuarters = scheme.tenureYears * 4;
  const moratoriumQuarters = Math.round(scheme.moratoriumMonths / 3);
  const repaymentQuarters = totalQuarters - moratoriumQuarters;

  // Standard Quarterly Reducing Balance Amortization Formula
  // EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
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

  // Generate Quarter-by-Quarter Schedule
  const schedule: AmortizationQuarter[] = [];
  let currentBalance = loanAmount;
  let totalInterest = 0;
  let totalPaid = 0;

  for (let q = 1; q <= totalQuarters; q++) {
    const isMoratorium = q <= moratoriumQuarters;
    const startPrincipal = currentBalance;
    const interest = Math.round(startPrincipal * r);
    totalInterest += interest;

    if (isMoratorium) {
      // During moratorium: Interest only (grace period for principal repayment)
      const payment = interest;
      totalPaid += payment;
      schedule.push({
        quarter: q,
        isMoratorium: true,
        startingPrincipal: startPrincipal,
        principalPaid: 0,
        interestPaid: interest,
        totalPayment: payment,
        remainingBalance: currentBalance,
      });
    } else {
      // Repayment quarter
      const isLastQuarter = q === totalQuarters;
      let principalPaid = isLastQuarter
        ? currentBalance
        : Math.round(quarterlyEmi - interest);

      if (principalPaid > currentBalance) {
        principalPaid = currentBalance;
      }

      const totalPayment = isLastQuarter
        ? principalPaid + interest
        : quarterlyEmi;

      currentBalance = Math.max(0, currentBalance - principalPaid);
      totalPaid += totalPayment;

      schedule.push({
        quarter: q,
        isMoratorium: false,
        startingPrincipal: startPrincipal,
        principalPaid: principalPaid,
        interestPaid: interest,
        totalPayment: totalPayment,
        remainingBalance: currentBalance,
      });
    }
  }

  return {
    marginCapital: cleanMargin,
    projectCost,
    loanAmount,
    marginPercentage: 10,
    loanPercentage: 90,
    scheme,
    quarterlyEmi,
    totalQuarters,
    moratoriumQuarters,
    repaymentQuarters,
    totalInterestPaid: totalInterest,
    totalRepayment: totalPaid,
    amortizationSchedule: schedule,
  };
}

export interface FinancialHealthScoreResult {
  score: number; // 0 - 100
  loggingScore: number;
  profitTrendScore: number;
  expenseRatioScore: number;
  status: 'excellent' | 'steady' | 'needs_attention';
  statusTe: string;
  summary: string;
  summaryTe: string;
  breakdown: {
    label: string;
    labelTe: string;
    weight: string;
    score: number;
  }[];
}

/**
 * Transparent Rule-Based Financial Health Score (0 - 100).
 * Strictly rule-based calculation with transparent weights.
 * Not black-box or fake ML.
 */
export function calculateFinancialHealthScore(params: {
  totalIncome: number;
  totalExpenses: number;
  entryCount: number;
  hasDownwardTrend: boolean;
}): FinancialHealthScoreResult {
  const { totalIncome, totalExpenses, entryCount, hasDownwardTrend } = params;

  // 1. Logging Consistency (Weight 30%)
  let loggingScore = 40;
  if (entryCount >= 10) loggingScore = 100;
  else if (entryCount >= 5) loggingScore = 85;
  else if (entryCount >= 2) loggingScore = 65;

  // 2. Expense-to-Income Ratio (Weight 30%)
  let expenseRatioScore = 30;
  if (totalIncome > 0) {
    const ratio = totalExpenses / totalIncome;
    if (ratio <= 0.40) expenseRatioScore = 100;
    else if (ratio <= 0.60) expenseRatioScore = 85;
    else if (ratio <= 0.80) expenseRatioScore = 70;
    else if (ratio <= 1.00) expenseRatioScore = 50;
    else expenseRatioScore = 25;
  }

  // 3. Profit Trend (Weight 40%)
  const net = totalIncome - totalExpenses;
  let profitTrendScore = 25;
  if (net > 0 && !hasDownwardTrend) profitTrendScore = 95;
  else if (net > 0 && hasDownwardTrend) profitTrendScore = 70;
  else if (net === 0) profitTrendScore = 50;
  else profitTrendScore = 25;

  // Weighted aggregate
  const rawScore =
    loggingScore * 0.30 + profitTrendScore * 0.40 + expenseRatioScore * 0.30;
  const score = Math.min(100, Math.max(0, Math.round(rawScore)));

  let status: 'excellent' | 'steady' | 'needs_attention' = 'steady';
  let statusTe = 'స్థిరమైన ఆర్థిక స్థితి (Steady)';
  let summary = 'Predictable revenue with balanced operating expenses. Capable of debt servicing.';
  let summaryTe = 'స్థిరమైన రాబడి మరియు నియంత్రిత ఖర్చులు. సాధారణ రుణ వాయిదాలను చెల్లించగలరు.';

  if (score >= 80) {
    status = 'excellent';
    statusTe = 'ఉత్తమ ఆర్థిక ఆరోగ్యం (Excellent)';
    summary = 'Strong operating cash buffer with high savings margin. High loan repayment capacity.';
    summaryTe = 'బలమైన నికర నగదు ప్రవాహం మరియు అద్భుతమైన రుణ చెల్లింపు సామర్థ్యం.';
  } else if (score < 60) {
    status = 'needs_attention';
    statusTe = 'జాగ్రత్త అవసరం (Caution)';
    summary = 'Operating cash buffer is limited or expenses are near receipts. Tighten liquidity before borrowing.';
    summaryTe = 'నగదు నిల్వలు తక్కువగా ఉన్నాయి లేదా ఖర్చులు ఎక్కువగా ఉన్నాయి. అప్పు తీసుకునే ముందు జాగ్రత్త పడండి.';
  }

  return {
    score,
    loggingScore,
    profitTrendScore,
    expenseRatioScore,
    status,
    statusTe,
    summary,
    summaryTe,
    breakdown: [
      {
        label: 'Digital Logging Habit',
        labelTe: 'లాగ్‌బుక్ నిర్వహణ క్రమబద్ధత (30%)',
        weight: '30%',
        score: loggingScore,
      },
      {
        label: 'Net Operating Profitability',
        labelTe: 'నికర లాభదాయకత ధోరణి (40%)',
        weight: '40%',
        score: profitTrendScore,
      },
      {
        label: 'Expense-to-Income Discipline',
        labelTe: 'ఆదాయం-ఖర్చుల నిష్పత్తి (30%)',
        weight: '30%',
        score: expenseRatioScore,
      },
    ],
  };
}

export interface MultiYearProjectionYear {
  year: number;
  grossRevenue: number;
  operatingExpenses: number;
  netOperatingIncome: number; // EBITDA
  depreciation: number;
  interestPaid: number;
  principalRepaid: number;
  totalDebtService: number;
  netCashFlow: number;
  closingCashBalance: number;
  closingLoanBalance: number;
  dscr: number;
  isDscrHealthy: boolean;
}

export interface MultiYearFinancialAssumptions {
  projectionYears: number;
  baseMonthlyRevenue: number;
  baseMonthlyExpense: number;
  annualRevenueGrowthPct: number;
  annualExpenseGrowthPct: number;
  assetDepreciationRatePct: number;
  projectCost: number;
  marginCapital: number;
  loanAmount: number;
  interestRateAnnual: number;
  tenureYears: number;
  moratoriumMonths: number;
}

export interface MultiYearProjectionResult {
  assumptions: MultiYearFinancialAssumptions;
  years: MultiYearProjectionYear[];
  averageDscr: number;
  minDscr: number;
  totalFiveYearNetCashFlow: number;
  totalInterestPaid: number;
  isBankable: boolean;
  bankabilitySummary: string;
  bankabilitySummaryTe: string;
}

export interface MultiYearProjectionParams {
  marginCapital?: number;
  projectCost?: number;
  loanAmount?: number;
  baseMonthlyRevenue?: number;
  baseMonthlyExpense?: number;
  annualRevenueGrowthPct?: number; // default: 8.0%
  annualExpenseGrowthPct?: number; // default: 5.0%
  assetDepreciationRatePct?: number; // default: 10.0%
  interestRateAnnual?: number;
  tenureYears?: number;
  moratoriumMonths?: number;
  projectionYears?: number; // default: 5
}

/**
 * Deterministic Multi-Year Financial Projection Engine (Default: 5 Years).
 * Strictly computes annual P&L, reducing-balance debt service, depreciation,
 * cash-flow cumulative runway, and DSCR trajectory.
 */
export function calculateMultiYearProjection(
  params: MultiYearProjectionParams = {}
): MultiYearProjectionResult {
  const marginCapital = Math.max(1000, params.marginCapital ?? 100000);
  const projectCost = params.projectCost ?? Math.round(marginCapital / 0.10);
  const loanAmount = params.loanAmount ?? Math.round(projectCost * 0.90);

  // Scheme or custom loan terms
  const scheme = projectCost <= 140000 ? SCHEMES['micro-finance'] : SCHEMES['term-loan'];
  const interestRateAnnual = params.interestRateAnnual ?? scheme.interestRateAnnual;
  const tenureYears = params.tenureYears ?? scheme.tenureYears;
  const moratoriumMonths = params.moratoriumMonths ?? scheme.moratoriumMonths;
  const projectionYears = Math.max(1, Math.min(10, params.projectionYears ?? 5));

  const annualRevenueGrowthPct = params.annualRevenueGrowthPct ?? 8.0;
  const annualExpenseGrowthPct = params.annualExpenseGrowthPct ?? 5.0;
  const assetDepreciationRatePct = params.assetDepreciationRatePct ?? 10.0;

  // Default monthly revenue/expense estimates if not provided
  // Baseline: standard rural micro-enterprise operating turnover ~30-40% of project cost monthly
  const defaultMonthlyRev = Math.max(25000, Math.round(projectCost * 0.12));
  const defaultMonthlyExp = Math.max(15000, Math.round(defaultMonthlyRev * 0.65));

  const baseMonthlyRevenue = params.baseMonthlyRevenue ?? defaultMonthlyRev;
  const baseMonthlyExpense = params.baseMonthlyExpense ?? defaultMonthlyExp;

  // Calculate detailed quarterly amortization schedule to map into years
  const annualRate = interestRateAnnual / 100;
  const quarterlyRate = annualRate / 4;
  const totalQuarters = tenureYears * 4;
  const moratoriumQuarters = Math.round(moratoriumMonths / 3);
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

  // Generate all quarters of amortization
  interface QRecord {
    interest: number;
    principal: number;
    payment: number;
    remaining: number;
  }
  const quarterRecords: QRecord[] = [];
  let currBal = loanAmount;

  for (let q = 1; q <= Math.max(totalQuarters, projectionYears * 4); q++) {
    if (q > totalQuarters || currBal <= 0) {
      quarterRecords.push({ interest: 0, principal: 0, payment: 0, remaining: 0 });
      continue;
    }
    const isMoratorium = q <= moratoriumQuarters;
    const interest = Math.round(currBal * r);
    if (isMoratorium) {
      quarterRecords.push({ interest, principal: 0, payment: interest, remaining: currBal });
    } else {
      const isLast = q === totalQuarters;
      let principalPaid = isLast ? currBal : Math.round(quarterlyEmi - interest);
      if (principalPaid > currBal) principalPaid = currBal;
      const payment = isLast ? principalPaid + interest : quarterlyEmi;
      currBal = Math.max(0, currBal - principalPaid);
      quarterRecords.push({ interest, principal: principalPaid, payment, remaining: currBal });
    }
  }

  // Yearly projection simulation
  const years: MultiYearProjectionYear[] = [];
  let cumulativeCash = marginCapital * 0.15; // 15% opening contingency buffer
  let totalInterestPaidAllYears = 0;
  let dscrSum = 0;
  let minDscr = 999;

  let currentAnnualRev = baseMonthlyRevenue * 12;
  let currentAnnualExp = baseMonthlyExpense * 12;
  let plantAssetBase = Math.round(projectCost * 0.70); // 70% capex equipment

  for (let y = 1; y <= projectionYears; y++) {
    // Apply compounding annual growth from Year 2 onwards
    if (y > 1) {
      currentAnnualRev = Math.round(currentAnnualRev * (1 + annualRevenueGrowthPct / 100));
      currentAnnualExp = Math.round(currentAnnualExp * (1 + annualExpenseGrowthPct / 100));
    }

    // In Year 1, revenue is adjusted for 1-month gestation/setup ramp-up (11 active operating months)
    const effectiveYearRev = y === 1 ? Math.round(currentAnnualRev * (11 / 12)) : currentAnnualRev;
    const effectiveYearExp = y === 1 ? Math.round(currentAnnualExp * (11.5 / 12)) : currentAnnualExp;

    const netOperatingIncome = effectiveYearRev - effectiveYearExp;

    // Straight-line asset depreciation
    const depreciation = Math.round(plantAssetBase * (assetDepreciationRatePct / 100));
    plantAssetBase = Math.max(0, plantAssetBase - depreciation);

    // Sum 4 quarters for year y
    const startQ = (y - 1) * 4;
    let yearInterest = 0;
    let yearPrincipal = 0;
    let yearPayment = 0;
    let closingBal = 0;

    for (let i = 0; i < 4; i++) {
      const qRec = quarterRecords[startQ + i] || { interest: 0, principal: 0, payment: 0, remaining: 0 };
      yearInterest += qRec.interest;
      yearPrincipal += qRec.principal;
      yearPayment += qRec.payment;
      closingBal = qRec.remaining;
    }

    totalInterestPaidAllYears += yearInterest;
    const netCashFlow = netOperatingIncome - yearPayment;
    cumulativeCash += netCashFlow;

    // DSCR = Net Operating Income / Total Annual Debt Service
    let dscr = 2.5;
    if (yearPayment > 0) {
      dscr = Math.round((netOperatingIncome / yearPayment) * 100) / 100;
    } else {
      dscr = 3.5; // Debt free in later years
    }

    if (dscr < minDscr) minDscr = dscr;
    dscrSum += dscr;

    years.push({
      year: y,
      grossRevenue: effectiveYearRev,
      operatingExpenses: effectiveYearExp,
      netOperatingIncome,
      depreciation,
      interestPaid: yearInterest,
      principalRepaid: yearPrincipal,
      totalDebtService: yearPayment,
      netCashFlow,
      closingCashBalance: cumulativeCash,
      closingLoanBalance: closingBal,
      dscr,
      isDscrHealthy: dscr >= 1.25,
    });
  }

  const averageDscr = Math.round((dscrSum / projectionYears) * 100) / 100;
  const isBankable = minDscr >= 1.25 && cumulativeCash > 0;

  const bankabilitySummary = isBankable
    ? `Strong multi-year debt service sustainability. Average DSCR of ${averageDscr.toFixed(2)}x remains above the RBI/NABARD 1.25x statutory benchmark across all ${projectionYears} years.`
    : `Elevated debt burden. Minimum DSCR drops to ${minDscr.toFixed(2)}x, falling below the 1.25x safe threshold. Consider reducing debt proportion or extending tenure.`;

  const bankabilitySummaryTe = isBankable
    ? `బలమైన బహుళ-వార్షిక రుణ చెల్లింపు సామర్థ్యం. సగటు DSCR ${averageDscr.toFixed(2)}x గా ఉండి, బ్యాంకింగ్ బెంచ్‌మార్క్ 1.25x కంటే సురక్షితంగా ఉంది.`
    : `రుణ భారం ఎక్కువగా ఉంది. కనిష్ట DSCR ${minDscr.toFixed(2)}x గా నమోదైంది. రుణ భారాన్ని తగ్గించుకోవడం మంచిది.`;

  return {
    assumptions: {
      projectionYears,
      baseMonthlyRevenue,
      baseMonthlyExpense,
      annualRevenueGrowthPct,
      annualExpenseGrowthPct,
      assetDepreciationRatePct,
      projectCost,
      marginCapital,
      loanAmount,
      interestRateAnnual,
      tenureYears,
      moratoriumMonths,
    },
    years,
    averageDscr,
    minDscr,
    totalFiveYearNetCashFlow: cumulativeCash,
    totalInterestPaid: totalInterestPaidAllYears,
    isBankable,
    bankabilitySummary,
    bankabilitySummaryTe,
  };
}

