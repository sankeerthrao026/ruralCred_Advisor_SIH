import pytest
from app.services.chroma_service import chroma_service
from app.services.rag_service import rag_service
from app.models.schemas import AdvisorAnalyzeRequest
from app.services.business_calculator import business_calculator, detect_business_domain

def test_chroma_semantic_retrieval():
    assert chroma_service.get_count() > 0
    results = chroma_service.query_similar("dairy farming Warangal milk yield", n_results=2)
    assert len(results) > 0
    match_ids = [r["id"] for r in results]
    assert any("dairy" in mid or "warangal" in mid for mid in match_ids)

def test_rag_pipeline_execution():
    req = AdvisorAnalyzeRequest(
        location="Warangal, Telangana",
        category="Dairy Farming",
        marginCapital=100000.0,
        language="en",
    )
    analysis = rag_service.analyze_business_opportunity(req)
    assert analysis.marketReach.headline != ""
    assert len(analysis.opportunityAnalysis.primaryDrivers) > 0
    assert len(analysis.swot.strengths) > 0
    assert len(analysis.swot.weaknesses) > 0
    assert analysis.pricingSuggestion.recommendedBand != ""
    assert len(analysis.sourcesUsed) > 0

def test_interactive_conversation_rag():
    # Turn 1: Initial question
    turn1_req = AdvisorAnalyzeRequest(
        location="Warangal, Telangana",
        category="Dairy Farming",
        marginCapital=150000.0,
        language="en",
    )
    turn1_res = rag_service.analyze_business_opportunity(turn1_req)
    assert turn1_res.reply is not None
    assert "Warangal" in turn1_res.groundedFacts.district or "Warangal" in turn1_res.reply

    # Turn 2: Follow-up question about expanding to neighboring village
    history_turn2 = [
        {"role": "user", "content": "How viable is dairy farming in Warangal?"},
        {"role": "assistant", "content": turn1_res.reply},
    ]
    turn2_req = AdvisorAnalyzeRequest(
        location="Warangal, Telangana",
        category="Dairy Farming",
        marginCapital=150000.0,
        language="en",
        userQuery="What if I expand to the next village?",
        history=history_turn2,
    )
    turn2_res = rag_service.analyze_business_opportunity(turn2_req)
    assert turn2_res.reply is not None
    assert "expand" in turn2_res.reply.lower() or "village" in turn2_res.reply.lower() or "25%" in turn2_res.reply

    # Turn 3: Follow-up question about feed suppliers
    history_turn3 = [
        *history_turn2,
        {"role": "user", "content": "What if I expand to the next village?"},
        {"role": "assistant", "content": turn2_res.reply},
    ]
    turn3_req = AdvisorAnalyzeRequest(
        location="Warangal, Telangana",
        category="Dairy Farming",
        marginCapital=150000.0,
        language="en",
        userQuery="Where can I buy feed cheaper?",
        history=history_turn3,
    )
    turn3_res = rag_service.analyze_business_opportunity(turn3_req)
    assert turn3_res.reply is not None
    assert "feed" in turn3_res.reply.lower() or "apmc" in turn3_res.reply.lower() or "mandi" in turn3_res.reply.lower()

def test_handloom_location_selection_no_dairy_contamination():
    # User's default profile is Dairy Farming, but user asks about handloom shop locations
    req = AdvisorAnalyzeRequest(
        location="Warangal",
        category="Dairy Farming",
        marginCapital=100000.0,
        language="en",
        userQuery="Suggest me places where if I establish my handloom shop I can get great profits",
    )
    res = rag_service.analyze_business_opportunity(req)
    assert res.reply is not None

    reply_lower = res.reply.lower()
    # Check that handloom clusters and factors are included
    assert "handloom" in reply_lower or "pembarti" in reply_lower or "jangaon" in reply_lower or "hanamkonda" in reply_lower
    # Strictly zero dairy contamination
    dairy_words = ["milch", "2-cow unit", "cow", "cows", "buffalo", "milk yield"]
    for dw in dairy_words:
        assert dw not in reply_lower, f"Found dairy contamination word '{dw}' in handloom location response!"

