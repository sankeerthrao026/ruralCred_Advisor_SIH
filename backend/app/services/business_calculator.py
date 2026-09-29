import re
import math
from typing import Dict, Any, Optional, Tuple, List

def parse_target_amount(text: str) -> Optional[float]:
    """
    Extracts numeric financial targets from natural language queries in English or Telugu.
    Supports formats:
      - ₹5,00,000 / Rs 500000 / 500000 / 5,00,000
      - 5 lakh / 5 lakhs / 5 lac / 5L / 5 లక్షలు / 5 లక్ష
      - 1 crore / 1 cr / 1 కోటి
      - 50k / 50 thousand / 50 వేలు
    """
    if not text:
        return None

    clean = text.lower().replace(",", "").strip()

    # 1. Look for lakh/crore/k suffix patterns
    # e.g. "5 lakh", "5.5 lakhs", "5లక్షలు", "5 లక్షల", "1 crore", "50k", "50 thousand"
    lakh_match = re.search(r'(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:lakhs?|lacs?|lac|l|లక్షలు|లక్షల|లక్ష)(?:\b|\s|$|[^\w])', clean)
    if lakh_match:
        try:
            return float(lakh_match.group(1)) * 100000.0
        except ValueError:
            pass

    cr_match = re.search(r'(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:crores?|crs?|cr|కోట్లు|కోట్ల|కోటి)(?:\b|\s|$|[^\w])', clean)
    if cr_match:
        try:
            return float(cr_match.group(1)) * 10000000.0
        except ValueError:
            pass

    k_match = re.search(r'(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:k|thousand|వేలు|వేల)(?:\b|\s|$|[^\w])', clean)
    if k_match:
        try:
            return float(k_match.group(1)) * 1000.0
        except ValueError:
            pass

    # 2. Look for direct numbers with currency or plain >= 3 digits
    # e.g. "₹500000", "500000", "100000"
    num_match = re.search(r'(?:₹|rs\.?|inr\s*)?\s*(\d{4,9})(?:\.\d+)?', clean)
    if num_match:
        try:
            val = float(num_match.group(1))
            # If value is >= 1000, treat as currency/financial target
            if val >= 1000:
                return val
        except ValueError:
            pass

    return None

