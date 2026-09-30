/**
 * RuralCred Advisor — Deterministic Business & Capacity Calculation Engine.
 * Provides exact unit economics calculations for rural micro-enterprises.
 */

export type BusinessDomain =
  | 'handloom_weaving'
  | 'dairy_farming'
  | 'retail_shop'
  | 'poultry_farming'
  | 'tailoring_garments'
  | 'agri_processing'
  | 'agriculture_crop'
  | 'general_enterprise';

export type NumericRole =
  | 'TARGET_PROFIT'
  | 'SEARCH_TARGET_VALUE'
  | 'PREVIOUS_ANSWER_VALUE'
  | 'INPUT_PARAMETER'
  | 'COMPARISON_VALUE'
  | 'LOAN_AMOUNT'
  | 'UNKNOWN';

export interface ExtractedNumber {
  raw: string;
  value: number;
  role: NumericRole;
  unit?: string;
  timeframe?: string;
}

export interface ParsedQueryIntent {
  intent:
    | 'retrieval_evidence_inspection'
    | 'provenance_query'
    | 'forward_unit_calculation'
    | 'comparison_query'
    | 'translation_query'
    | 'loan_simulation'
    | 'location_selection'
    | 'investment_decision'
    | 'capacity_calculation'
    | 'profitability_calculation'
    | 'break_even_calculation'
    | 'volume_target_calculation'
    | 'expansion_capital_calculation'
    | 'raw_material_optimization'
    | 'pricing_guidance'
    | 'market_demand'
    | 'competitor_analysis'
    | 'risk_assessment'
    | 'government_schemes'
    | 'seasonal_operational_advice'
    | 'cash_flow_optimization'
    | 'general_advisory';
  targetAmount: number | null;
  isNumerical: boolean;
  entity: 'cow' | 'buffalo' | 'bird' | 'loom' | 'milk_litre' | null;
  timeframe: 'annual' | 'monthly' | 'daily';
  domain: BusinessDomain;
  numericRoles?: ExtractedNumber[];
  primaryRole?: NumericRole;
  inputUnits?: number | null;
}

export interface CapacityCalculationResult {
  category: string;
  unitNameEn: string;
  unitNameTe: string;
  targetProfit: number;
  annualTargetProfit: number;
  exactUnitsNeeded: number;
  recommendedUnits: number;
  unitMetrics: Record<string, any>;
  financialOutlay: {
    totalProjectCost: number;
    promoterMarginRequired: number;
    bankLoanEligible: number;
  };
  assumptions?: string[];
  assumptionsTe?: string[];
}

export interface ForwardUnitProfitResult {
  category: string;
  units: number;
  unitNameEn: string;
  unitNameTe: string;
  annualRevenue: number;
  annualOpex: number;
  annualNetProfit: number;
  monthlyNetProfit: number;
  totalCapex: number;
  marginRequired: number;
  loanEligible: number;
}

export function parseTargetAmount(text: string): number | null {
  if (!text) return null;
  const clean = text.toLowerCase().replace(/,/g, '').trim();

  // Lakhs pattern
  const mLakh = clean.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:lakhs?|lacs?|lac|l|లక్షలు|లక్షల|లక్ష)/i);
  if (mLakh && mLakh[1]) {
    const val = parseFloat(mLakh[1]);
    if (!isNaN(val)) return val * 100000;
  }

  // Crores pattern
  const mCr = clean.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:crores?|crs?|cr|కోట్లు|కోట్ల|కోటి)/i);
  if (mCr && mCr[1]) {
    const val = parseFloat(mCr[1]);
    if (!isNaN(val)) return val * 10000000;
  }

  // Thousands pattern
  const mK = clean.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:k|thousand|వేలు|వేల)/i);
  if (mK && mK[1]) {
    const val = parseFloat(mK[1]);
    if (!isNaN(val)) return val * 1000;
  }

  // Raw numbers >= 1000
  const mNum = clean.match(/(?:₹|rs\.?|inr\s*)?\s*(\d{4,9})(?:\.\d+)?/i);
  if (mNum && mNum[1]) {
    const val = parseFloat(mNum[1]);
    if (!isNaN(val) && val >= 1000) return val;
  }

  return null;
}

