"""
RuralCred Advisor — Dual-Agent Semantic Intent & Consensus Orchestrator.

Provides:
1. Grammar-aware numeric & entity role extraction (distinguishing TARGET_PROFIT,
   SEARCH_TARGET_VALUE, PREVIOUS_ANSWER_VALUE, INPUT_PARAMETER, COMPARISON_VALUE).
2. Agent 1 (Business Advisor) semantic intent classification.
3. Agent 2 (Finance Advisor) independent semantic intent validation.
4. Cross-agent consensus & conflict resolution.
5. Deterministic forward unit calculations, provenance breakdowns, and comparisons.
"""

import re
import math
from enum import Enum
from typing import Dict, Any, List, Optional, Tuple

class NumericRole(str, Enum):
    TARGET_PROFIT = "TARGET_PROFIT"
    SEARCH_TARGET_VALUE = "SEARCH_TARGET_VALUE"
    PREVIOUS_ANSWER_VALUE = "PREVIOUS_ANSWER_VALUE"
    INPUT_PARAMETER = "INPUT_PARAMETER"
    COMPARISON_VALUE = "COMPARISON_VALUE"
    LOAN_AMOUNT = "LOAN_AMOUNT"
    CAPITAL_OUTLAY = "CAPITAL_OUTLAY"
    UNKNOWN = "UNKNOWN"

class SemanticIntent(str, Enum):
    RETRIEVAL_EVIDENCE = "retrieval_evidence_inspection"
    PROVENANCE = "provenance_query"
    FORWARD_CALCULATION = "forward_unit_calculation"
    FORWARD_UNIT_CALCULATION = "forward_unit_calculation"
    CAPACITY_CALCULATION = "capacity_calculation"
    PROFITABILITY_INQUIRY = "profitability_calculation"
    BREAK_EVEN = "break_even_calculation"
    VOLUME_TARGET = "volume_target_calculation"
    EXPANSION_CAPITAL = "expansion_capital_calculation"
    LOCATION_SELECTION = "location_selection"
    INVESTMENT_DECISION = "investment_decision"
    RAW_MATERIAL = "raw_material_optimization"
    PRICING_GUIDANCE = "pricing_guidance"
    GOVERNMENT_SCHEMES = "government_schemes"
    LOAN_SIMULATION = "loan_simulation"
    LOAN_AFFORDABILITY = "loan_affordability"
    DEBT_MANAGEMENT = "debt_management"
    SAVINGS_PLANNING = "savings_planning"
    EXPENSE_REDUCTION = "expense_reduction"
    WORKING_CAPITAL_SPLIT = "working_capital_split"
    SEASONAL_MORATORIUM = "moratorium_guidance"
    DOCUMENT_REQUIREMENTS = "document_requirements"
    COMPARISON = "comparison_query"
    TRANSLATION = "translation_query"
    GENERAL_ADVISORY = "general_advisory"

