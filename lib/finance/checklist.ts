/**
 * RuralCred Advisor — Contextual Missing Information Checklist Engine.
 * Dynamically determines mandatory vs optional inputs based on business category,
 * ticket size, and operational requirements.
 */

export type ChecklistCategory =
  | 'business'
  | 'location'
  | 'finance'
  | 'operations'
  | 'documents';

export interface ChecklistItem {
  id: string;
  category: ChecklistCategory;
  categoryLabel: string;
  categoryLabelTe: string;
  field: string;
  label: string;
  labelTe: string;
  isRequired: boolean;
  isAvailable: boolean;
  currentValue?: any;
  promptMessage: string;
  promptMessageTe: string;
  recommendationTip?: string;
  recommendationTipTe?: string;
}

export interface MissingInformationResult {
  isComplete: boolean;
  totalItemsCount: number;
  availableItemsCount: number;
  missingRequiredCount: number;
  completionPercentage: number;
  availableItems: ChecklistItem[];
  missingRequiredItems: ChecklistItem[];
  optionalMissingItems: ChecklistItem[];
  byCategory: Record<ChecklistCategory, {
    label: string;
    labelTe: string;
    items: ChecklistItem[];
    isComplete: boolean;
  }>;
}

export interface BusinessInputContext {
  name?: string;
  businessName?: string;
  category?: string;
  location?: string;
  marginCapital?: number;
  projectCost?: number;
  loanAmount?: number;
  monthlyRevenueEstimate?: number;
  monthlyExpenseEstimate?: number;
  targetUnits?: number;
  hasMachineryQuotation?: boolean;
  hasLandOrLeaseAgreement?: boolean;
  hasAadhaarVerified?: boolean;
  hasUdyamRegistration?: boolean;
  hasElectricityConnection?: boolean;
}

/**
 * Contextually evaluates what information is complete vs missing for a rural enterprise.
 */