export function extractNumbersWithRoles(query: string): ExtractedNumber[] {
  if (!query) return [];
  const qLower = query.toLowerCase();
  const extracted: ExtractedNumber[] = [];

  // Patterns for currency & values
  const currencyMatches = [
    ...qLower.matchAll(/(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(lakhs?|lacs?|lac|l|crores?|crs?|cr|k|thousand|వేలు|లక్షలు|కోట్లు)?(?:\s*\/\s*(month|mo|year|yr|annum|day|నెల|సంవత్సరం|రోజు))?/gi)
  ];

  for (const m of currencyMatches) {
    const rawNum = m[1].replace(/,/g, '');
    let val = parseFloat(rawNum);
    if (isNaN(val)) continue;

    const multiplier = (m[2] || '').toLowerCase();
    if (multiplier.startsWith('l') || multiplier.includes('లక్ష')) val *= 100000;
    else if (multiplier.startsWith('c') || multiplier.includes('కోట్')) val *= 10000000;
    else if (multiplier === 'k' || multiplier.includes('thousand') || multiplier.includes('వేలు')) val *= 1000;

    const tf = m[3] ? m[3].toLowerCase() : undefined;
    const rawMatched = m[0].trim();
    if (val <= 0 && rawMatched.length === 0) continue;

    let role: NumericRole = 'UNKNOWN';

    // Evidence / inspection context
    if (
      qLower.includes('chromadb') ||
      qLower.includes('retrieval evidence') ||
      qLower.includes('chunk') ||
      qLower.includes('similarity') ||
      qLower.includes('score') ||
      qLower.includes('distance') ||
      qLower.includes('exact text') ||
      qLower.includes('ఆధారాలు')
    ) {
      role = 'SEARCH_TARGET_VALUE';
    }
    // Provenance / derivation context
    else if (
      qLower.includes('where did') ||
      qLower.includes('how did you calculate') ||
      qLower.includes('how was') ||
      qLower.includes('provenance') ||
      qLower.includes('formula') ||
      qLower.includes('breakdown of') ||
      qLower.includes('source of') ||
      qLower.includes('ఎలా లెక్కించారు') ||
      qLower.includes('ఎక్కడి నుండి')
    ) {
      role = 'PREVIOUS_ANSWER_VALUE';
    }
    // Comparison context
    else if (
      qLower.includes('compare') ||
      qLower.includes('versus') ||
      qLower.includes(' vs ') ||
      qLower.includes('difference between') ||
      qLower.includes('పోల్చండి') ||
      qLower.includes('తేడా')
    ) {
      role = 'COMPARISON_VALUE';
    }
    // Loan / repayment context
    else if (
      qLower.includes('loan') ||
      qLower.includes('borrow') ||
      qLower.includes('emi') ||
      qLower.includes('repay') ||
      qLower.includes('రుణం') ||
      qLower.includes('అప్పు')
    ) {
      role = 'LOAN_AMOUNT';
    }
    // Target profit / capacity context
    else if (
      qLower.includes('target') ||
      qLower.includes('make a profit') ||
      qLower.includes('earn') ||
      qLower.includes('how many') ||
      qLower.includes('profit of') ||
      qLower.includes('లాభం') ||
      qLower.includes('సంపాదించడానికి')
    ) {
      role = 'TARGET_PROFIT';
    }

    if (val >= 100 || role !== 'UNKNOWN') {
      extracted.push({
        raw: rawMatched,
        value: val,
        role,
        timeframe: tf,
      });
    }
  }

  // Unit count input parameters (e.g., "10 cows", "5 buffaloes", "4 looms", "1000 birds")
  const unitMatches = [
    ...qLower.matchAll(/\b(\d+)\s*(cows?|buffaloes?|birds?|looms?|hens?|ఆవులు|బర్రెలు|మగ్గాలు|కోళ్లు)\b/gi)
  ];

  for (const um of unitMatches) {
    const val = parseInt(um[1], 10);
    if (!isNaN(val)) {
      extracted.push({
        raw: um[0],
        value: val,
        role: 'INPUT_PARAMETER',
        unit: um[2],
      });
    }
  }

  return extracted;
}

export function detectBusinessDomain(
  query: string = '',
  history?: { role: string; content: string }[],
  fallbackCategory: string = 'Dairy Farming'
): BusinessDomain {
  const checkText = (text: string): BusinessDomain | null => {
    if (!text) return null;
    const t = text.toLowerCase();

    // Handloom / Weaving
    if (
      [
        'handloom', 'weaving', 'powerloom', 'loom', 'looms', 'saree', 'sarees', 'ikat',
        'pochampally', 'yarn', 'fabric', 'textile', 'textiles', 'weaver', 'weavers',
        'చేనేత', 'మగ్గం', 'మగ్గాలు', 'చీరలు', 'నూలు', 'వస్త్రాలు', 'పవర్లూమ్', 'हथकरघा'
      ].some((w) => t.includes(w))
    ) {
      return 'handloom_weaving';
    }

    // Dairy Farming
    if (
      [
        'dairy', 'diary', 'cow', 'cows', 'buffalo', 'buffaloes', 'milch', 'milk', 'fodder', 'cattle',
        'butter', 'ghee', 'curd', 'lactation', 'dairy farm', 'diary farm', 'పాడి', 'ఆవు', 'ఆవులు', 'బర్రె',
        'గేదె', 'గేదెలు', 'పాలు', 'దాణా', 'పశువులు', 'డెయిరీ', 'దుగ్ధ'
      ].some((w) => t.includes(w))
    ) {
      return 'dairy_farming';
    }

    // Retail / Kirana Shop
    if (
      [
        'kirana', 'grocery', 'provision', 'shop', 'retail', 'store', 'supermarket', 'general store',
        'fmcg', 'కిరాణా', 'షాప్', 'దుకాణం', 'జనరల్ స్టోర్', 'స్టోర్', 'కిరాణా దుకాణం'
      ].some((w) => t.includes(w))
    ) {
      return 'retail_shop';
    }

    // Poultry Farming
    if (
      [
        'poultry', 'chicken', 'broiler', 'layers', 'egg', 'eggs', 'bird', 'birds', 'natukodi',
        'desi murgi', 'hatchery', 'కోళ్లు', 'పౌల్ట్రీ', 'కోడి', 'గుడ్లు', 'నాటు కోడి'
      ].some((w) => t.includes(w))
    ) {
      return 'poultry_farming';
    }

    // Tailoring & Boutique
    if (
      [
        'tailor', 'tailoring', 'boutique', 'stitching', 'garment', 'garments', 'blouse', 'embroidery',
        'maggam work', 'sewing', 'టైలరింగ్', 'కుట్లు', 'బోటిక్', 'రవికె', 'మగ్గం వర్క్'
      ].some((w) => t.includes(w))
    ) {
      return 'tailoring_garments';
    }

    // Agri-Processing & Milling
    if (
      [
        'flour mill', 'spice mill', 'rice mill', 'chilli powder', 'milling', 'processing mill',
        'పిండి మిల్లు', 'మిర్చి మిల్లు', 'వరి మిల్లు', 'మసాలా మిల్లు'
      ].some((w) => t.includes(w))
    ) {
      return 'agri_processing';
    }

    // Agriculture / Crops
    if (
      [
        'crop', 'farming', 'cotton', 'paddy', 'chilli', 'turmeric', 'horticulture', 'seeds',
        'fertilizer', 'pesticide', 'harvest', 'వ్యవసాయం', 'పంట', 'పత్తి', 'వరి', 'మిర్చి', 'పసుపు'
      ].some((w) => t.includes(w))
    ) {
      return 'agriculture_crop';
    }

    return null;
  };

  // Priority 1: Current query
  if (query) {
    const dom = checkText(query);
    if (dom) return dom;
  }

  // Priority 2: Recent user messages in history
  if (history && history.length > 0) {
    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i];
      if (msg.role === 'user' && msg.content) {
        const dom = checkText(msg.content);
        if (dom) return dom;
      }
    }
  }

  // Priority 3: Fallback category
  const fbDom = checkText(fallbackCategory);
  if (fbDom) return fbDom;

  const fbLower = fallbackCategory.toLowerCase();
  if (fbLower.includes('weave') || fbLower.includes('handloom') || fbLower.includes('textile')) return 'handloom_weaving';
  if (fbLower.includes('dairy') || fbLower.includes('milk') || fbLower.includes('cow')) return 'dairy_farming';
  if (fbLower.includes('kirana') || fbLower.includes('grocery') || fbLower.includes('retail') || fbLower.includes('shop')) return 'retail_shop';
  if (fbLower.includes('poultry') || fbLower.includes('chicken') || fbLower.includes('bird')) return 'poultry_farming';
  if (fbLower.includes('tailor') || fbLower.includes('garment')) return 'tailoring_garments';
  if (fbLower.includes('mill') || fbLower.includes('agri')) return 'agri_processing';

  return 'general_enterprise';
}

