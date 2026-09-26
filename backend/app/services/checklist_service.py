from typing import List, Dict, Any
from app.models.schemas import (
    MissingInfoEvaluateRequest,
    MissingInfoEvaluateResponse,
    ChecklistItemSchema,
)

def evaluate_missing_information(req: MissingInfoEvaluateRequest) -> MissingInfoEvaluateResponse:
    category = (req.category or "").lower()
    is_dairy = any(k in category for k in ["dairy", "milk", "cow"])
    is_weaving = any(k in category for k in ["weaving", "handloom", "saree"])
    is_poultry = any(k in category for k in ["poultry", "bird", "chicken"])
    is_mfg = any(k in category for k in ["milling", "agri", "tailor"])

    items: List[ChecklistItemSchema] = []

    # 1. Business
    items.append(
        ChecklistItemSchema(
            id="biz_type",
            category="business",
            categoryLabel="Business Profile",
            categoryLabelTe="వ్యాపార ప్రొఫైల్",
            field="category",
            label="Business Trade / Category",
            labelTe="వ్యాపార రంగం / కేటగిరీ",
            isRequired=True,
            isAvailable=bool(req.category and req.category.strip()),
            currentValue=req.category if req.category else None,
            promptMessage="Specify your primary rural enterprise trade.",
            promptMessageTe="మీ వ్యాపార రంగాన్ని ఎంచుకోండి.",
        )
    )
    items.append(
        ChecklistItemSchema(
            id="biz_name",
            category="business",
            categoryLabel="Business Profile",
            categoryLabelTe="వ్యాపార ప్రొఫైల్",
            field="businessName",
            label="Enterprise / Unit Name",
            labelTe="వ్యాపార సంస్థ పేరు",
            isRequired=True,
            isAvailable=bool(req.businessName and req.businessName.strip()),
            currentValue=req.businessName if req.businessName else None,
            promptMessage="Enter the proposed name for your enterprise.",
            promptMessageTe="మీ వ్యాపార సంస్థ పేరును నమోదు చేయండి.",
        )
    )

    # 2. Location
    items.append(
        ChecklistItemSchema(
            id="loc_district",
            category="location",
            categoryLabel="Location & Market",
            categoryLabelTe="స్థలం & మార్కెట్ వివరాలు",
            field="location",
            label="District & Village Cluster",
            labelTe="జిల్లా మరియు గ్రామ ప్రాంతం",
            isRequired=True,
            isAvailable=bool(req.location and req.location.strip()),
            currentValue=req.location if req.location else None,
            promptMessage="Select your operational district.",
            promptMessageTe="మీ జిల్లాను ఎంచుకోండి.",
        )
    )

    # 3. Finance
    items.append(
        ChecklistItemSchema(
            id="fin_margin",
            category="finance",
            categoryLabel="Financial Model",
            categoryLabelTe="ఆర్థిక ప్రణాళిక",
            field="marginCapital",
            label="Promoter Margin Capital (₹)",
            labelTe="సొంత పెట్టుబడి మూలధనం (₹)",
            isRequired=True,
            isAvailable=bool(req.marginCapital and req.marginCapital > 0),
            currentValue=f"₹{int(req.marginCapital):,}" if req.marginCapital else None,
            promptMessage="Enter your own cash contribution (minimum 10%).",
            promptMessageTe="మీ సొంత పెట్టుబడి మొత్తాన్ని నమోదు చేయండి.",
        )
    )
    items.append(
        ChecklistItemSchema(
            id="fin_project_cost",
            category="finance",
            categoryLabel="Financial Model",
            categoryLabelTe="ఆర్థిక ప్రణాళిక",
            field="projectCost",
            label="Total Project Cost (₹)",
            labelTe="మొత్తం ప్రాజెక్ట్ వ్యయం (₹)",
            isRequired=True,
            isAvailable=bool(req.projectCost and req.projectCost > 0),
            currentValue=f"₹{int(req.projectCost):,}" if req.projectCost else None,
            promptMessage="Total capital outlay required for machines and animals.",
            promptMessageTe="మొత్తం ప్రాజెక్ట్ వ్యయాన్ని నమోదు చేయండి.",
        )
    )

    # 4. Operations
    if is_dairy:
        items.append(
            ChecklistItemSchema(
                id="ops_dairy_units",
                category="operations",
                categoryLabel="Operational Capacity",
                categoryLabelTe="నిర్వహణ సామర్థ్యం",
                field="targetUnits",
                label="Number of Milch Cattle",
                labelTe="పాడి పశువుల సంఖ్య",
                isRequired=True,
                isAvailable=bool(req.targetUnits and req.targetUnits > 0),
                currentValue=f"{int(req.targetUnits)} Animals" if req.targetUnits else None,
                promptMessage="Specify proposed herd size.",
                promptMessageTe="పశువుల సంఖ్యను తెలపండి.",
            )
        )
    elif is_weaving:
        items.append(
            ChecklistItemSchema(
                id="ops_loom_units",
                category="operations",
                categoryLabel="Operational Capacity",
                categoryLabelTe="నిర్వహణ సామర్థ్యం",
                field="targetUnits",
                label="Number of Active Looms",
                labelTe="మగ్గాల సంఖ్య",
                isRequired=True,
                isAvailable=bool(req.targetUnits and req.targetUnits > 0),
                currentValue=f"{int(req.targetUnits)} Looms" if req.targetUnits else None,
                promptMessage="Enter number of active handlooms.",
                promptMessageTe="మగ్గాల సంఖ్యను తెలపండి.",
            )
        )

    # 5. Documents
    items.append(
        ChecklistItemSchema(
            id="doc_quotation",
            category="documents",
            categoryLabel="Statutory Documents",
            categoryLabelTe="రుణ దరఖాస్తు పత్రాలు",
            field="hasMachineryQuotation",
            label="Equipment / Livestock Quotation",
            labelTe="యంత్రాలు / పశువుల కొటేషన్",
            isRequired=bool(is_mfg or is_dairy),
            isAvailable=bool(req.hasMachineryQuotation),
            currentValue="Quotation Uploaded" if req.hasMachineryQuotation else None,
            promptMessage="Pro-forma invoice or certified valuation required by bank.",
            promptMessageTe="వెండర్ కొటేషన్ లేదా వాల్యుయేషన్ అవసరం.",
        )
    )

    available = [i for i in items if i.isAvailable]
    missing_req = [i for i in items if i.isRequired and not i.isAvailable]
    missing_opt = [i for i in items if not i.isRequired and not i.isAvailable]

    total_count = len(items)
    avail_count = len(available)
    pct = round((avail_count / total_count) * 100) if total_count > 0 else 100

    return MissingInfoEvaluateResponse(
        isComplete=len(missing_req) == 0,
        totalItemsCount=total_count,
        availableItemsCount=avail_count,
        missingRequiredCount=len(missing_req),
        completionPercentage=pct,
        availableItems=available,
        missingRequiredItems=missing_req,
        optionalMissingItems=missing_opt,
    )