def test_multiturn_domain_switching_and_retention():
    # Turn 1: User asks about handloom shop
    turn1_req = AdvisorAnalyzeRequest(
        location="Warangal",
        category="Dairy Farming",
        marginCapital=100000.0,
        language="en",
        userQuery="Suggest me places where if I establish my handloom shop I can get great profits",
    )
    turn1_res = rag_service.analyze_business_opportunity(turn1_req)

    # Turn 2: Follow up: "which localities can give me the best profits" (context must retain handloom!)
    history_turn2 = [
        {"role": "user", "content": "Suggest me places where if I establish my handloom shop I can get great profits"},
        {"role": "assistant", "content": turn1_res.reply},
    ]
    turn2_req = AdvisorAnalyzeRequest(
        location="Warangal",
        category="Dairy Farming",
        marginCapital=100000.0,
        language="en",
        userQuery="which localities can give me the best profits",
        history=history_turn2,
    )
    turn2_res = rag_service.analyze_business_opportunity(turn2_req)
    assert turn2_res.reply is not None

    turn2_lower = turn2_res.reply.lower()
    assert "handloom" in turn2_lower or "pembarti" in turn2_lower or "jangaon" in turn2_lower or "hanamkonda" in turn2_lower or "cluster" in turn2_lower
    dairy_words = ["milch", "2-cow unit", "cows", "buffalo", "milk yield"]
    for dw in dairy_words:
        assert dw not in turn2_lower, f"Found dairy contamination word '{dw}' in follow-up query!"

def test_investment_decision_ac_for_dairy_farm():
    req = AdvisorAnalyzeRequest(
        location="Warangal",
        category="Dairy Farming",
        marginCapital=100000.0,
        language="en",
        userQuery="Let's say I want to buy an air conditioner for my dairy farm. Is that a good investment with my financial history? Is it safe for me to buy an air conditioner? Is it profitable?",
    )
    res = rag_service.analyze_business_opportunity(req)
    assert res.reply is not None
    reply_lower = res.reply.lower()
    assert "air conditioner" in reply_lower or "ac" in reply_lower
    assert any(term in reply_lower for term in [
        "shade net", "fogger", "misting", "alternative", "viable", "unprofitable",
        "not a good investment", "not profitable", "investment", "capital"
    ])

def test_capacity_calculation_handloom():
    req = AdvisorAnalyzeRequest(
        location="Warangal",
        category="Handloom & Powerloom Weaving",
        marginCapital=100000.0,
        language="en",
        userQuery="How many looms do I need to make ₹3 lakh profit annually?",
    )
    res = rag_service.analyze_business_opportunity(req)
    assert res.reply is not None
    reply_lower = res.reply.lower()
    assert "handloom" in reply_lower or "loom" in reply_lower or "saree" in reply_lower
    assert "cow" not in reply_lower and "milch" not in reply_lower

def test_retail_kirana_location_selection():
    req = AdvisorAnalyzeRequest(
        location="Warangal",
        category="Rural Grocery / Kirana",
        marginCapital=50000.0,
        language="en",
        userQuery="Where should I open my kirana shop to get good footfall?",
    )
    res = rag_service.analyze_business_opportunity(req)
    assert res.reply is not None
    reply_lower = res.reply.lower()
    assert "kirana" in reply_lower or "store" in reply_lower or "bus stand" in reply_lower or "panchayat" in reply_lower or "residential" in reply_lower
    assert "cow" not in reply_lower and "milch" not in reply_lower

def test_retrieval_evidence_inspection_provenance():
    q = (
        "Show me the ChromaDB retrieval evidence for your previous answer. Return ONLY: "
        "1. ChromaDB collection name, 2. Number of chunks retrieved, 3. Retrieved document/chunk IDs, "
        "4. Similarity scores/distances, 5. The exact retrieved text containing the ₹7,500/month and ₹90,000/year figures"
    )
    intent = business_calculator.classify_intent(q, fallback_category="Dairy Farming")
    assert intent["intent"] == "retrieval_evidence_inspection"

    req = AdvisorAnalyzeRequest(
        location="Warangal",
        category="Dairy Farming",
        marginCapital=100000.0,
        language="en",
        userQuery=q
    )
    res = rag_service.analyze_business_opportunity(req)
    assert res.reply is not None
    assert "1. ChromaDB Collection Name:" in res.reply
    assert "ruralcred_knowledge" in res.reply
    assert "2. Number of Chunks Retrieved:" in res.reply
    assert "3. Retrieved Document/Chunk IDs:" in res.reply
    assert "4. Similarity Scores / Distances:" in res.reply
    assert "5. Exact Retrieved Text & Figure Provenance" in res.reply
    assert "DETERMINISTIC BUSINESS CALCULATION ENGINE (CALCULATED_SOURCE)" in res.reply
    assert "ruralcred_knowledge" in res.providerUsed

def test_provenance_query():
    q = "Where did the ₹90,000/year and ₹7,500/month figures come from? Show the mathematical formula and source"
    intent = business_calculator.classify_intent(q, fallback_category="Dairy Farming")
    assert intent["intent"] == "provenance_query"
    assert intent["primary_role"] == "PREVIOUS_ANSWER_VALUE"

    req = AdvisorAnalyzeRequest(
        location="Warangal",
        category="Dairy Farming",
        marginCapital=100000.0,
        language="en",
        userQuery=q
    )
    res = rag_service.analyze_business_opportunity(req)
    assert res.reply is not None
    assert "Derivation of" in res.reply or "formula" in res.reply.lower() or "165,000" in res.reply
    assert "75,000" in res.reply
    assert "90,000" in res.reply