export function calculateForwardUnitProfit(
  category: string,
  units: number
): ForwardUnitProfitResult {
  const catLower = (category || '').toLowerCase();
  const count = Math.max(1, units || 1);

  if (catLower.includes('dairy') || catLower.includes('పాడి') || catLower.includes('cow') || catLower.includes('milk')) {
    const annualRev = count * 165000;
    const annualOpex = count * 75000;
    const annualNet = count * 90000;
    const monthlyNet = annualNet / 12;
    const totalCapex = count * 75000;

    return {
      category: 'Dairy Farming',
      units: count,
      unitNameEn: count === 1 ? 'milch cow' : 'milch cows',
      unitNameTe: count === 1 ? 'పాడి ఆవు' : 'పాడి ఆవులు',
      annualRevenue: annualRev,
      annualOpex,
      annualNetProfit: annualNet,
      monthlyNetProfit: monthlyNet,
      totalCapex,
      marginRequired: totalCapex * 0.1,
      loanEligible: totalCapex * 0.9,
    };
  } else if (catLower.includes('poultry') || catLower.includes('కోడి') || catLower.includes('chicken')) {
    const annualRev = count * 600;
    const annualOpex = count * 420;
    const annualNet = count * 180;
    const monthlyNet = annualNet / 12;
    const totalCapex = count * 250;

    return {
      category: 'Poultry Farming',
      units: count,
      unitNameEn: count === 1 ? 'broiler bird' : 'broiler birds',
      unitNameTe: count === 1 ? 'పౌల్ట్రీ పక్షి' : 'పౌల్ట్రీ పక్షులు',
      annualRevenue: annualRev,
      annualOpex,
      annualNetProfit: annualNet,
      monthlyNetProfit: monthlyNet,
      totalCapex,
      marginRequired: totalCapex * 0.1,
      loanEligible: totalCapex * 0.9,
    };
  } else if (catLower.includes('weaving') || catLower.includes('handloom') || catLower.includes('చేనేత')) {
    const annualRev = count * 240000;
    const annualOpex = count * 150000;
    const annualNet = count * 90000;
    const monthlyNet = annualNet / 12;
    const totalCapex = count * 50000;

    return {
      category: 'Handloom & Weaving',
      units: count,
      unitNameEn: count === 1 ? 'handloom' : 'handlooms',
      unitNameTe: count === 1 ? 'చేనేత మగ్గం' : 'చేనేత మగ్గాలు',
      annualRevenue: annualRev,
      annualOpex,
      annualNetProfit: annualNet,
      monthlyNetProfit: monthlyNet,
      totalCapex,
      marginRequired: totalCapex * 0.1,
      loanEligible: totalCapex * 0.9,
    };
  } else {
    const annualRev = count * 500000;
    const annualOpex = count * 400000;
    const annualNet = count * 100000;
    const monthlyNet = annualNet / 12;
    const totalCapex = count * 125000;

    return {
      category: category || 'Rural Enterprise',
      units: count,
      unitNameEn: 'enterprise units',
      unitNameTe: 'వ్యాపార యూనిట్లు',
      annualRevenue: annualRev,
      annualOpex,
      annualNetProfit: annualNet,
      monthlyNetProfit: monthlyNet,
      totalCapex,
      marginRequired: totalCapex * 0.1,
      loanEligible: totalCapex * 0.9,
    };
  }
}