def extract_numbers_with_roles(query: str) -> List[Dict[str, Any]]:
    """
    Extracts all numerical values and determines their semantic roles based on surrounding grammar.
    Handles:
      - Indian numbering: ₹5,00,000, 5 lakh, 1 crore, 50k, 50 వేలు, 1 కోటి
      - Direct values: ₹7,500, 90000, 55
      - Small numbers with units: 10 cows, 5 buffaloes, 2 looms, 500 birds, 10 ఆవులు
      - Rates: ₹55/L, ₹55 per litre
    """
    if not query:
        return []

    q = query.lower().strip()
    clean = q.replace(",", "")
    results: List[Dict[str, Any]] = []

    # 1. Check for small numbers with unit entity (e.g. "10 cows", "5 looms", "10 ఆవులు")
    unit_patterns = [
        (r'(\d+)\s*(?:milch\s*)?(?:cows?|cattle|ఆవులు|ఆవు|బర్రెలు|బర్రె|గేదెలు|గేదె|गाय|भैंस)', 'cow'),
        (r'(\d+)\s*(?:buffaloes?|buffalo|గేదెలు|గేదె|బర్రెలు|బర్రె)', 'buffalo'),
        (r'(\d+)\s*(?:looms?|handlooms?|మగ్గాలు|మగ్గం|हथकरघा)', 'loom'),
        (r'(\d+)\s*(?:birds?|chickens?|hens?|broilers?|కోళ్లు|కోడి|పక్షులు)', 'bird'),
        (r'(\d+)\s*(?:units?|acres?|ఎకరాలు|ఎకరం|యూనిట్లు|యూనిట్)', 'unit'),
    ]
    for pattern, entity in unit_patterns:
        m = re.search(pattern, clean)
        if m:
            try:
                val = float(m.group(1))
                results.append({
                    "value": val,
                    "unit": entity,
                    "role": NumericRole.INPUT_PARAMETER.value,
                    "raw": m.group(0),
                })
            except ValueError:
                pass

    # 2. Check for rates (e.g. ₹55/L, 55 per litre)
    rate_match = re.search(r'(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:\/|\s*per\s*)(?:l|litre|liter|kg|లీటరు|కిలో)', clean)
    if rate_match:
        try:
            val = float(rate_match.group(1))
            results.append({
                "value": val,
                "unit": "rate",
                "role": NumericRole.INPUT_PARAMETER.value,
                "raw": rate_match.group(0),
            })
        except ValueError:
            pass

    # 3. Lakhs pattern
    lakh_matches = re.finditer(r'(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:lakhs?|lacs?|lac|l|లక్షలు|లక్షల|లక్ష)(?:\b|\s|$|[^\w])', clean)
    for m in lakh_matches:
        try:
            val = float(m.group(1)) * 100000.0
            results.append({"value": val, "unit": "INR", "role": NumericRole.UNKNOWN.value, "raw": m.group(0)})
        except ValueError:
            pass

    # 4. Crores pattern
    cr_matches = re.finditer(r'(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:crores?|crs?|cr|కోట్లు|కోట్ల|కోటి)(?:\b|\s|$|[^\w])', clean)
    for m in cr_matches:
        try:
            val = float(m.group(1)) * 10000000.0
            results.append({"value": val, "unit": "INR", "role": NumericRole.UNKNOWN.value, "raw": m.group(0)})
        except ValueError:
            pass

    # 5. Thousands pattern (k / thousand / వేలు)
    k_matches = re.finditer(r'(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:k|thousand|వేలు|వేల)(?:\b|\s|$|[^\w])', clean)
    for m in k_matches:
        try:
            val = float(m.group(1)) * 1000.0
            results.append({"value": val, "unit": "INR", "role": NumericRole.UNKNOWN.value, "raw": m.group(0)})
        except ValueError:
            pass

    # 6. Direct currency amounts >= 100
    direct_matches = re.finditer(r'(?:₹|rs\.?|inr\s*)?\s*(\d{3,9})(?:\.\d+)?', clean)
    for m in direct_matches:
        try:
            val = float(m.group(1))
            # avoid duplicating already parsed lakh/k/unit match if exact value exists
            if not any(r["value"] == val for r in results) and val >= 100:
                results.append({"value": val, "unit": "INR", "role": NumericRole.UNKNOWN.value, "raw": m.group(0)})
        except ValueError:
            pass

    # Grammar-based Role Disambiguation
    is_prov_grammar = any(w in q for w in [
        "where did", "where does", "why did you calculate", "why is the answer", "why did you", "how did you get",
        "how was", "figure come from", "source of", "formula for", "explain the", "origin of",
        "ఎక్కడి నుండి వచ్చింది", "ఎలా వచ్చింది", "ఎందుకు లెక్కించారు", "మూలం ఏమిటి", "సూత్రం ఏమిటి"
    ])
    is_evid_grammar = any(w in q for w in [
        "chromadb", "retrieval evidence", "retrieved chunks", "retrieved documents", "chunks containing",
        "did your retrieved", "mentioned in chromadb", "evidence for", "vector store", "show me evidence",
        "రిట్రీవల్ ఆధారాలు", "క్రోమాడీబీ ఆధారాలు", "ఆధారాలు చూపించు", "చంక్స్"
    ])
    is_comp_grammar = any(w in q for w in [
        "compare", "comparison", "difference between", "versus", "vs", "పోల్చండి", "పోలిక", "తేడా"
    ])
    is_target_grammar = any(w in q for w in [
        "how many cows do i need", "cows do i need", "how many", "target", "make a profit of", "earn",
        "to make", "to earn", "లక్ష్యం", "సంపాదించడానికి", "కావాలి", "ఎన్ని ఆవులు"
    ])
    is_loan_grammar = any(w in q for w in [
        "can i afford", "afford a", "loan for", "borrow", "loan amount", "రుణం", "లోన్"
    ])

    for item in results:
        if item["role"] == NumericRole.INPUT_PARAMETER.value:
            continue
        if is_prov_grammar:
            item["role"] = NumericRole.PREVIOUS_ANSWER_VALUE.value
        elif is_evid_grammar:
            item["role"] = NumericRole.SEARCH_TARGET_VALUE.value
        elif is_comp_grammar:
            item["role"] = NumericRole.COMPARISON_VALUE.value
        elif is_target_grammar:
            item["role"] = NumericRole.TARGET_PROFIT.value
        elif is_loan_grammar:
            item["role"] = NumericRole.LOAN_AMOUNT.value
        else:
            item["role"] = NumericRole.TARGET_PROFIT.value

    return results