def detect_business_domain(
    query: str = "",
    history: Optional[List[Any]] = None,
    fallback_category: str = "Dairy Farming"
) -> str:
    """
    Dynamically extracts the active business domain from the user's current query, recent history, or fallback.
    Returns:
      - "handloom_weaving"
      - "dairy_farming"
      - "retail_shop"
      - "poultry_farming"
      - "tailoring_garments"
      - "agri_processing"
      - "agriculture_crop"
      - "general_enterprise"
    """
    def check_text(text: str) -> Optional[str]:
        if not text:
            return None
        t = text.lower()
        # Handloom / Weaving
        if any(w in t for w in [
            "handloom", "weaving", "powerloom", "loom", "looms", "saree", "sarees", "ikat",
            "pochampally", "yarn", "fabric", "textile", "textiles", "weaver", "weavers",
            "చేనేత", "మగ్గం", "మగ్గాలు", "చీరలు", "నూలు", "వస్త్రాలు", "పవర్లూమ్", "हथकरघा", "बुनकर"
        ]):
            return "handloom_weaving"
        # Dairy Farming
        if any(w in t for w in [
            "dairy", "cow", "cows", "buffalo", "buffaloes", "milch", "milk", "fodder", "cattle",
            "butter", "ghee", "curd", "lactation", "dairy farm", "పాడి", "ఆవు", "ఆవులు", "బర్రె",
            "గేదె", "గేదెలు", "పాలు", "దాణా", "పశువులు", "డెయిరీ", "दुग्ध", "गाय", "भैंस"
        ]):
            return "dairy_farming"
        # Retail / Kirana Shop
        if any(w in t for w in [
            "kirana", "grocery", "provision", "shop", "retail", "store", "supermarket", "general store",
            "fmcg", "కిరాణా", "షాప్", "దుకాణం", "జనరల్ స్టోర్", "స్టోర్", "కిరాణా దుకాణం", "किराना"
        ]):
            return "retail_shop"
        # Poultry Farming
        if any(w in t for w in [
            "poultry", "chicken", "broiler", "layers", "egg", "eggs", "bird", "birds", "natukodi",
            "desi murgi", "hatchery", "కోళ్లు", "పౌల్ట్రీ", "కోడి", "గుడ్లు", "నాటు కోడి", "కుక్కుట"
        ]):
            return "poultry_farming"
        # Tailoring & Boutique
        if any(w in t for w in [
            "tailor", "tailoring", "boutique", "stitching", "garment", "garments", "blouse", "embroidery",
            "maggam work", "sewing", "టైలరింగ్", "కుట్లు", "బోటిక్", "రవికె", "మగ్గం వర్క్", "సంచులు"
        ]):
            return "tailoring_garments"
        # Agri-Processing & Flour/Spice Mill
        if any(w in t for w in [
            "flour mill", "spice mill", "rice mill", "chilli powder", "milling", "processing mill",
            "పిండి మిల్లు", "మిర్చి మిల్లు", "వరి మిల్లు", "మసాలా మిల్లు"
        ]):
            return "agri_processing"
        # Agriculture / Crops
        if any(w in t for w in [
            "crop", "farming", "cotton", "paddy", "chilli", "turmeric", "horticulture", "seeds",
            "fertilizer", "pesticide", "harvest", "వ్యవసాయం", "పంట", "పత్తి", "వరి", "మిర్చి", "పసుపు"
        ]):
            return "agriculture_crop"
        return None

    # Priority 1: Current query
    if query:
        dom = check_text(query)
        if dom:
            return dom

    # Priority 2: Recent history (newest user messages first)
    if history:
        for msg in reversed(history):
            content = msg.get("content", "") if isinstance(msg, dict) else getattr(msg, "content", "")
            role = msg.get("role", "") if isinstance(msg, dict) else getattr(msg, "role", "")
            if role == "user" and content:
                dom = check_text(content)
                if dom:
                    return dom

    # Priority 3: Fallback category from profile
    fb_dom = check_text(fallback_category)
    if fb_dom:
        return fb_dom

    fb_lower = fallback_category.lower()
    if "weave" in fb_lower or "handloom" in fb_lower or "textile" in fb_lower:
        return "handloom_weaving"
    if "dairy" in fb_lower or "milk" in fb_lower or "cow" in fb_lower:
        return "dairy_farming"
    if "kirana" in fb_lower or "grocery" in fb_lower or "retail" in fb_lower or "shop" in fb_lower:
        return "retail_shop"
    if "poultry" in fb_lower or "chicken" in fb_lower or "bird" in fb_lower:
        return "poultry_farming"
    if "tailor" in fb_lower or "garment" in fb_lower:
        return "tailoring_garments"
    if "mill" in fb_lower or "agri" in fb_lower:
        return "agri_processing"

    return "general_enterprise"