export function classifyQueryIntent(
  query: string,
  history?: { role: string; content: string }[],
  fallbackCategory: string = 'Dairy Farming'
): ParsedQueryIntent {
  const domain = detectBusinessDomain(query, history, fallbackCategory);

  if (!query) {
    return {
      intent: 'general_advisory',
      targetAmount: null,
      isNumerical: false,
      entity: null,
      timeframe: 'annual',
      domain,
      numericRoles: [],
      primaryRole: 'UNKNOWN',
      inputUnits: null,
    };
  }

  const q = query.toLowerCase().trim();
  const extractedNumbers = extractNumbersWithRoles(query);
  const targetAmt = parseTargetAmount(q);

  const isMonthly = ['month', 'monthly', 'నెల', 'నెలకు', 'మాసం', 'प्रति माह'].some((w) => q.includes(w));
  const isDaily = ['day', 'daily', 'రోజు', 'రోజుకు', 'రోజూ', 'प्रति दिन'].some((w) => q.includes(w));
  const timeframe = isDaily ? 'daily' : isMonthly ? 'monthly' : 'annual';

  // 0. Retrieval Evidence / ChromaDB Provenance Inspection (HIGHEST PRIORITY)
  const isRetrievalEvidence = [
    'chromadb retrieval evidence', 'retrieval evidence', 'chromadb evidence', 'retrieval provenance',
    'chromadb collection', 'collection name', 'chunks retrieved', 'number of chunks', 'retrieved document',
    'retrieved chunk', 'document/chunk ids', 'similarity scores', 'similarity distances', 'similarity score',
    'similarity distance', 'exact retrieved text', 'show me the chromadb', 'show me the retrieval',
    'chroma retrieval', 'vector store evidence', 'vector database evidence', 'retrieval metadata', 'chromadb chunks',
    'రిట్రీవల్ ఆధారాలు', 'క్రోమాడీబీ ఆధారాలు', 'రిట్రీవల్ వివరాలు', 'సారూప్యత స్కోర్లు', 'చంక్స్', 'డాక్యుమెంట్ ఐడీలు'
  ].some((w) => q.includes(w));

  // 0b. Provenance / Derivation Query (Where did figures come from?)
  const isProvenance = [
    'where did', 'how did you calculate', 'how was that calculated', 'provenance',
    'derivation of', 'show formula', 'show derivation', 'source of ₹', 'source of rs',
    'where did the', 'how do you get', 'how did you arrive',
    'ఎలా లెక్కించారు', 'ఎక్కడి నుండి వచ్చింది', 'లెక్కల మూలం', 'సూత్రం చూపించు'
  ].some((w) => q.includes(w));

  // 0c. Translation Query
  const isTranslation = [
    'translate your previous', 'translate this to telugu', 'translate to telugu', 'translate in telugu',
    'translate to english', 'translate your answer', 'తెలుగులోకి అనువదించు', 'ఇంగ్లీషులోకి అనువదించు'
  ].some((w) => q.includes(w));

  // 0d. Comparison Query
  const isComparison = [
    'compare', 'difference between', 'versus', ' vs ', 'which is better',
    'పోల్చండి', 'తేడా ఏమిటి', 'పోలిక'
  ].some((w) => q.includes(w));

  // 0e. Forward Unit Calculation (e.g. "Calculate profit from 10 cows", "If I have 10 cows")
  const inputParam = extractedNumbers.find((n) => n.role === 'INPUT_PARAMETER');
  const isForwardUnit = Boolean(inputParam) || [
    'if i have', 'with 10 cows', 'with 5 cows', 'from 10 cows', 'from 5 cows', 'profit from 10',
    'profit from 5', 'calculate profit from', '10 ఆవులు ఉంటే', '5 ఆవులు ఉంటే', '10 ఆవుల నుండి'
  ].some((w) => q.includes(w));

  // 1. Location Selection / Business Location Analysis (HIGH PRIORITY)
  const isLocationSelection = [
    'best areas', 'best area', 'which areas', 'which area', 'areas in', 'area in',
    'where should i establish', 'where can i establish', 'where should i open', 'where can i open',
    'where should i start', 'where to establish', 'where to open', 'where to set up', 'where to start',
    'where to setup', 'where to locate', 'where can i start', 'where can i setup', 'where to build',
    'suggest me places', 'suggest places', 'suggest some places', 'which localities', 'which locality',
    'which location', 'best locations', 'best location', 'best localities', 'best place', 'best places',
    'good location', 'good place', 'profitable location', 'where i can get great profits',
    'where if i establish', 'which area is better', 'suitable location', 'suitable area', 'cluster',
    'location for my', 'place for my', 'area for my', 'localities can give', 'places where',
    'best suitable', 'suitable to open', 'suitable to start', 'where in', 'places to establish',
    'places in', 'locations in', 'mandals in', 'villages in', 'towns in',
    'ఎక్కడ ప్రారంభించాలి', 'ఎక్కడ పెట్టాలి', 'ఎక్కడ స్థాపించాలి', 'ఏ ప్రాంతం', 'ఏ ప్రాంతాలు', 'ప్రాంతాలు', 'ఏ ప్రదేశాలు',
    'స్థలాలు', 'మంచి ప్రదేశం', 'లొకేషన్', 'ఏ ఊరు', 'ప్రదేశం', 'స్థలం ఎంపిక', 'ఏ ఏరియా', 'ప్రదేశాలు',
    'అనువైన ప్రాంతాలు', 'అనువైన స్థలాలు', 'అనువైన స్థలం', 'మంచి ప్రాంతం'
  ].some((w) => q.includes(w));

  // 1b. Market / Consumer Demand Questions
  const isMarketDemand = [
    'demand for', 'milk demand', 'market demand', 'customer demand', 'buying demand', 'demand in',
    'how much demand', 'consumption in', 'off-take in', 'offtake in', 'buyers for', 'market reach',
    'గిరాకీ', 'డిమాండ్', 'కొనుగోలుదారులు'
  ].some((w) => q.includes(w));

  // 1c. Competitor / Density Questions
  const isCompetitor = [
    'competition', 'competitors', 'competing', 'other shops', 'other farms', 'other dairies',
    'market competition', 'density of', 'పోటీ', 'పోటీదారులు'
  ].some((w) => q.includes(w));

  // 1d. Risk Assessment Questions
  const isRisks = [
    'major risks', 'what are the risks', 'key risks', 'risk in', 'risks for', 'challenges in',
    'threats to', 'drawbacks of', 'నష్టభయం', 'ప్రమాదాలు', 'సవాళ్లు'
  ].some((w) => q.includes(w));

  // 2. Feed / Raw Material / Input Sourcing
  const isFeed = [
    'feed', 'fodder', 'raw material', 'input cost', 'cost of feed', 'yarn', 'fabric', 'daana', 'దాణా',
    'పచ్చిగడ్డి', 'ముడిసరుకు', 'తక్కువ ఖర్చు', 'నూలు', 'చౌకగా', 'buy feed', 'cheaper', 'feed cheaply', 'cheap feed'
  ].some((w) => q.includes(w));

  // 3. Investment Decision
  const isInvestmentDecision = !isFeed && [
    'should i buy', 'can i buy', 'want to buy', 'is that a good investment', 'good investment',
    'is it safe to buy', 'safe for me to buy', 'is it safe to invest', 'worth buying', 'worth investing',
    'air conditioner', 'buy an ac', 'buy a machine', 'buy equipment', 'కొనవచ్చా', 'మంచి పెట్టుబడేనా'
  ].some((w) => q.includes(w));

  // 4. Quantity / Capacity calculation
  const isQuantityCalc = [
    'how many', 'how much animal', 'number of', 'ఎన్ని ఆవులు', 'ఎన్ని బర్రెలు', 'ఎన్ని కోళ్లు', 'ఎన్ని మగ్గాలు',
    'ఎన్ని', 'కౌస్', 'ఆవులు కావాలి', 'బర్రెలు కావాలి', 'how many cows', 'how many buffalo', 'how many birds',
    'how many looms', 'how much capacity', 'cows do i need', 'buffaloes do i need'
  ].some((w) => q.includes(w));

  // 5. Profitability inquiry
  const isProfitInquiry = [
    'how much profit', 'my profit', 'expected profit', 'profit margin', 'what profit',
    'net profit', 'income of', 'earning', 'earnings', 'లాభం ఎంత', 'నికర లాభం', 'ఎంత లాభం',
    'సంపాదన', 'मुनाफा'
  ].some((w) => q.includes(w));

  const isBreakEven = [
    'break even', 'break-even', 'breakeven', 'నో లాస్ నో ప్రాఫిట్', 'బ్రేక్ ఈవెన్', 'ఖర్చులు రాబట్టడం'
  ].some((w) => q.includes(w));

  const isVolumeTarget = [
    'how much milk', 'milk do i need to sell', 'litres', 'how much sales', 'volume to sell', 'how much turnover',
    'ఎంత పాలు', 'ఎన్ని లీటర్లు', 'ఎంత అమ్మాలి', 'అమ్మకాలు ఎంత చేయాలి'
  ].some((w) => q.includes(w));

  const isExpansionCalc = [
    'expand', 'expansion', 'expanding', 'next village', 'scale up', 'capital do i need',
    'cost to expand', 'investment to expand', 'how much capital', 'విస్తరణ ఖర్చు',
    'పెట్టుబడి ఎంత కావాలి', 'మరో 2 ఆవులు కొనడానికి', 'ఎంత పెట్టుబడి', 'విస్తరించడానికి', 'విస్తరణ'
  ].some((w) => q.includes(w));

  const isPricing = [
    'pricing', 'selling price', 'rate per', 'cost per', 'charge', 'milk price', 'price in', 'prevailing price',
    'ధర', 'ఎంత అమ్మాలి', 'ధర నిర్ణయం', 'రేటు', 'కిలో ధర', 'పాల ధర'
  ].some((w) => q.includes(w));

  const isSchemes = [
    'scheme', 'subsidy', 'subsidies', 'government', 'mudra', 'pmegp', 'nbcfdc', 'vishwakarma', 'stand-up',
    'సబ్సిడీ', 'పథకం', 'ప్రభుత్వ పథకాలు', 'రాయితీ'
  ].some((w) => q.includes(w));

  const isSummerHeat = [
    'summer', 'heat', 'hot', 'yield in summer', 'temperature', 'weather', 'lean season',
    'ఎండ', 'వేసవి', 'దిగుబడి'
  ].some((w) => q.includes(w));

  const isCashFlow = [
    'cash flow', 'low sales', 'lean month', 'off-season', 'working capital', 'udhaari', 'credit', 'బాకీలు',
    'నగదు', 'తక్కువ అమ్మకాలు', 'ఖర్చులు'
  ].some((w) => q.includes(w));

  let intent: ParsedQueryIntent['intent'] = 'general_advisory';
  let isNumerical = false;
  let primaryRole: NumericRole = 'UNKNOWN';
  let inputUnits: number | null = null;

  if (inputParam) {
    inputUnits = inputParam.value;
  }

  // Hierarchy Resolution
  if (isRetrievalEvidence) {
    intent = 'retrieval_evidence_inspection';
    primaryRole = 'SEARCH_TARGET_VALUE';
    isNumerical = false;
  } else if (isProvenance) {
    intent = 'provenance_query';
    primaryRole = 'PREVIOUS_ANSWER_VALUE';
    isNumerical = false;
  } else if (isTranslation) {
    intent = 'translation_query';
    isNumerical = false;
  } else if (isComparison) {
    intent = 'comparison_query';
    primaryRole = 'COMPARISON_VALUE';
    isNumerical = false;
  } else if (isForwardUnit && (inputUnits !== null || isProfitInquiry)) {
    intent = 'forward_unit_calculation';
    primaryRole = 'INPUT_PARAMETER';
    isNumerical = true;
  } else if (isLocationSelection) {
    intent = 'location_selection';
    isNumerical = false;
  } else if (isMarketDemand) {
    intent = 'market_demand';
    isNumerical = false;
  } else if (isCompetitor) {
    intent = 'competitor_analysis';
    isNumerical = false;
  } else if (isRisks) {
    intent = 'risk_assessment';
    isNumerical = false;
  } else if (isInvestmentDecision) {
    intent = 'investment_decision';
    isNumerical = false;
  } else if (isQuantityCalc && (targetAmt || isProfitInquiry)) {
    intent = 'capacity_calculation';
    primaryRole = 'TARGET_PROFIT';
    isNumerical = true;
  } else if (isVolumeTarget && targetAmt) {
    intent = 'volume_target_calculation';
    isNumerical = true;
  } else if (isBreakEven) {
    intent = 'break_even_calculation';
    isNumerical = true;
  } else if (isExpansionCalc) {
    intent = 'expansion_capital_calculation';
    isNumerical = true;
  } else if (isProfitInquiry && targetAmt) {
    intent = 'capacity_calculation';
    primaryRole = 'TARGET_PROFIT';
    isNumerical = true;
  } else if (isProfitInquiry) {
    intent = 'profitability_calculation';
    isNumerical = true;
  } else if (isFeed) {
    intent = 'raw_material_optimization';
    isNumerical = false;
  } else if (isPricing) {
    intent = 'pricing_guidance';
    isNumerical = false;
  } else if (isSchemes) {
    intent = 'government_schemes';
    isNumerical = false;
  } else if (isSummerHeat) {
    intent = 'seasonal_operational_advice';
    isNumerical = false;
  } else if (isCashFlow) {
    intent = 'cash_flow_optimization';
    isNumerical = false;
  } else if (targetAmt) {
    // Only treat raw targetAmt as capacity target if not an evidence/provenance query
    intent = 'capacity_calculation';
    primaryRole = 'TARGET_PROFIT';
    isNumerical = true;
  }

  let entity: ParsedQueryIntent['entity'] = null;
  if (['cow', 'cows', 'ఆవు', 'ఆవులు'].some((w) => q.includes(w))) entity = 'cow';
  else if (['buffalo', 'buffaloes', 'బర్రె', 'గేదె', 'బర్రెలు'].some((w) => q.includes(w))) entity = 'buffalo';
  else if (['bird', 'birds', 'hen', 'hens', 'chicken', 'కోళ్లు', 'కోడి'].some((w) => q.includes(w))) entity = 'bird';
  else if (['loom', 'looms', 'మగ్గం', 'మగ్గాలు'].some((w) => q.includes(w))) entity = 'loom';
  else if (['milk', 'litre', 'litres', 'పాలు', 'లీటర్లు'].some((w) => q.includes(w))) entity = 'milk_litre';

  return {
    intent,
    targetAmount: targetAmt,
    isNumerical,
    entity,
    timeframe,
    domain,
    numericRoles: extractedNumbers,
    primaryRole,
    inputUnits,
  };
}