class SemanticIntentEngine:
    """
    Unified dual-agent semantic intent engine with cross-agent validation and consensus.
    """

    @staticmethod
    def classify_agent1_intent(
        query: str,
        history: Optional[List[Any]] = None,
        fallback_category: str = "Dairy Farming",
    ) -> Dict[str, Any]:
        """
        Agent 1 (Business Advisor) Intent Classifier.
        Evaluates complete query semantics, numeric roles, and RAG/calculation requirements.
        """
        if not query or not query.strip():
            return {
                "agent": "Agent 1 (Business Advisor)",
                "intent": SemanticIntent.GENERAL_ADVISORY.value,
                "confidence": 1.0,
                "numericEntities": [],
                "targetAmount": None,
                "inputUnits": None,
                "isNumerical": False,
                "timeframe": "annual",
                "reasoning": "Empty query defaults to general business advisory overview.",
            }

        q = query.lower().strip()
        num_entities = extract_numbers_with_roles(query)

        # Timeframe
        is_monthly = any(w in q for w in ["month", "monthly", "నెల", "నెలకు", "మాసం", "प्रति माह"])
        is_daily = any(w in q for w in ["day", "daily", "రోజు", "రోజుకు", "రోజూ", "प्रति दिन"])
        timeframe = "daily" if is_daily else ("monthly" if is_monthly else "annual")

        # 1. Translation Query
        if any(w in q for w in ["translate", "translation", "in telugu", "into telugu", "in english", "into english", "తెలుగులోకి", "అనువదించు", "అనువాదం"]):
            return {
                "agent": "Agent 1 (Business Advisor)",
                "intent": SemanticIntent.TRANSLATION.value,
                "confidence": 0.98,
                "numericEntities": num_entities,
                "targetAmount": None,
                "inputUnits": None,
                "isNumerical": False,
                "timeframe": timeframe,
                "reasoning": "Explicit request for language translation of previous response.",
            }

        # 2. Retrieval Evidence Inspection (Explicit vector store / evidence lookup)
        is_retrieval_evidence = any(w in q for w in [
            "chromadb", "retrieval evidence", "retrieval provenance", "retrieved chunks", "retrieved document",
            "retrieved documents", "number of chunks", "collection name", "document/chunk ids", "similarity scores",
            "similarity distances", "exact retrieved text", "chunks containing", "did your retrieved",
            "is mentioned in chromadb", "mentioned in chromadb", "evidence for the", "show me evidence",
            "vector store evidence", "vector database evidence", "search the retrieved documents",
            "రిట్రీవల్ ఆధారాలు", "క్రోమాడీబీ ఆధారాలు", "రిట్రీవల్ వివరాలు", "సారూప్యత స్కోర్లు", "చంక్స్", "డాక్యుమెంట్ ఐడీలు", "ఆధారాలు చూపించు"
        ])
        if is_retrieval_evidence:
            search_val = next((n["value"] for n in num_entities if n["role"] == NumericRole.SEARCH_TARGET_VALUE.value), None)
            return {
                "agent": "Agent 1 (Business Advisor)",
                "intent": SemanticIntent.RETRIEVAL_EVIDENCE.value,
                "confidence": 0.99,
                "numericEntities": num_entities,
                "targetAmount": None,
                "searchTargetValue": search_val,
                "inputUnits": None,
                "isNumerical": False,
                "timeframe": timeframe,
                "reasoning": "Query explicitly requests ChromaDB retrieval evidence, chunk IDs, or vector metadata.",
            }

        # 3. Provenance Query (Where did a previously stated number come from?)
        is_provenance = any(w in q for w in [
            "where did", "where did your", "where did that", "where did the", "where does", "why did you calculate",
            "why is the answer", "figure come from", "source of your", "how did you calculate", "how did you get",
            "show me the formula", "formula for", "explain how you calculated", "derivation of", "come from",
            "ఎక్కడి నుండి వచ్చింది", "ఎలా వచ్చింది", "ఎందుకు లెక్కించారు", "ఈ లెక్క ఎలా వచ్చింది", "సూత్రం ఏమిటి", "లెక్క వివరణ"
        ])
        if is_provenance:
            prev_val = next((n["value"] for n in num_entities if n["role"] == NumericRole.PREVIOUS_ANSWER_VALUE.value), None)
            if not prev_val and num_entities:
                prev_val = num_entities[0]["value"]
            return {
                "agent": "Agent 1 (Business Advisor)",
                "intent": SemanticIntent.PROVENANCE.value,
                "confidence": 0.96,
                "numericEntities": num_entities,
                "targetAmount": None,
                "previousAnswerValue": prev_val,
                "inputUnits": None,
                "isNumerical": False,
                "timeframe": timeframe,
                "reasoning": "Query inquires into the derivation, formula, or origin of a previously generated figure.",
            }

        # 4. Comparison Query (Compare options, figures, or schemes)
        is_comparison = any(w in q for w in [
            "compare", "comparison", "difference between", "versus", "vs", "monthly with", "annually with",
            "పోల్చండి", "పోలిక", "తేడా", "రెండు ఆప్షన్లు"
        ])
        if is_comparison:
            comp_vals = [n["value"] for n in num_entities if n["role"] == NumericRole.COMPARISON_VALUE.value]
            return {
                "agent": "Agent 1 (Business Advisor)",
                "intent": SemanticIntent.COMPARISON.value,
                "confidence": 0.95,
                "numericEntities": num_entities,
                "targetAmount": None,
                "comparisonValues": comp_vals,
                "inputUnits": None,
                "isNumerical": len(comp_vals) > 0,
                "timeframe": timeframe,
                "reasoning": "Query requests comparative evaluation between metrics or options.",
            }

        # 5. Forward Unit Calculation (e.g. "Calculate the monthly profit from 10 cows" or "If I have 10 cows")
        unit_param = next((n for n in num_entities if n["role"] == NumericRole.INPUT_PARAMETER.value), None)
        is_forward_calc = (unit_param is not None) and any(w in q for w in [
            "calculate", "profit", "net profit", "income", "return", "earnings", "what is my",
            "if i have", "with 10", "with 5", "from 10", "from 5", "profit from", "income from",
            "లాభం ఎంత", "ఆదాయం ఎంత", "లెక్కించండి", "నుండి లాభం", "10 ఆవులు", "5 ఆవులు"
        ])
        if is_forward_calc and unit_param:
            return {
                "agent": "Agent 1 (Business Advisor)",
                "intent": SemanticIntent.FORWARD_CALCULATION.value,
                "confidence": 0.97,
                "numericEntities": num_entities,
                "targetAmount": None,
                "inputUnits": unit_param["value"],
                "unitEntity": unit_param["unit"],
                "isNumerical": True,
                "timeframe": timeframe,
                "reasoning": f"Forward calculation of profit from input quantity ({unit_param['value']} {unit_param['unit']}).",
            }

        # 6. Location Selection
        is_location = any(w in q for w in [
            "where should i establish", "where can i establish", "where should i open", "where can i open",
            "suggest me places", "suggest places", "which localities", "which locality", "which area",
            "best locations", "best location", "profitable location", "suitable location", "cluster",
            "ఎక్కడ ప్రారంభించాలి", "ఎక్కడ పెట్టాలి", "ఏ ప్రాంతం", "మంచి ప్రదేశం", "స్థలం ఎంపిక"
        ])
        if is_location:
            return {
                "agent": "Agent 1 (Business Advisor)",
                "intent": SemanticIntent.LOCATION_SELECTION.value,
                "confidence": 0.95,
                "numericEntities": num_entities,
                "targetAmount": None,
                "inputUnits": None,
                "isNumerical": False,
                "timeframe": timeframe,
                "reasoning": "User requesting geographic location and commercial hub recommendations.",
            }

        # 7. Capacity / Quantity Needed for Target Profit ("How many cows for ₹7,500?")
        target_entity = next((n for n in num_entities if n["role"] == NumericRole.TARGET_PROFIT.value), None)
        is_how_many = any(w in q for w in [
            "how many", "number of", "cows do i need", "cows should i buy", "buffaloes do i need",
            "looms do i need", "how much capacity", "ఎన్ని ఆవులు", "ఎన్ని బర్రెలు", "ఎన్ని మగ్గాలు", "ఎన్ని కావాలి"
        ])
        if (is_how_many and target_entity) or (target_entity and any(w in q for w in ["target", "target profit", "లక్ష్యం"])):
            return {
                "agent": "Agent 1 (Business Advisor)",
                "intent": SemanticIntent.CAPACITY_CALCULATION.value,
                "confidence": 0.98,
                "numericEntities": num_entities,
                "targetAmount": target_entity["value"],
                "inputUnits": None,
                "isNumerical": True,
                "timeframe": timeframe,
                "reasoning": f"Target profit capacity calculation for ₹{target_entity['value']:,.0f} ({timeframe}).",
            }

        # 8. Break-Even Calculation
        if any(w in q for w in ["break even", "break-even", "breakeven", "బ్రేక్ ఈవెన్", "నో లాస్ నో ప్రాఫిట్"]):
            return {
                "agent": "Agent 1 (Business Advisor)",
                "intent": SemanticIntent.BREAK_EVEN.value,
                "confidence": 0.95,
                "numericEntities": num_entities,
                "targetAmount": None,
                "inputUnits": None,
                "isNumerical": True,
                "timeframe": timeframe,
                "reasoning": "Break-even sales volume inquiry.",
            }

        # 9. Government Schemes
        if any(w in q for w in ["scheme", "subsidy", "subsidies", "mudra", "pmegp", "nbcfdc", "vishwakarma", "stand-up", "సబ్సిడీ", "పథకం", "ప్రభుత్వ పథకాలు"]):
            return {
                "agent": "Agent 1 (Business Advisor)",
                "intent": SemanticIntent.GOVERNMENT_SCHEMES.value,
                "confidence": 0.92,
                "numericEntities": num_entities,
                "targetAmount": None,
                "inputUnits": None,
                "isNumerical": False,
                "timeframe": timeframe,
                "reasoning": "Government credit schemes and capital subsidies inquiry.",
            }

        # 10. Default Target Amount Catch (Only when target is explicitly established)
        if target_entity and any(w in q for w in ["profit", "earn", "income", "లాభం", "సంపాదన"]):
            return {
                "agent": "Agent 1 (Business Advisor)",
                "intent": SemanticIntent.CAPACITY_CALCULATION.value,
                "confidence": 0.90,
                "numericEntities": num_entities,
                "targetAmount": target_entity["value"],
                "inputUnits": None,
                "isNumerical": True,
                "timeframe": timeframe,
                "reasoning": f"Target profit calculation derived from established target profit role (₹{target_entity['value']:,.0f}).",
            }

        # 11. General Advisory / Market Pricing RAG
        return {
            "agent": "Agent 1 (Business Advisor)",
            "intent": SemanticIntent.GENERAL_ADVISORY.value,
            "confidence": 0.85,
            "numericEntities": num_entities,
            "targetAmount": None,
            "inputUnits": None,
            "isNumerical": False,
            "timeframe": timeframe,
            "reasoning": "General business advisory inquiry routed to ChromaDB RAG and market benchmarks.",
        }

    @staticmethod
    def classify_agent2_intent(
        query: str,
        history: Optional[List[Any]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Agent 2 (Finance Advisor) Independent Intent Classifier.
        Validates loan, cash-flow, evidence, provenance, and credit underwriting semantics.
        """
        if not query or not query.strip():
            return {
                "agent": "Agent 2 (Finance Advisor)",
                "intent": "open_ended_planning",
                "confidence": 1.0,
                "numericEntities": [],
                "targetAmount": None,
                "reasoning": "Empty query defaults to open-ended financial planning.",
            }

        q = query.lower().strip()
        num_entities = extract_numbers_with_roles(query)

        # 1. Translation Query
        if any(w in q for w in ["translate", "translation", "in telugu", "into telugu", "in english", "into english", "తెలుగులోకి", "అనువదించు"]):
            return {
                "agent": "Agent 2 (Finance Advisor)",
                "intent": SemanticIntent.TRANSLATION.value,
                "confidence": 0.98,
                "numericEntities": num_entities,
                "targetAmount": None,
                "reasoning": "Language translation request.",
            }

        # 2. Retrieval Evidence (Independently recognizes vector store queries; avoids bank document collision)
        is_retrieval_evidence = any(w in q for w in [
            "chromadb", "retrieval evidence", "retrieved chunks", "retrieved documents", "chunks containing",
            "did your retrieved", "mentioned in chromadb", "evidence for the", "show me evidence",
            "search the retrieved documents", "రిట్రీవల్ ఆధారాలు", "క్రోమాడీబీ ఆధారాలు", "ఆధారాలు చూపించు"
        ])
        if is_retrieval_evidence:
            search_val = next((n["value"] for n in num_entities if n["role"] == NumericRole.SEARCH_TARGET_VALUE.value), None)
            return {
                "agent": "Agent 2 (Finance Advisor)",
                "intent": SemanticIntent.RETRIEVAL_EVIDENCE.value,
                "confidence": 0.99,
                "numericEntities": num_entities,
                "targetAmount": None,
                "searchTargetValue": search_val,
                "reasoning": "Query explicitly refers to ChromaDB retrieval chunks, not bank loan paperwork.",
            }

        # 3. Provenance Query
        is_provenance = any(w in q for w in [
            "where did your", "where did that", "where did the", "where does", "why did you calculate",
            "why is the answer", "figure come from", "source of your", "how did you calculate", "how did you get",
            "show me the formula", "formula for", "explain how you calculated",
            "ఎక్కడి నుండి వచ్చింది", "ఎలా వచ్చింది", "ఎందుకు లెక్కించారు", "సూత్రం ఏమిటి"
        ])
        if is_provenance:
            prev_val = next((n["value"] for n in num_entities if n["role"] == NumericRole.PREVIOUS_ANSWER_VALUE.value), None)
            if not prev_val and num_entities:
                prev_val = num_entities[0]["value"]
            return {
                "agent": "Agent 2 (Finance Advisor)",
                "intent": SemanticIntent.PROVENANCE.value,
                "confidence": 0.96,
                "numericEntities": num_entities,
                "targetAmount": None,
                "previousAnswerValue": prev_val,
                "reasoning": "Financial provenance inquiry regarding figure derivation.",
            }

        # 4. Comparison Query
        is_comparison = any(w in q for w in [
            "compare", "comparison", "difference between", "versus", "vs", "monthly with", "annually with",
            "పోల్చండి", "పోలిక", "తేడా", "రెండు ఆప్షన్లు"
        ])
        if is_comparison:
            comp_vals = [n["value"] for n in num_entities if n["role"] == NumericRole.COMPARISON_VALUE.value]
            return {
                "agent": "Agent 2 (Finance Advisor)",
                "intent": SemanticIntent.COMPARISON.value,
                "confidence": 0.95,
                "numericEntities": num_entities,
                "targetAmount": None,
                "comparisonValues": comp_vals,
                "reasoning": "Financial comparative analysis.",
            }

        # 5. Forward Unit Calculation (10 cows)
        unit_param = next((n for n in num_entities if n["role"] == NumericRole.INPUT_PARAMETER.value), None)
        is_forward_calc = (unit_param is not None) and any(w in q for w in [
            "calculate", "profit from", "income from", "return from", "earnings from", "how much from",
            "లాభం ఎంత", "ఆదాయం ఎంత", "లెక్కించండి"
        ])
        if is_forward_calc and unit_param:
            return {
                "agent": "Agent 2 (Finance Advisor)",
                "intent": SemanticIntent.FORWARD_CALCULATION.value,
                "confidence": 0.97,
                "numericEntities": num_entities,
                "targetAmount": None,
                "inputUnits": unit_param["value"],
                "unitEntity": unit_param["unit"],
                "reasoning": f"Forward profit calculation for {unit_param['value']} {unit_param['unit']}.",
            }

        # 6. Moratorium & Seasonal Grace
        if any(k in q for k in ["moratorium", "summer", "lean", "grace", "pause", "skip emi", "మారటోరియం", "వేసవి"]):
            return {
                "agent": "Agent 2 (Finance Advisor)",
                "intent": "moratorium_guidance",
                "confidence": 0.98,
                "numericEntities": num_entities,
                "targetAmount": None,
                "reasoning": "Seasonal repayment grace period and moratorium advice.",
            }

        # 7. Investment Decision / Asset Purchase (AC / Machinery)
        is_investment_eval = any(k in q for k in [
            "should i buy", "can i buy", "want to buy", "is that a good investment", "good investment",
            "is it safe to buy", "safe for me to buy", "is it safe to invest", "is it profitable",
            "buy an air conditioner", "buy an ac", "buy a machine", "buy equipment", "కొనవచ్చా", "మంచి పెట్టుబడేనా"
        ])
        if is_investment_eval:
            amt = next((n["value"] for n in num_entities if n["role"] in (NumericRole.CAPITAL_OUTLAY.value, NumericRole.TARGET_PROFIT.value, NumericRole.UNKNOWN.value)), None)
            return {
                "agent": "Agent 2 (Finance Advisor)",
                "intent": "investment_decision",
                "confidence": 0.96,
                "numericEntities": num_entities,
                "targetAmount": amt,
                "reasoning": "Capital asset purchase safety, ROI, and affordability evaluation.",
            }

        # 8. Target profit / Capacity ("How many cows to make ₹7,500?")
        target_entity = next((n for n in num_entities if n["role"] == NumericRole.TARGET_PROFIT.value), None)
        is_how_many = any(k in q for k in [
            "how many", "number of", "cows do i need", "cows should i buy", "buffaloes do i need",
            "looms do i need", "how many units", "ఎన్ని ఆవులు", "ఎన్ని బర్రెలు", "ఎన్ని కావాలి"
        ])
        if (is_how_many and target_entity) or (target_entity and any(k in q for k in ["target", "target profit", "లక్ష్యం"])):
            return {
                "agent": "Agent 2 (Finance Advisor)",
                "intent": "target_profit_capacity",
                "confidence": 0.98,
                "numericEntities": num_entities,
                "targetAmount": target_entity["value"],
                "reasoning": f"Target profit capacity planning for ₹{target_entity['value']:,.0f}.",
            }

        # 9. Loan Simulation / Scheme Calculation
        if any(w in q for w in ["simulate", "simulation", "simulate the loan", "calculate emi for scheme", "సిమ్యులేట్"]):
            amt = next((n["value"] for n in num_entities if n["role"] == NumericRole.LOAN_AMOUNT.value), None)
            return {
                "agent": "Agent 2 (Finance Advisor)",
                "intent": SemanticIntent.LOAN_SIMULATION.value,
                "confidence": 0.95,
                "numericEntities": num_entities,
                "targetAmount": amt,
                "reasoning": "Loan simulation and scheme amortization calculation.",
            }

        # 10. Loan Affordability
        if any(k in q for k in ["afford", "can i take", "can i borrow", "safe to take", "తీసుకోవచ్చా", "భరించగలనా"]):
            amt = next((n["value"] for n in num_entities if n["role"] == NumericRole.LOAN_AMOUNT.value), None)
            return {
                "agent": "Agent 2 (Finance Advisor)",
                "intent": "loan_affordability",
                "confidence": 0.95,
                "numericEntities": num_entities,
                "targetAmount": amt,
                "reasoning": "Underwriting debt-service coverage ratio (DSCR) affordability.",
            }

        # 11. Government Schemes
        if any(k in q for k in ["scheme", "eligible", "government scheme", "subsidies", "subsidy", "పథకాలు", "ప్రభుత్వ పథకాలు"]):
            return {
                "agent": "Agent 2 (Finance Advisor)",
                "intent": "government_schemes",
                "confidence": 0.94,
                "numericEntities": num_entities,
                "targetAmount": None,
                "reasoning": "Demographic credit scheme eligibility evaluation.",
            }

        # 12. Bank Documentation (Only when genuine bank loan paperwork is meant)
        if any(k in q for k in ["bank require", "kyc", "apply for loan", "loan approval docs", "బ్యాంక్ కాగితాలు", "రుణ పత్రాలు"]):
            return {
                "agent": "Agent 2 (Finance Advisor)",
                "intent": "document_requirements",
                "confidence": 0.92,
                "numericEntities": num_entities,
                "targetAmount": None,
                "reasoning": "Bank loan KYC and appraisal documentation requirements.",
            }

        # 13. Debt Management
        if any(k in q for k in ["manage", "handle", "balance", "structure", "నిర్వహణ"]) and any(w in q for w in ["debt", "loan", "loans", "emi", "expense"]):
            return {
                "agent": "Agent 2 (Finance Advisor)",
                "intent": "debt_management",
                "confidence": 0.95,
                "numericEntities": num_entities,
                "targetAmount": None,
                "reasoning": "Multi-obligation debt and cash-flow management.",
            }

        # Default open-ended planning
        return {
            "agent": "Agent 2 (Finance Advisor)",
            "intent": "open_ended_planning",
            "confidence": 0.85,
            "numericEntities": num_entities,
            "targetAmount": None,
            "reasoning": "Open-ended financial advisory reasoning.",
        }

    @classmethod
    def resolve_consensus(
        cls,
        agent1_res: Dict[str, Any],
        agent2_res: Dict[str, Any],
        query: str,
        history: Optional[List[Any]] = None,
    ) -> Dict[str, Any]:
        """
        Cross-Agent Consensus & Conflict Resolution Engine.
        Reconciles interpretations using explicit user instructions, requested format,
        numeric semantic roles, and conversation history.
        """
        a1_intent = agent1_res.get("intent")
        a2_intent = agent2_res.get("intent")

        # Case 1: Both agents agree on exact or equivalent intent
        if a1_intent == a2_intent or (
            a1_intent == SemanticIntent.CAPACITY_CALCULATION.value and a2_intent == "target_profit_capacity"
        ) or (
            a1_intent == SemanticIntent.GOVERNMENT_SCHEMES.value and a2_intent == "government_schemes"
        ) or (
            a1_intent == SemanticIntent.RETRIEVAL_EVIDENCE.value and a2_intent == SemanticIntent.RETRIEVAL_EVIDENCE.value
        ) or (
            a1_intent == SemanticIntent.PROVENANCE.value and a2_intent == SemanticIntent.PROVENANCE.value
        ):
            chosen = a1_intent if a1_intent != "target_profit_capacity" else SemanticIntent.CAPACITY_CALCULATION.value
            return {
                "consensusIntent": chosen,
                "status": "AGREED",
                "agent1Intent": a1_intent,
                "agent2Intent": a2_intent,
                "resolutionMethod": "Direct Consensus Agreement",
                "numericEntities": agent1_res.get("numericEntities", []),
                "targetAmount": agent1_res.get("targetAmount") or agent2_res.get("targetAmount"),
                "inputUnits": agent1_res.get("inputUnits") or agent2_res.get("inputUnits"),
                "previousAnswerValue": agent1_res.get("previousAnswerValue") or agent2_res.get("previousAnswerValue"),
                "searchTargetValue": agent1_res.get("searchTargetValue") or agent2_res.get("searchTargetValue"),
                "comparisonValues": agent1_res.get("comparisonValues") or agent2_res.get("comparisonValues"),
            }

        # Case 2: Priority Resolution for Explicit Meta-Commands (Evidence, Provenance, Translation, Comparison)
        priority_intents = [
            SemanticIntent.RETRIEVAL_EVIDENCE.value,
            SemanticIntent.PROVENANCE.value,
            SemanticIntent.TRANSLATION.value,
            SemanticIntent.COMPARISON.value,
            SemanticIntent.FORWARD_CALCULATION.value,
        ]
        for p in priority_intents:
            if a1_intent == p or a2_intent == p:
                return {
                    "consensusIntent": p,
                    "status": "RESOLVED_BY_PRIORITY",
                    "agent1Intent": a1_intent,
                    "agent2Intent": a2_intent,
                    "resolutionMethod": f"Explicit Meta-Operation Priority ({p})",
                    "numericEntities": agent1_res.get("numericEntities", []) or agent2_res.get("numericEntities", []),
                    "targetAmount": agent1_res.get("targetAmount") or agent2_res.get("targetAmount"),
                    "inputUnits": agent1_res.get("inputUnits") or agent2_res.get("inputUnits"),
                    "previousAnswerValue": agent1_res.get("previousAnswerValue") or agent2_res.get("previousAnswerValue"),
                    "searchTargetValue": agent1_res.get("searchTargetValue") or agent2_res.get("searchTargetValue"),
                    "comparisonValues": agent1_res.get("comparisonValues") or agent2_res.get("comparisonValues"),
                }

        # Case 3: Domain / Screen Contextual Arbitration
        conf1 = agent1_res.get("confidence", 0.5)
        conf2 = agent2_res.get("confidence", 0.5)
        chosen = a1_intent if conf1 >= conf2 else a2_intent

        return {
            "consensusIntent": chosen,
            "status": "RESOLVED_BY_CONFIDENCE",
            "agent1Intent": a1_intent,
            "agent2Intent": a2_intent,
            "resolutionMethod": f"Confidence Arbitration ({max(conf1, conf2):.2f})",
            "numericEntities": agent1_res.get("numericEntities", []),
            "targetAmount": agent1_res.get("targetAmount") or agent2_res.get("targetAmount"),
            "inputUnits": agent1_res.get("inputUnits") or agent2_res.get("inputUnits"),
        }

intent_orchestrator = SemanticIntentEngine()