export function evaluateMissingInformation(
  ctx: BusinessInputContext
): MissingInformationResult {
  const category = (ctx.category || '').toLowerCase();
  const isDairy = category.includes('dairy') || category.includes('milk') || category.includes('cow');
  const isWeaving = category.includes('weaving') || category.includes('handloom') || category.includes('saree');
  const isPoultry = category.includes('poultry') || category.includes('bird') || category.includes('chicken');
  const isRetail = category.includes('kirana') || category.includes('retail') || category.includes('shop');
  const isManufacturing = category.includes('milling') || category.includes('agri') || category.includes('tailor');

  const items: ChecklistItem[] = [];

  // 1. BUSINESS PROFILE
  items.push({
    id: 'biz_type',
    category: 'business',
    categoryLabel: 'Business Profile',
    categoryLabelTe: 'వ్యాపార ప్రొఫైల్',
    field: 'category',
    label: 'Business Trade / Category',
    labelTe: 'వ్యాపార రంగం / కేటగిరీ',
    isRequired: true,
    isAvailable: Boolean(ctx.category && ctx.category.trim().length > 0),
    currentValue: ctx.category || undefined,
    promptMessage: 'Specify your primary rural enterprise trade (e.g. Dairy, Handloom, Kirana).',
    promptMessageTe: 'మీ వ్యాపార రంగాన్ని ఎంచుకోండి (ఉదా: పాడి పరిశ్రమ, చేనేత, కిరాణా).',
  });

  items.push({
    id: 'biz_name',
    category: 'business',
    categoryLabel: 'Business Profile',
    categoryLabelTe: 'వ్యాపార ప్రొఫైల్',
    field: 'businessName',
    label: 'Enterprise / Unit Name',
    labelTe: 'వ్యాపార సంస్థ పేరు',
    isRequired: true,
    isAvailable: Boolean(ctx.businessName && ctx.businessName.trim().length > 0),
    currentValue: ctx.businessName || undefined,
    promptMessage: 'Enter the registered or proposed name for your enterprise.',
    promptMessageTe: 'మీ వ్యాపార సంస్థ పేరును నమోదు చేయండి.',
  });

  // 2. LOCATION INTELLIGENCE
  items.push({
    id: 'loc_district',
    category: 'location',
    categoryLabel: 'Location & Market',
    categoryLabelTe: 'స్థలం & మార్కెట్ వివరాలు',
    field: 'location',
    label: 'District & Village Cluster',
    labelTe: 'జిల్లా మరియు గ్రామ ప్రాంతం',
    isRequired: true,
    isAvailable: Boolean(ctx.location && ctx.location.trim().length > 0),
    currentValue: ctx.location || undefined,
    promptMessage: 'Select your operational district to enable hyper-local APMC & mandi price retrieval.',
    promptMessageTe: 'స్థానిక మండి ధరల కోసం మీ జిల్లాను ఎంచుకోండి.',
  });

  // 3. FINANCIAL MODEL
  items.push({
    id: 'fin_margin',
    category: 'finance',
    categoryLabel: 'Financial Model',
    categoryLabelTe: 'ఆర్థిక ప్రణాళిక',
    field: 'marginCapital',
    label: 'Promoter Margin Capital (₹)',
    labelTe: 'సొంత పెట్టుబడి మూలధనం (₹)',
    isRequired: true,
    isAvailable: Boolean(typeof ctx.marginCapital === 'number' && ctx.marginCapital > 0),
    currentValue: ctx.marginCapital ? `₹${ctx.marginCapital.toLocaleString('en-IN')}` : undefined,
    promptMessage: 'Enter your own cash contribution (minimum 10% of total outlay).',
    promptMessageTe: 'మీ సొంత పెట్టుబడి మొత్తాన్ని నమోదు చేయండి (కనీసం 10%).',
  });

  items.push({
    id: 'fin_project_cost',
    category: 'finance',
    categoryLabel: 'Financial Model',
    categoryLabelTe: 'ఆర్థిక ప్రణాళిక',
    field: 'projectCost',
    label: 'Total Project Cost (₹)',
    labelTe: 'మొత్తం ప్రాజెక్ట్ వ్యయం (₹)',
    isRequired: true,
    isAvailable: Boolean(typeof ctx.projectCost === 'number' && ctx.projectCost > 0),
    currentValue: ctx.projectCost ? `₹${ctx.projectCost.toLocaleString('en-IN')}` : undefined,
    promptMessage: 'Total capital outlay required for machines, animals, shed, and working capital.',
    promptMessageTe: 'యంత్రాలు, పశువులు మరియు వర్కింగ్ క్యాపిటల్ కోసం మొత్తం వ్యయం.',
  });

  items.push({
    id: 'fin_revenue_est',
    category: 'finance',
    categoryLabel: 'Financial Model',
    categoryLabelTe: 'ఆర్థిక ప్రణాళిక',
    field: 'monthlyRevenueEstimate',
    label: 'Estimated Monthly Revenue (₹)',
    labelTe: 'అంచనా వేసిన నెలవారీ రాబడి (₹)',
    isRequired: false, // Optional if calculated automatically
    isAvailable: Boolean(typeof ctx.monthlyRevenueEstimate === 'number' && ctx.monthlyRevenueEstimate > 0),
    currentValue: ctx.monthlyRevenueEstimate ? `₹${ctx.monthlyRevenueEstimate.toLocaleString('en-IN')}` : undefined,
    promptMessage: 'Expected gross monthly cash receipts from sales.',
    promptMessageTe: 'అమ్మకాల ద్వారా వచ్చే అంచనా నెలవారీ రాబడి.',
  });

  // 4. OPERATIONS & CAPACITY (Contextual per category)
  if (isDairy) {
    items.push({
      id: 'ops_dairy_units',
      category: 'operations',
      categoryLabel: 'Operational Capacity',
      categoryLabelTe: 'నిర్వహణ సామర్థ్యం',
      field: 'targetUnits',
      label: 'Number of Milch Cattle (Cows/Buffaloes)',
      labelTe: 'పాడి పశువుల సంఖ్య (ఆవులు/గేదెలు)',
      isRequired: true,
      isAvailable: Boolean(typeof ctx.targetUnits === 'number' && ctx.targetUnits > 0),
      currentValue: ctx.targetUnits ? `${ctx.targetUnits} Animals` : undefined,
      promptMessage: 'Specify the proposed herd size for milk yield and fodder planning.',
      promptMessageTe: 'పాల దిగుబడి మరియు దాణా ప్రణాళిక కోసం పశువుల సంఖ్యను తెలపండి.',
    });
  } else if (isWeaving) {
    items.push({
      id: 'ops_loom_units',
      category: 'operations',
      categoryLabel: 'Operational Capacity',
      categoryLabelTe: 'నిర్వహణ సామర్థ్యం',
      field: 'targetUnits',
      label: 'Number of Active Looms',
      labelTe: 'మగ్గాల సంఖ్య',
      isRequired: true,
      isAvailable: Boolean(typeof ctx.targetUnits === 'number' && ctx.targetUnits > 0),
      currentValue: ctx.targetUnits ? `${ctx.targetUnits} Looms` : undefined,
      promptMessage: 'Enter number of handlooms or powerlooms installed.',
      promptMessageTe: 'నడుస్తున్న చేనేత లేదా పవర్లూమ్ మగ్గాల సంఖ్య.',
    });
  } else if (isPoultry) {
    items.push({
      id: 'ops_poultry_capacity',
      category: 'operations',
      categoryLabel: 'Operational Capacity',
      categoryLabelTe: 'నిర్వహణ సామర్థ్యం',
      field: 'targetUnits',
      label: 'Shed Capacity (Number of Birds)',
      labelTe: 'షెడ్ సామర్థ్యం (పక్షుల సంఖ్య)',
      isRequired: true,
      isAvailable: Boolean(typeof ctx.targetUnits === 'number' && ctx.targetUnits > 0),
      currentValue: ctx.targetUnits ? `${ctx.targetUnits} Birds` : undefined,
      promptMessage: 'Batch capacity for broiler/layer rearing.',
      promptMessageTe: 'పౌల్ట్రీ పెంపకం కోసం షెడ్ సామర్థ్యం.',
    });
  }

  // 5. STATUTORY & BANKING DOCUMENTS
  items.push({
    id: 'doc_quotation',
    category: 'documents',
    categoryLabel: 'Statutory Documents',
    categoryLabelTe: 'రుణ దరఖాస్తు పత్రాలు',
    field: 'hasMachineryQuotation',
    label: 'Equipment / Livestock Pro-forma Quotation',
    labelTe: 'యంత్రాలు / పశువుల కొనుగోలు కొటేషన్',
    isRequired: isManufacturing || isDairy,
    isAvailable: Boolean(ctx.hasMachineryQuotation),
    currentValue: ctx.hasMachineryQuotation ? 'Quotation Uploaded' : undefined,
    promptMessage: 'Bank appraisal requires vendor pro-forma invoice or certified livestock valuation.',
    promptMessageTe: 'బ్యాంక్ లోన్ కోసం వెండర్ కొటేషన్ లేదా పశువైద్యుని సర్టిఫికేట్ అవసరం.',
  });

  items.push({
    id: 'doc_land_patta',
    category: 'documents',
    categoryLabel: 'Statutory Documents',
    categoryLabelTe: 'రుణ దరఖాస్తు పత్రాలు',
    field: 'hasLandOrLeaseAgreement',
    label: 'Land Patta / Premises Lease Agreement',
    labelTe: 'భూమి పట్టాదారు పాస్‌బుక్ / అద్దె ఒప్పందం',
    isRequired: isDairy || isPoultry || isManufacturing,
    isAvailable: Boolean(ctx.hasLandOrLeaseAgreement),
    currentValue: ctx.hasLandOrLeaseAgreement ? 'Verified Document' : undefined,
    promptMessage: 'Proof of business operational shed or agricultural land.',
    promptMessageTe: 'వ్యాపార స్థలం లేదా వ్యవసాయ భూమి యాజమాన్య పత్రం.',
  });

  items.push({
    id: 'doc_udyam',
    category: 'documents',
    categoryLabel: 'Statutory Documents',
    categoryLabelTe: 'రుణ దరఖాస్తు పత్రాలు',
    field: 'hasUdyamRegistration',
    label: 'Udyam MSME Registration Certificate',
    labelTe: 'ఉద్యమ్ MSME రిజిస్ట్రేషన్ సర్టిఫికేట్',
    isRequired: false, // Optional for micro loans < 50k, recommended for PMEGP
    isAvailable: Boolean(ctx.hasUdyamRegistration),
    currentValue: ctx.hasUdyamRegistration ? 'MSME Registered' : undefined,
    promptMessage: 'Free government MSME registration enables priority credit subvention.',
    promptMessageTe: 'ఉచిత ఉద్యమ్ రిజిస్ట్రేషన్ ద్వారా ప్రభుత్వ వడ్డీ రాయితీ లభిస్తుంది.',
  });

  // Calculate aggregates
  const availableItems = items.filter((i) => i.isAvailable);
  const missingRequiredItems = items.filter((i) => i.isRequired && !i.isAvailable);
  const optionalMissingItems = items.filter((i) => !i.isRequired && !i.isAvailable);

  const totalItemsCount = items.length;
  const availableItemsCount = availableItems.length;
  const missingRequiredCount = missingRequiredItems.length;
  const completionPercentage = Math.round((availableItemsCount / totalItemsCount) * 100);
  const isComplete = missingRequiredCount === 0;

  const categories: ChecklistCategory[] = ['business', 'location', 'finance', 'operations', 'documents'];
  const byCategory: MissingInformationResult['byCategory'] = {
    business: { label: 'Business Profile', labelTe: 'వ్యాపార ప్రొఫైల్', items: [], isComplete: true },
    location: { label: 'Location & Market', labelTe: 'స్థలం & మార్కెట్', items: [], isComplete: true },
    finance: { label: 'Financial Model', labelTe: 'ఆర్థిక ప్రణాళిక', items: [], isComplete: true },
    operations: { label: 'Operations & Capacity', labelTe: 'నిర్వహణ సామర్థ్యం', items: [], isComplete: true },
    documents: { label: 'Statutory Documents', labelTe: 'రుణ పత్రాలు', items: [], isComplete: true },
  };

  for (const item of items) {
    byCategory[item.category].items.push(item);
    if (item.isRequired && !item.isAvailable) {
      byCategory[item.category].isComplete = false;
    }
  }

  return {
    isComplete,
    totalItemsCount,
    availableItemsCount,
    missingRequiredCount,
    completionPercentage,
    availableItems,
    missingRequiredItems,
    optionalMissingItems,
    byCategory,
  };
}
