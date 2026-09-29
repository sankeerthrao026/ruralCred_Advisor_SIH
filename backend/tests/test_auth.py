import pytest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException
from app.auth import get_auth_context, AuthContext
from app.config import settings
from app.services.firestore_service import FirestoreService

def test_demo_auth_default():
    ctx = get_auth_context(authorization=None, x_user_id=None, x_auth_mode=None)
    assert ctx.mode == "demo"
    assert ctx.user_id == "demo_default"

def test_demo_auth_personas():
    for persona in ["demo-anita", "demo-ramesh", "demo-lakshmi", "demo_custom_123"]:
        ctx = get_auth_context(authorization=None, x_user_id=persona, x_auth_mode="demo")
        assert ctx.mode == "demo"
        assert ctx.user_id == persona

def test_demo_auth_invalid_id():
    with pytest.raises(HTTPException) as exc_info:
        get_auth_context(authorization=None, x_user_id="demo_!", x_auth_mode="demo")
    assert exc_info.value.status_code == 400

def test_demo_mode_disabled_without_token():
    original_demo = settings.DEMO_MODE
    try:
        settings.DEMO_MODE = False
        with pytest.raises(HTTPException) as exc_info:
            get_auth_context(authorization=None, x_user_id="demo-anita", x_auth_mode="demo")
        assert exc_info.value.status_code == 401
    finally:
        settings.DEMO_MODE = original_demo

def test_bearer_token_verification_success():
    mock_decoded = {
        "uid": "firebase_user_999",
        "email": "user999@ruralcred.in"
    }
    with patch("firebase_admin.auth.verify_id_token", return_value=mock_decoded):
        ctx = get_auth_context(authorization="Bearer mock_valid_token_xyz")
        assert ctx.mode == "authenticated"
        assert ctx.user_id == "firebase_user_999"
        assert ctx.email == "user999@ruralcred.in"

def test_bearer_token_verification_invalid():
    with patch("firebase_admin.auth.verify_id_token", side_effect=Exception("Token expired")):
        with pytest.raises(HTTPException) as exc_info:
            get_auth_context(authorization="Bearer expired_token")
        assert exc_info.value.status_code == 401
        assert "Invalid or expired authentication token" in exc_info.value.detail

def test_firestore_service_crud():
    svc = FirestoreService()
    test_uid = "test_verification_user"
    test_profile = {
        "name": "Integration Test User",
        "businessName": "Test Enterprises",
        "category": "Dairy Farming",
        "marginCapital": 50000,
        "hasActiveLoan": False,
        "simulatingSecondLoan": False
    }
    svc.save_user_profile(test_uid, test_profile)
    fetched = svc.get_user_profile(test_uid)
    assert fetched is not None
    assert fetched["name"] == "Integration Test User"
    assert fetched["marginCapital"] == 50000

    # Test logbook
    test_entry = {
        "id": "test-entry-1",
        "date": "28 Sep 2026",
        "amount": 1500,
        "type": "income",
        "category": "Sales",
        "note": "Test income",
        "timestamp": 1759000000000
    }
    svc.save_user_logbook_entry(test_uid, test_entry)
    entries = svc.get_user_logbook(test_uid)
    assert any(e["id"] == "test-entry-1" for e in entries)

    # Clean up entry
    svc.delete_user_logbook_entry(test_uid, "test-entry-1")
    entries_after = svc.get_user_logbook(test_uid)
    assert not any(e["id"] == "test-entry-1" for e in entries_after)

def test_firestore_service_khata_crud():
    svc = FirestoreService()
    test_uid = "test_verification_user_khata"
    test_khata = {
        "id": "khata-entry-1",
        "partyName": "Saraswathi Master Weavers",
        "partyPhone": "9848011223",
        "type": "customer_credit",
        "amount": 12000,
        "paidAmount": 4000,
        "dateGiven": "25 Sep 2026",
        "status": "partially_paid",
        "notes": "Handloom wedding sarees credit",
        "payments": [
            {"id": "pay-1", "amount": 4000, "date": "27 Sep 2026", "timestamp": 1759000000000}
        ],
        "timestamp": 1759000000000
    }
    svc.save_user_khata_entry(test_uid, test_khata)
    entries = svc.get_user_khata(test_uid)
    assert any(e["id"] == "khata-entry-1" for e in entries)
    entry = next(e for e in entries if e["id"] == "khata-entry-1")
    assert entry["partyName"] == "Saraswathi Master Weavers"
    assert entry["amount"] == 12000
    assert entry["paidAmount"] == 4000