export function calculateCapacityForTargetProfit(
  category: string,
  targetProfit: number,
  timeframe: 'annual' | 'monthly' | 'daily' = 'annual'
): CapacityCalculationResult {
  const catLower = (category || '').toLowerCase();
  const target = targetProfit && targetProfit > 0 ? targetProfit : 500000;
  const annualTarget = timeframe === 'monthly' ? target * 12 : target;

  if (catLower.includes('dairy') || catLower.includes('పాడి') || catLower.includes('cow') || catLower.includes('milk')) {
    const yieldPerDay = 10;
    const milkingDays = 300;
    const annualLitresPerCow = yieldPerDay * milkingDays; // 3,000 L
    const sellingPricePerL = 55;
    const annualRevPerCow = annualLitresPerCow * sellingPricePerL; // 1,65,000
    const annualOpexPerCow = 75000; // 75,000
    const netProfitPerCowAnnual = annualRevPerCow - annualOpexPerCow; // 90,000
    const netProfitPerCowMonthly = netProfitPerCowAnnual / 12; // 7,500

    const exactUnits = annualTarget / netProfitPerCowAnnual;
    const recommendedUnits = Math.max(1, Math.ceil(exactUnits));
    const capexPerUnit = 75000;
    const totalProjectCost = recommendedUnits * capexPerUnit;

    return {
      category: 'Dairy Farming',
      unitNameEn: 'milch cows',
      unitNameTe: 'పాడి ఆవులు',
      targetProfit: target,
      annualTargetProfit: annualTarget,
      exactUnitsNeeded: Math.round(exactUnits * 100) / 100,
      recommendedUnits,
      unitMetrics: {
        dailyYieldLitres: yieldPerDay,
        milkingDaysPerYear: milkingDays,
        annualProductionLitres: annualLitresPerCow,
        sellingPricePerLitre: sellingPricePerL,
        annualRevenuePerUnit: annualRevPerCow,
        annualOpexPerUnit: annualOpexPerCow,
        netProfitPerUnitAnnual: netProfitPerCowAnnual,
        netProfitPerUnitMonthly: netProfitPerCowMonthly,
        capexPerUnit,
      },
      financialOutlay: {
        totalProjectCost,
        promoterMarginRequired: totalProjectCost * 0.1,
        bankLoanEligible: totalProjectCost * 0.9,
      },
      assumptions: [
        'Average milk yield of 10 Litres/day per crossbred cow over a 300-day lactation cycle.',
        'Blended farm-gate & direct retail milk selling price of ₹55 per Litre.',
        'Annual operating cost of ~₹75,000 per cow (Feed & Fodder 55%, Vet/AI 10%, Labor 20%, Utilities 15%).',
        'Net annual profit of approximately ₹90,000 per milch cow (₹7,500/month).',
      ],
      assumptionsTe: [
        'ఒక సంకరజాతి పాడి ఆవు 300 రోజుల పాల కాలంలో రోజుకు సగటున 10 లీటర్ల దిగుబడిని ఇస్తుంది.',
        'స్థానిక మండి మరియు ప్రత్యక్ష రిటైల్ విక్రయాల సగటు ధర లీటరుకు ₹55.',
        'ఒక ఆవుకు వార్షిక నిర్వహణ ఖర్చు దాదాపు ₹75,000 (దాణా & పచ్చిగడ్డి 55%, పశువైద్యం 10%, శ్రమ 20%, రవాణా/విద్యుత్ 15%).',
        'ప్రతి పాడి ఆవు నుండి సంవత్సరానికి దాదాపు ₹90,000 (నెలకు ₹7,500) నికర లాభం లభిస్తుంది.',
      ],
    };
  } else if (catLower.includes('poultry') || catLower.includes('కోడి') || catLower.includes('chicken')) {
    const netProfitPerBirdAnnual = 180;
    const exactUnits = annualTarget / netProfitPerBirdAnnual;
    const recommendedUnits = Math.max(100, Math.ceil(exactUnits / 50) * 50);
    const capexPerBird = 250;
    const totalProjectCost = recommendedUnits * capexPerBird;

    return {
      category: 'Poultry Farming',
      unitNameEn: 'broiler birds (shed capacity)',
      unitNameTe: 'పౌల్ట్రీ పక్షుల షెడ్ సామర్థ్యం',
      targetProfit: target,
      annualTargetProfit: annualTarget,
      exactUnitsNeeded: Math.round(exactUnits * 10) / 10,
      recommendedUnits,
      unitMetrics: {
        batchesPerYear: 6,
        netProfitPerBirdBatch: 30,
        netProfitPerUnitAnnual: netProfitPerBirdAnnual,
        netProfitPerUnitMonthly: netProfitPerBirdAnnual / 12,
        capexPerUnit: capexPerBird,
      },
      financialOutlay: {
        totalProjectCost,
        promoterMarginRequired: totalProjectCost * 0.1,
        bankLoanEligible: totalProjectCost * 0.9,
      },
      assumptions: [
        '6 rearing cycles per year (40-45 day batch cycle).',
        'Net profit of ₹30 per bird per batch (~₹180 per capacity slot annually).',
        'Shed infrastructure capex of ₹250 per bird capacity.',
      ],
      assumptionsTe: [
        'సంవత్సరానికి 6 బ్యాచ్‌ల పెంపకం చక్రం (40-45 రోజులు).',
        'ఒక పక్షికి బ్యాచ్‌కు ₹30 నికర లాభం (వార్షికంగా ₹180).',
        'షెడ్ మౌలిక సదుపాయాల వ్యయం ఒక్కో పక్షికి ₹250.',
      ],
    };
  } else if (catLower.includes('weaving') || catLower.includes('handloom') || catLower.includes('చేనేత')) {
    const netProfitPerLoomAnnual = 90000;
    const exactUnits = annualTarget / netProfitPerLoomAnnual;
    const recommendedUnits = Math.max(1, Math.ceil(exactUnits));
    const capexPerLoom = 50000;
    const totalProjectCost = recommendedUnits * capexPerLoom;

    return {
      category: 'Handloom & Weaving',
      unitNameEn: 'traditional handlooms',
      unitNameTe: 'చేనేత మగ్గాలు',
      targetProfit: target,
      annualTargetProfit: annualTarget,
      exactUnitsNeeded: Math.round(exactUnits * 100) / 100,
      recommendedUnits,
      unitMetrics: {
        sareesPerMonth: 3,
        annualSareesPerLoom: 36,
        netProfitPerSaree: 2500,
        netProfitPerUnitAnnual: netProfitPerLoomAnnual,
        netProfitPerUnitMonthly: netProfitPerLoomAnnual / 12,
        capexPerUnit: capexPerLoom,
      },
      financialOutlay: {
        totalProjectCost,
        promoterMarginRequired: totalProjectCost * 0.1,
        bankLoanEligible: totalProjectCost * 0.9,
      },
      assumptions: [
        'Production of 3 traditional sarees per month per active loom (36 sarees/year).',
        'Net profit margin of ₹2,500 per saree after yarn, dyes, and weaving labor.',
        'Annual net profit of ~₹90,000 per handloom.',
      ],
      assumptionsTe: [
        'ఒక మగ్గంపై నెలకు 3 చేనేత చీరల ఉత్పత్తి (సంవత్సరానికి 36 చీరలు).',
        'నూలు, రంగులు మరియు శ్రమ ఖర్చులు పోను చీరకు ₹2,500 నికర లాభం.',
        'ఒక మగ్గం నుండి వార్షిక నికర లాభం సుమారు ₹90,000.',
      ],
    };
  } else {
    const netMarginPct = 15;
    const annualTurnoverNeeded = annualTarget / (netMarginPct / 100);
    const monthlyTurnoverNeeded = annualTurnoverNeeded / 12;
    const dailyTurnoverNeeded = annualTurnoverNeeded / 365;

    return {
      category: category || 'Rural Enterprise',
      unitNameEn: 'gross annual sales turnover',
      unitNameTe: 'వార్షిక స్థూల అమ్మకాల టర్నోవర్',
      targetProfit: target,
      annualTargetProfit: annualTarget,
      exactUnitsNeeded: Math.round(annualTurnoverNeeded),
      recommendedUnits: Math.round(annualTurnoverNeeded),
      unitMetrics: {
        netMarginPercentage: netMarginPct,
        annualTurnoverNeeded,
        monthlyTurnoverNeeded,
        dailyTurnoverNeeded,
        netProfitPerUnitAnnual: annualTarget,
        netProfitPerUnitMonthly: annualTarget / 12,
        capexPerUnit: annualTurnoverNeeded * 0.25,
      },
      financialOutlay: {
        totalProjectCost: annualTurnoverNeeded * 0.25,
        promoterMarginRequired: (annualTurnoverNeeded * 0.25) * 0.1,
        bankLoanEligible: (annualTurnoverNeeded * 0.25) * 0.9,
      },
      assumptions: [
        `Realistic net operating profit margin of ${netMarginPct}% for rural retail/services.`,
        `Daily gross sales target of ₹${Math.round(dailyTurnoverNeeded).toLocaleString('en-IN')} (₹${Math.round(monthlyTurnoverNeeded).toLocaleString('en-IN')}/month).`,
      ],
      assumptionsTe: [
        `గ్రామీణ వ్యాపారాలకు వాస్తవిక నికర లాభ మార్జిన్ ${netMarginPct}%.`,
        `రోజువారీ సగటు అమ్మకాల లక్ష్యం ₹${Math.round(dailyTurnoverNeeded).toLocaleString('en-IN')} (నెలకు ₹${Math.round(monthlyTurnoverNeeded).toLocaleString('en-IN')}).`,
      ],
    };
  }
}
