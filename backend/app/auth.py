import re
from typing import Optional, Literal
from fastapi import Header, HTTPException
from pydantic import BaseModel
from app.config import settings

class AuthContext(BaseModel):
    mode: Literal["demo", "authenticated"]
    user_id: str
    email: Optional[str] = None

DEMO_ID_REGEX = re.compile(r"^demo[_-][a-zA-Z0-9_-]{2,64}$")
AUTH_ID_REGEX = re.compile(r"^[a-zA-Z0-9_-]{3,128}$")

def get_auth_context(
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
    x_auth_mode: Optional[str] = Header(None)
) -> AuthContext:
    """
    Production authentication dependency for FastAPI routes.
    
    1. Real Firebase Auth:
       If an 'Authorization: Bearer <id_token>' header is provided, the token is verified
       cryptographically via the Firebase Admin SDK. The verified UID and email are returned.
       
    2. Demo Mode Fallback:
       If no Bearer token is provided and DEMO_MODE=True, the system gracefully accepts
       demo persona identifiers (e.g. demo-anita, demo-ramesh, demo-lakshmi) via X-User-Id.
       
    3. Production Enforcement:
       If DEMO_MODE=False and no valid Bearer token is provided, requests are strictly
       rejected with HTTP 401 Unauthorized.
    """
    # 1. Check for Bearer Token Authentication (Firebase Auth)
    if authorization and authorization.strip().startswith("Bearer "):
        token = authorization.strip()[7:].strip()
        if token:
            try:
                import firebase_admin
                from firebase_admin import auth as fb_auth
                # Ensure Firebase Admin is initialized
                from app.services.firestore_service import firestore_service

                decoded_token = fb_auth.verify_id_token(token, clock_skew_seconds=10)
                uid = decoded_token.get("uid")
                email = decoded_token.get("email")
                if not uid:
                    raise HTTPException(status_code=401, detail="Invalid token: missing UID")
                return AuthContext(mode="authenticated", user_id=uid, email=email)
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(
                    status_code=401,
                    detail=f"Invalid or expired authentication token: {str(e)}"
                )

    # 2. Demo Mode Evaluation Check
    if not settings.DEMO_MODE:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please provide a valid Bearer token in the Authorization header.",
        )

    # 3. Demo Persona Headers
    if not x_user_id:
        return AuthContext(mode="demo", user_id="demo_default")

    clean_id = x_user_id.strip()

    if clean_id.startswith("demo_") or clean_id.startswith("demo-"):
        if not DEMO_ID_REGEX.match(clean_id):
            raise HTTPException(status_code=400, detail="Invalid demo user ID format")
        return AuthContext(mode="demo", user_id=clean_id)

    if not AUTH_ID_REGEX.match(clean_id):
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    mode: Literal["demo", "authenticated"] = "demo" if x_auth_mode == "demo" else "authenticated"
    return AuthContext(mode=mode, user_id=clean_id)