class BusinessCalculationEngine:
    """
    Deterministic business calculation and intent classification engine.
    Uses official APMC Mandi, NABARD, and NBCFDC category unit economics.
    """

    @staticmethod
    def classify_intent(
        query: str,
        history: Optional[List[Any]] = None,
        fallback_category: str = "Dairy Farming"
    ) -> Dict[str, Any]:
        """
        Classifies query intent using the unified SemanticIntentEngine.
        Returns:
          {
            "intent": str,
            "targetAmount": Optional[float],
            "inputUnits": Optional[float],
            "unitEntity": Optional[str],
            "isNumerical": bool,
            "entity": Optional[str],
            "timeframe": str ("annual" | "monthly" | "daily"),
            "domain": str,
            "numericEntities": List[Dict[str, Any]],
            "searchTargetValue": Optional[float],
            "previousAnswerValue": Optional[float],
            "comparisonValues": Optional[List[float]],
          }
        """
        from app.services.intent_orchestrator import intent_orchestrator, SemanticIntent

        detected_domain = detect_business_domain(
            query=query,
            history=history,
            fallback_category=fallback_category
        )

        res = intent_orchestrator.classify_agent1_intent(
            query=query,
            history=history,
            fallback_category=fallback_category
        )

        q = (query or "").lower().strip()
        is_monthly = any(w in q for w in ["month", "monthly", "నెల", "నెలకు", "మాసం", "प्रति माह"])
        is_daily = any(w in q for w in ["day", "daily", "రోజు", "రోజుకు", "రోజూ", "प्रति दिन"])
        timeframe = "daily" if is_daily else ("monthly" if is_monthly else "annual")

        # Entity identification
        entity = res.get("unitEntity")
        if not entity:
            if any(w in q for w in ["cow", "cows", "ఆవు", "ఆవులు"]):
                entity = "cow"
            elif any(w in q for w in ["buffalo", "buffaloes", "బర్రె", "గేదె", "బర్రెలు"]):
                entity = "buffalo"
            elif any(w in q for w in ["bird", "birds", "hen", "hens", "chicken", "కోళ్లు", "కోడి"]):
                entity = "bird"
            elif any(w in q for w in ["loom", "looms", "మగ్గం", "మగ్గాలు"]):
                entity = "loom"
            elif any(w in q for w in ["milk", "litre", "litres", "పాలు", "లీటర్లు"]):
                entity = "milk_litre"

        num_entities = res.get("numericEntities", [])
        primary_role = "UNKNOWN"
        if num_entities:
            # Pick the non-unknown role if available
            specific_role = next((n["role"] for n in num_entities if n.get("role") != "UNKNOWN"), None)
            primary_role = specific_role or num_entities[0].get("role", "UNKNOWN")
        elif res.get("intent") == SemanticIntent.RETRIEVAL_EVIDENCE.value:
            primary_role = "SEARCH_TARGET_VALUE"
        elif res.get("intent") == SemanticIntent.PROVENANCE.value:
            primary_role = "PREVIOUS_ANSWER_VALUE"
        elif res.get("intent") == SemanticIntent.COMPARISON.value:
            primary_role = "COMPARISON_VALUE"
        elif res.get("intent") == SemanticIntent.FORWARD_UNIT_CALCULATION.value:
            primary_role = "INPUT_PARAMETER"
        elif res.get("intent") == SemanticIntent.CAPACITY_CALCULATION.value:
            primary_role = "TARGET_PROFIT"

        target_amount = res.get("targetAmount")
        input_units = res.get("inputUnits")

        return {
            "intent": res.get("intent", SemanticIntent.GENERAL_ADVISORY.value),
            "targetAmount": target_amount,
            "target_amount": target_amount,
            "inputUnits": input_units,
            "input_units": input_units,
            "unitEntity": entity,
            "unit_entity": entity,
            "isNumerical": res.get("isNumerical", False),
            "is_numerical": res.get("isNumerical", False),
            "entity": entity,
            "timeframe": timeframe,
            "domain": detected_domain,
            "numericEntities": num_entities,
            "numeric_entities": num_entities,
            "primaryRole": primary_role,
            "primary_role": primary_role,
            "searchTargetValue": res.get("searchTargetValue"),
            "search_target_value": res.get("searchTargetValue"),
            "previousAnswerValue": res.get("previousAnswerValue"),
            "previous_answer_value": res.get("previousAnswerValue"),
            "comparisonValues": res.get("comparisonValues"),
            "comparison_values": res.get("comparisonValues"),
            "confidence": res.get("confidence", 0.9),
            "reasoning": res.get("reasoning", ""),
        }

    @staticmethod
    def calculate_forward_unit_profit(
        category: str,
        unit_count: float,
        location: str = "Telangana",
        promoter_margin_capital: float = 100000.0,
        timeframe: str = "annual",
    ) -> Dict[str, Any]:
        """
        Deterministically calculates the gross revenue, operating costs, and net profit
        generated from an input quantity of units/animals (e.g. 10 cows, 5 looms, 500 birds).
        """
        cat_lower = (category or "").lower()
        units = max(1.0, float(unit_count if unit_count and unit_count > 0 else 1.0))

        if "dairy" in cat_lower or "పాడి" in cat_lower or "cow" in cat_lower or "milk" in cat_lower:
            yield_per_day_per_cow = 10.0
            milking_days = 300
            selling_price_per_l = 55.0
            annual_opex_per_cow = 75000.0
            capex_per_cow = 75000.0

            daily_total_litres = units * yield_per_day_per_cow
            annual_total_litres = units * (yield_per_day_per_cow * milking_days)
            annual_gross_revenue = annual_total_litres * selling_price_per_l
            monthly_gross_revenue = annual_gross_revenue / 12.0

            annual_total_opex = units * annual_opex_per_cow
            monthly_total_opex = annual_total_opex / 12.0

            annual_net_profit = annual_gross_revenue - annual_total_opex
            monthly_net_profit = annual_net_profit / 12.0

            total_project_outlay = units * capex_per_cow
            required_margin_10 = total_project_outlay * 0.10
            eligible_loan_90 = total_project_outlay * 0.90

            return {
                "category": "Dairy Farming",
                "unitNameEn": f"{int(units)} milch cows",
                "unitNameTe": f"{int(units)} పాడి ఆవులు",
                "units": units,
                "metrics": {
                    "dailyProductionLitres": daily_total_litres,
                    "annualProductionLitres": annual_total_litres,
                    "sellingPricePerLitre": selling_price_per_l,
                    "annualGrossRevenue": annual_gross_revenue,
                    "monthlyGrossRevenue": monthly_gross_revenue,
                    "annualOperatingCosts": annual_total_opex,
                    "monthlyOperatingCosts": monthly_total_opex,
                    "annualNetProfit": annual_net_profit,
                    "monthlyNetProfit": monthly_net_profit,
                    "costBreakdown": {
                        "feedAndFodder": annual_total_opex * 0.55,
                        "veterinaryAndAI": annual_total_opex * 0.10,
                        "laborAndMaintenance": annual_total_opex * 0.20,
                        "utilitiesAndTransport": annual_total_opex * 0.15,
                    }
                },
                "financialOutlay": {
                    "totalProjectCost": total_project_outlay,
                    "promoterMarginRequired": required_margin_10,
                    "bankLoanEligible": eligible_loan_90,
                },
                "assumptions": [
                    f"{int(units)} crossbred cows yield {daily_total_litres:,.0f} Litres/day ({annual_total_litres:,.0f} L/year over 300 milking days).",
                    f"Milk sold at prevailing mandi/retail rate of ₹{selling_price_per_l:.0f}/Litre.",
                    f"Annual operating expenses of ₹{annual_total_opex:,.0f} (₹{monthly_total_opex:,.0f}/month).",
                    f"Net profit: ₹{annual_net_profit:,.0f}/year (₹{monthly_net_profit:,.0f}/month).",
                ],
                "assumptionsTe": [
                    f"{int(units)} పాడి ఆవులు రోజుకు {daily_total_litres:,.0f} లీటర్ల పాలు (సంవత్సరానికి {annual_total_litres:,.0f} లీటర్లు) ఇస్తాయి.",
                    f"సగటు విక్రయ ధర లీటరుకు ₹{selling_price_per_l:.0f}.",
                    f"వార్షిక నిర్వహణ ఖర్చు ₹{annual_total_opex:,.0f} (నెలకు ₹{monthly_total_opex:,.0f}).",
                    f"నికర లాభం: సంవత్సరానికి ₹{annual_net_profit:,.0f} (నెలకు ₹{monthly_net_profit:,.0f}).",
                ]
            }

        elif "weaving" in cat_lower or "handloom" in cat_lower or "చేనేత" in cat_lower:
            annual_sarees = units * 36
            monthly_sarees = units * 3
            net_profit_per_saree = 2500.0
            annual_net_profit = annual_sarees * net_profit_per_saree
            monthly_net_profit = annual_net_profit / 12.0
            total_project_outlay = units * 50000.0

            return {
                "category": "Handloom & Weaving",
                "unitNameEn": f"{int(units)} handlooms",
                "unitNameTe": f"{int(units)} చేనేత మగ్గాలు",
                "units": units,
                "metrics": {
                    "annualSareesProduced": annual_sarees,
                    "monthlySareesProduced": monthly_sarees,
                    "netProfitPerSaree": net_profit_per_saree,
                    "annualNetProfit": annual_net_profit,
                    "monthlyNetProfit": monthly_net_profit,
                },
                "financialOutlay": {
                    "totalProjectCost": total_project_outlay,
                    "promoterMarginRequired": total_project_outlay * 0.10,
                    "bankLoanEligible": total_project_outlay * 0.90,
                },
                "assumptions": [
                    f"Production of {monthly_sarees:,.0f} sarees/month ({annual_sarees:,.0f} sarees/year).",
                    f"Net profit of ₹{net_profit_per_saree:,.0f} per saree after yarn and dyeing costs.",
                    f"Net profit: ₹{annual_net_profit:,.0f}/year (₹{monthly_net_profit:,.0f}/month).",
                ],
                "assumptionsTe": [
                    f"నెలకు {monthly_sarees:,.0f} చీరల ఉత్పత్తి (సంవత్సరానికి {annual_sarees:,.0f} చీరలు).",
                    f"చీరకు ₹{net_profit_per_saree:,.0f} నికర లాభం.",
                    f"నికర లాభం: సంవత్సరానికి ₹{annual_net_profit:,.0f} (నెలకు ₹{monthly_net_profit:,.0f}).",
                ]
            }

        else:
            turnover_per_unit = 360000.0 * units
            annual_net_profit = turnover_per_unit * 0.15
            monthly_net_profit = annual_net_profit / 12.0
            total_project_outlay = turnover_per_unit * 0.25

            return {
                "category": category or "Rural Enterprise",
                "unitNameEn": f"{int(units)} operational units",
                "unitNameTe": f"{int(units)} వ్యాపార యూనిట్లు",
                "units": units,
                "metrics": {
                    "annualGrossTurnover": turnover_per_unit,
                    "monthlyGrossTurnover": turnover_per_unit / 12.0,
                    "netMarginPercent": 15.0,
                    "annualNetProfit": annual_net_profit,
                    "monthlyNetProfit": monthly_net_profit,
                },
                "financialOutlay": {
                    "totalProjectCost": total_project_outlay,
                    "promoterMarginRequired": total_project_outlay * 0.10,
                    "bankLoanEligible": total_project_outlay * 0.90,
                },
                "assumptions": [
                    f"Gross sales turnover of ₹{turnover_per_unit:,.0f}/year (₹{turnover_per_unit / 12:,.0f}/month).",
                    f"15% operating net margin across {int(units)} units.",
                    f"Net profit: ₹{annual_net_profit:,.0f}/year (₹{monthly_net_profit:,.0f}/month).",
                ],
                "assumptionsTe": [
                    f"వార్షిక అమ్మకాలు ₹{turnover_per_unit:,.0f} (నెలకు ₹{turnover_per_unit / 12:,.0f}).",
                    f"15% నికర లాభ మార్జిన్.",
                    f"నికర లాభం: సంవత్సరానికి ₹{annual_net_profit:,.0f} (నెలకు ₹{monthly_net_profit:,.0f}).",
                ]
            }

    @staticmethod
    def calculate_capacity_for_target_profit(
        category: str,
        target_profit: float,
        location: str = "Telangana",
        promoter_margin_capital: float = 100000.0,
        timeframe: str = "annual",
    ) -> Dict[str, Any]:
        """
        Deterministically calculates the exact capacity (cows, birds, looms, inventory)
        needed to generate the specified net profit target.
        """
        cat_lower = (category or "").lower()
        target = float(target_profit if target_profit and target_profit > 0 else 500000.0)

        # Convert monthly target to annual if specified
        annual_target = target * 12.0 if timeframe == "monthly" else target

        if "dairy" in cat_lower or "పాడి" in cat_lower or "cow" in cat_lower or "milk" in cat_lower:
            # --- DAIRY FARMING BENCHMARK (NABARD / District APMC Standards) ---
            # Crossbred Cow (HF/Jersey Cross):
            # - Average milk yield: 10 Litres / day
            # - Active lactation / milking days per year: 300 days (65 dry days)
            # - Annual milk production per cow: 3,000 Litres / year
            # - Mandi & Local Retail Selling Price: ₹55.00 / Litre (Co-op ₹48/L, Retail/Direct ₹62/L)
            # - Annual Gross Revenue per cow = 3,000 L * ₹55 = ₹1,65,000 / year (₹13,750 / month)
            #
            # Operating Expenses per cow per year:
            # - Cattle Feed (Green/Dry Fodder + Concentrate 55%): ₹41,250 / year (~₹137/day)
            # - Veterinary, AI & Vaccines (10%): ₹7,500 / year
            # - Labour, Maintenance & Shed upkeep (20%): ₹15,000 / year
            # - Electricity, Water & Transport (15%): ₹11,250 / year
            # - Total Operating Cost per cow = ₹75,000 / year (₹6,250 / month)
            #
            # Net Profit per cow per year:
            # - Net Profit per cow = ₹1,65,000 - ₹75,000 = ₹90,000 / year (₹7,500 / month)
            # - Profit Margin: (90,000 / 165,000) = 54.5% on direct sales or ~22-26% fully burdened.
            #
            # Capital Outlay:
            # - Milch cow purchase (crossbred 2nd lactation) + shed share = ₹75,000 per animal

            yield_per_day = 10.0
            milking_days = 300
            annual_litres_per_cow = yield_per_day * milking_days  # 3,000 L
            selling_price_per_l = 55.0
            annual_rev_per_cow = annual_litres_per_cow * selling_price_per_l  # 1,65,000
            annual_opex_per_cow = 75000.0  # 75,000
            net_profit_per_cow_annual = annual_rev_per_cow - annual_opex_per_cow  # 90,000
            net_profit_per_cow_monthly = net_profit_per_cow_annual / 12.0  # 7,500

            exact_units = annual_target / net_profit_per_cow_annual
            recommended_units = max(1, math.ceil(exact_units))
            capex_per_unit = 75000.0
            total_project_outlay = recommended_units * capex_per_unit
            required_margin_10 = total_project_outlay * 0.10
            eligible_loan_90 = total_project_outlay * 0.90

            return {
                "category": "Dairy Farming",
                "unitNameEn": "milch cows",
                "unitNameTe": "పాడి ఆవులు",
                "targetProfit": target,
                "annualTargetProfit": annual_target,
                "exactUnitsNeeded": round(exact_units, 2),
                "recommendedUnits": recommended_units,
                "unitMetrics": {
                    "dailyYieldLitres": yield_per_day,
                    "milkingDaysPerYear": milking_days,
                    "annualProductionLitres": annual_litres_per_cow,
                    "sellingPricePerLitre": selling_price_per_l,
                    "annualRevenuePerUnit": annual_rev_per_cow,
                    "annualOpexPerUnit": annual_opex_per_cow,
                    "netProfitPerUnitAnnual": net_profit_per_cow_annual,
                    "netProfitPerUnitMonthly": net_profit_per_cow_monthly,
                    "capexPerUnit": capex_per_unit,
                },
                "financialOutlay": {
                    "totalProjectCost": total_project_outlay,
                    "promoterMarginRequired": required_margin_10,
                    "bankLoanEligible": eligible_loan_90,
                },
                "assumptions": [
                    "Average milk yield of 10 Litres/day per crossbred cow over a 300-day lactation cycle.",
                    "Blended farm-gate & direct retail milk selling price of ₹55 per Litre.",
                    "Annual operating cost of ~₹75,000 per cow (Feed & Fodder 55%, Vet/AI 10%, Labor 20%, Utilities 15%).",
                    "Net annual profit of approximately ₹90,000 per milch cow (₹7,500/month).",
                ],
                "assumptionsTe": [
                    "ఒక సంకరజాతి పాడి ఆవు 300 రోజుల పాల కాలంలో రోజుకు సగటున 10 లీటర్ల దిగుబడిని ఇస్తుంది.",
                    "స్థానిక మండి మరియు ప్రత్యక్ష రిటైల్ విక్రయాల సగటు ధర లీటరుకు ₹55.",
                    "ఒక ఆవుకు వార్షిక నిర్వహణ ఖర్చు దాదాపు ₹75,000 (దాణా & పచ్చిగడ్డి 55%, పశువైద్యం 10%, శ్రమ 20%, రవాణా/విద్యుత్ 15%).",
                    "ప్రతి పాడి ఆవు నుండి సంవత్సరానికి దాదాపు ₹90,000 (నెలకు ₹7,500) నికర లాభం లభిస్తుంది.",
                ]
            }

        elif "poultry" in cat_lower or "కోడి" in cat_lower or "chicken" in cat_lower:
            # --- POULTRY (Broiler / Country Chicken) ---
            # Batch size model: 6 batches per year
            # Net profit per broiler bird: ~₹30 / bird / batch = ~₹180 / capacity unit / year
            # Country chicken (Natukodi): ~₹100 net profit / bird
            net_profit_per_bird_annual = 180.0
            exact_units = annual_target / net_profit_per_bird_annual
            recommended_units = max(100, math.ceil(exact_units / 50.0) * 50)
            capex_per_bird = 250.0
            total_project_outlay = recommended_units * capex_per_bird

            return {
                "category": "Poultry Farming",
                "unitNameEn": "broiler birds (shed capacity)",
                "unitNameTe": "పౌల్ట్రీ పక్షుల షెడ్ సామర్థ్యం",
                "targetProfit": target,
                "annualTargetProfit": annual_target,
                "exactUnitsNeeded": round(exact_units, 1),
                "recommendedUnits": recommended_units,
                "unitMetrics": {
                    "batchesPerYear": 6,
                    "netProfitPerBirdBatch": 30.0,
                    "netProfitPerUnitAnnual": net_profit_per_bird_annual,
                    "capexPerUnit": capex_per_bird,
                },
                "financialOutlay": {
                    "totalProjectCost": total_project_outlay,
                    "promoterMarginRequired": total_project_outlay * 0.10,
                    "bankLoanEligible": total_project_outlay * 0.90,
                },
                "assumptions": [
                    "6 rearing cycles per year (40-45 day batch cycle).",
                    "Net profit of ₹30 per bird per batch (~₹180 per capacity slot annually).",
                    "Shed infrastructure capex of ₹250 per bird capacity.",
                ],
                "assumptionsTe": [
                    "సంవత్సరానికి 6 బ్యాచ్‌ల పెంపకం చక్రం (40-45 రోజులు).",
                    "ఒక పక్షికి బ్యాచ్‌కు ₹30 నికర లాభం (వార్షికంగా ₹180).",
                    "షెడ్ మౌలిక సదుపాయాల వ్యయం ఒక్కో పక్షికి ₹250.",
                ]
            }

        elif "weaving" in cat_lower or "handloom" in cat_lower or "చేనేత" in cat_lower:
            # --- HANDLOOM / WEAVING ---
            # Pochampally / Silk Handloom:
            # 3 sarees / month per pit loom = 36 sarees / year
            # Net margin per saree: ₹2,500
            # Net profit per loom per year: ₹90,000 / year
            net_profit_per_loom_annual = 90000.0
            exact_units = annual_target / net_profit_per_loom_annual
            recommended_units = max(1, math.ceil(exact_units))
            capex_per_loom = 50000.0
            total_project_outlay = recommended_units * capex_per_loom

            return {
                "category": "Handloom & Weaving",
                "unitNameEn": "traditional handlooms",
                "unitNameTe": "చేనేత మగ్గాలు",
                "targetProfit": target,
                "annualTargetProfit": annual_target,
                "exactUnitsNeeded": round(exact_units, 2),
                "recommendedUnits": recommended_units,
                "unitMetrics": {
                    "sareesPerMonth": 3,
                    "annualSareesPerLoom": 36,
                    "netProfitPerSaree": 2500.0,
                    "netProfitPerUnitAnnual": net_profit_per_loom_annual,
                    "capexPerUnit": capex_per_loom,
                },
                "financialOutlay": {
                    "totalProjectCost": total_project_outlay,
                    "promoterMarginRequired": total_project_outlay * 0.10,
                    "bankLoanEligible": total_project_outlay * 0.90,
                },
                "assumptions": [
                    "Production of 3 traditional sarees per month per active loom (36 sarees/year).",
                    "Net profit margin of ₹2,500 per saree after yarn, dyes, and weaving labor.",
                    "Annual net profit of ~₹90,000 per handloom.",
                ],
                "assumptionsTe": [
                    "ఒక మగ్గంపై నెలకు 3 చేనేత చీరల ఉత్పత్తి (సంవత్సరానికి 36 చీరలు).",
                    "నూలు, రంగులు మరియు శ్రమ ఖర్చులు పోను చీరకు ₹2,500 నికర లాభం.",
                    "ఒక మగ్గం నుండి వార్షిక నికర లాభం సుమారు ₹90,000.",
                ]
            }

        else:
            # --- GENERAL RETAIL / ENTERPRISE (Kirana, Milling, Services) ---
            # Net Profit Margin: 15%
            # Turnover needed = Target / 0.15
            net_margin_pct = 15.0
            annual_turnover_needed = annual_target / (net_margin_pct / 100.0)
            monthly_turnover_needed = annual_turnover_needed / 12.0
            daily_turnover_needed = annual_turnover_needed / 365.0

            return {
                "category": category or "Rural Enterprise",
                "unitNameEn": "gross annual sales turnover",
                "unitNameTe": "వార్షిక స్థూల అమ్మకాల టర్నోవర్",
                "targetProfit": target,
                "annualTargetProfit": annual_target,
                "exactUnitsNeeded": round(annual_turnover_needed),
                "recommendedUnits": round(annual_turnover_needed),
                "unitMetrics": {
                    "netMarginPercentage": net_margin_pct,
                    "annualTurnoverNeeded": annual_turnover_needed,
                    "monthlyTurnoverNeeded": monthly_turnover_needed,
                    "dailyTurnoverNeeded": daily_turnover_needed,
                },
                "financialOutlay": {
                    "totalProjectCost": annual_turnover_needed * 0.25,
                    "promoterMarginRequired": (annual_turnover_needed * 0.25) * 0.10,
                    "bankLoanEligible": (annual_turnover_needed * 0.25) * 0.90,
                },
                "assumptions": [
                    f"Realistic net operating profit margin of {net_margin_pct}% for rural retail/services.",
                    f"Daily gross sales target of ₹{daily_turnover_needed:,.0f} (₹{monthly_turnover_needed:,.0f}/month).",
                ],
                "assumptionsTe": [
                    f"గ్రామీణ వ్యాపారాలకు వాస్తవిక నికర లాభ మార్జిన్ {net_margin_pct}%.",
                    f"రోజువారీ సగటు అమ్మకాల లక్ష్యం ₹{daily_turnover_needed:,.0f} (నెలకు ₹{monthly_turnover_needed:,.0f}).",
                ]
            }

    @staticmethod
    def calculate_volume_for_target_revenue(
        category: str,
        target_amount: float,
        price_per_unit: float = 55.0,
    ) -> Dict[str, Any]:
        """Calculates exact volume needed to achieve a target gross revenue."""
        target = float(target_amount if target_amount and target_amount > 0 else 100000.0)
        units_needed = math.ceil(target / price_per_unit)
        daily_for_month = math.ceil(units_needed / 30.0)

        return {
            "targetAmount": target,
            "pricePerUnit": price_per_unit,
            "totalUnitsNeeded": units_needed,
            "dailyUnitsNeeded": daily_for_month,
        }

    @staticmethod
    def calculate_break_even(
        category: str,
        fixed_monthly_costs: float = 15000.0,
        gross_margin_percent: float = 25.0,
    ) -> Dict[str, Any]:
        """Calculates break-even monthly and daily sales."""
        margin_dec = max(0.05, gross_margin_percent / 100.0)
        monthly_be = fixed_monthly_costs / margin_dec
        daily_be = monthly_be / 30.0

        return {
            "fixedMonthlyCosts": fixed_monthly_costs,
            "grossMarginPercent": gross_margin_percent,
            "monthlyBreakEvenSales": round(monthly_be),
            "dailyBreakEvenSales": round(daily_be),
        }

business_calculator = BusinessCalculationEngine()

# Module-level convenience aliases
classify_intent = BusinessCalculationEngine.classify_intent
calculate_capacity_for_target_profit = BusinessCalculationEngine.calculate_capacity_for_target_profit
calculate_forward_unit_profit = BusinessCalculationEngine.calculate_forward_unit_profit
calculate_volume_for_target_revenue = BusinessCalculationEngine.calculate_volume_for_target_revenue
calculate_break_even = BusinessCalculationEngine.calculate_break_even