def test_forward_unit_calculation():
    q = "Calculate profit from 10 cows"
    intent = business_calculator.classify_intent(q, fallback_category="Dairy Farming")
    assert intent["intent"] == "forward_unit_calculation"
    assert intent["input_units"] == 10
    assert intent["primary_role"] == "INPUT_PARAMETER"

    req = AdvisorAnalyzeRequest(
        location="Warangal",
        category="Dairy Farming",
        marginCapital=100000.0,
        language="en",
        userQuery=q
    )
    res = rag_service.analyze_business_opportunity(req)
    assert res.reply is not None
    assert "10" in res.reply
    assert "9,00,000" in res.reply or "900,000" in res.reply or "75,000" in res.reply

def test_comparison_query():
    q = "Compare ₹7,500 monthly profit with ₹90,000 annual profit"
    intent = business_calculator.classify_intent(q, fallback_category="Dairy Farming")
    assert intent["intent"] == "comparison_query"
    assert intent["primary_role"] == "COMPARISON_VALUE"

    req = AdvisorAnalyzeRequest(
        location="Warangal",
        category="Dairy Farming",
        marginCapital=100000.0,
        language="en",
        userQuery=q
    )
    res = rag_service.analyze_business_opportunity(req)
    assert res.reply is not None
    assert "Comparison" in res.reply or "comparison" in res.reply.lower() or "equivalent" in res.reply.lower()

def test_translation_query():
    q = "Translate your previous answer into Telugu"
    intent = business_calculator.classify_intent(q, fallback_category="Dairy Farming")
    assert intent["intent"] == "translation_query"

    req = AdvisorAnalyzeRequest(
        location="Warangal",
        category="Dairy Farming",
        marginCapital=100000.0,
        language="en",
        userQuery=q
    )
    res = rag_service.analyze_business_opportunity(req)
    assert res.reply is not None

def test_adversarial_queries():
    # 1. Query with ₹7,500 in retrieval evidence context must NOT become capacity calculation for ₹7,500
    q1 = "Show me the ChromaDB retrieval evidence for the ₹7,500 figure"
    i1 = business_calculator.classify_intent(q1, fallback_category="Dairy Farming")
    assert i1["intent"] == "retrieval_evidence_inspection"
    assert i1["primary_role"] == "SEARCH_TARGET_VALUE"

    # 2. Query with "10 cows" must NOT become capacity calculation with ₹10 target profit
    q2 = "If I have 10 cows, what is my monthly and annual net profit?"
    i2 = business_calculator.classify_intent(q2, fallback_category="Dairy Farming")
    assert i2["intent"] == "forward_unit_calculation"
    assert i2["input_units"] == 10

    # 3. Query with "Where did ₹90,000 come from" must NOT become capacity calculation for ₹90,000
    q3 = "Where did ₹90,000 come from in your calculations?"
    i3 = business_calculator.classify_intent(q3, fallback_category="Dairy Farming")
    assert i3["intent"] == "provenance_query"
    assert i3["primary_role"] == "PREVIOUS_ANSWER_VALUE"

    # 4. Standard capacity calculation with real target profit
    q4 = "How many cows do I need to earn ₹5 lakh profit annually?"
    i4 = business_calculator.classify_intent(q4, fallback_category="Dairy Farming")
    assert i4["intent"] == "capacity_calculation"
    assert i4["target_amount"] == 500000
    assert i4["primary_role"] == "TARGET_PROFIT"

def test_retrieval_evidence_telugu():
    q = "గత సమాధానానికి సంబంధించిన క్రోమాడీబీ రిట్రీవల్ ఆధారాలు చూపించు"
    intent = business_calculator.classify_intent(q, fallback_category="Dairy Farming")
    assert intent["intent"] == "retrieval_evidence_inspection"

    req = AdvisorAnalyzeRequest(
        location="Warangal",
        category="Dairy Farming",
        marginCapital=100000.0,
        language="te",
        userQuery=q
    )
    res = rag_service.analyze_business_opportunity(req)
    assert res.reply is not None
    assert "1. క్రోమాడీబీ కలెక్షన్ పేరు (ChromaDB Collection Name):" in res.reply
    assert "ruralcred_knowledge" in res.reply
    assert "2. రిట్రీవ్ చేయబడిన చంక్స్ సంఖ్య (Number of Chunks Retrieved):" in res.reply
    assert "3. డాక్యుమెంట్ / చంక్ ఐడీలు (Retrieved Document/Chunk IDs):" in res.reply
    assert "4. సారూప్యత స్కోర్లు / దూరాలు (Similarity Scores / Distances):" in res.reply
    assert "5. ఖచ్చితమైన టెక్స్ట్ & గణాంకాల మూలం" in res.reply


