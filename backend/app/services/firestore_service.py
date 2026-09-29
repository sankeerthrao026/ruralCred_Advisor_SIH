import os
import json
from pathlib import Path
from typing import Dict, Any, Optional, List
from app.config import settings

LOCAL_STORE_DIR = Path(settings.CHROMA_PERSIST_DIR).parent / "local_store"
LOCAL_STORE_DIR.mkdir(parents=True, exist_ok=True)

class FirestoreService:
    def __init__(self):
        self.firebase_initialized = False
        self.db = None
        self._init_firebase()

    def _init_firebase(self):
        try:
            import firebase_admin
            from firebase_admin import credentials, firestore

            if firebase_admin._apps:
                self.db = firestore.client()
                self.firebase_initialized = True
                return

            # Option 1: File path via GOOGLE_APPLICATION_CREDENTIALS
            gac_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
            if gac_path and Path(gac_path).exists():
                cred = credentials.Certificate(gac_path)
                firebase_admin.initialize_app(cred)
                self.db = firestore.client()
                self.firebase_initialized = True
                return

            # Option 2: Environment variables
            if settings.FIREBASE_PROJECT_ID and settings.FIREBASE_CLIENT_EMAIL and settings.FIREBASE_PRIVATE_KEY:
                cred_dict = {
                    "type": "service_account",
                    "project_id": settings.FIREBASE_PROJECT_ID,
                    "client_email": settings.FIREBASE_CLIENT_EMAIL,
                    "private_key": settings.FIREBASE_PRIVATE_KEY.replace('\\n', '\n'),
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
                self.db = firestore.client()
                self.firebase_initialized = True
        except Exception as e:
            # Resilient fallback to user-isolated persistent local JSON store
            self.firebase_initialized = False
            self.db = None

    def _get_user_file(self, user_id: str, collection: str) -> Path:
        safe_id = "".join([c if c.isalnum() or c in "-_" else "_" for c in user_id])
        user_dir = LOCAL_STORE_DIR / safe_id
        user_dir.mkdir(parents=True, exist_ok=True)
        return user_dir / f"{collection}.json"

    # ---------------- User Profile ----------------
    def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        if self.firebase_initialized and self.db:
            try:
                doc = self.db.collection("users").document(user_id).get()
                if doc.exists:
                    return doc.to_dict()
            except Exception:
                pass

        # Fallback local user store
        p_file = self._get_user_file(user_id, "profile")
        if p_file.exists():
            try:
                return json.loads(p_file.read_text(encoding="utf-8"))
            except Exception:
                pass
        return None

    def save_user_profile(self, user_id: str, data: Dict[str, Any]):
        if self.firebase_initialized and self.db:
            try:
                self.db.collection("users").document(user_id).set(data, merge=True)
            except Exception:
                pass

        p_file = self._get_user_file(user_id, "profile")
        p_file.write_text(json.dumps(data, indent=2), encoding="utf-8")

    # ---------------- User Logbook ----------------
    def get_user_logbook(self, user_id: str) -> List[Dict[str, Any]]:
        if self.firebase_initialized and self.db:
            try:
                docs = (
                    self.db.collection("users")
                    .document(user_id)
                    .collection("logbook")
                    .order_by("timestamp", direction=firestore.Query.DESCENDING)
                    .stream()
                )
                return [{"id": d.id, **d.to_dict()} for d in docs]
            except Exception:
                pass

        l_file = self._get_user_file(user_id, "logbook")
        if l_file.exists():
            try:
                return json.loads(l_file.read_text(encoding="utf-8"))
            except Exception:
                pass
        return []

    def save_user_logbook_entry(self, user_id: str, entry: Dict[str, Any]) -> Dict[str, Any]:
        if self.firebase_initialized and self.db:
            try:
                doc_ref = self.db.collection("users").document(user_id).collection("logbook").document(entry["id"])
                doc_ref.set(entry)
            except Exception:
                pass

        current = self.get_user_logbook(user_id)
        # Prepend new entry
        updated = [entry] + [e for e in current if e.get("id") != entry["id"]]
        l_file = self._get_user_file(user_id, "logbook")
        l_file.write_text(json.dumps(updated, indent=2), encoding="utf-8")
        return entry

    def delete_user_logbook_entry(self, user_id: str, entry_id: str):
        if self.firebase_initialized and self.db:
            try:
                self.db.collection("users").document(user_id).collection("logbook").document(entry_id).delete()
            except Exception:
                pass

        current = self.get_user_logbook(user_id)
        updated = [e for e in current if e.get("id") != entry_id]
        l_file = self._get_user_file(user_id, "logbook")
        l_file.write_text(json.dumps(updated, indent=2), encoding="utf-8")

    # ---------------- User Khata ----------------
    def get_user_khata(self, user_id: str) -> List[Dict[str, Any]]:
        if self.firebase_initialized and self.db:
            try:
                docs = (
                    self.db.collection("users")
                    .document(user_id)
                    .collection("khata")
                    .order_by("timestamp", direction=firestore.Query.DESCENDING)
                    .stream()
                )
                return [{"id": d.id, **d.to_dict()} for d in docs]
            except Exception:
                pass

        k_file = self._get_user_file(user_id, "khata")
        if k_file.exists():
            try:
                return json.loads(k_file.read_text(encoding="utf-8"))
            except Exception:
                pass
        return []

    def save_user_khata_entry(self, user_id: str, entry: Dict[str, Any]) -> Dict[str, Any]:
        if self.firebase_initialized and self.db:
            try:
                doc_ref = self.db.collection("users").document(user_id).collection("khata").document(entry["id"])
                doc_ref.set(entry)
            except Exception:
                pass

        current = self.get_user_khata(user_id)
        updated = [entry] + [e for e in current if e.get("id") != entry["id"]]
        k_file = self._get_user_file(user_id, "khata")
        k_file.write_text(json.dumps(updated, indent=2), encoding="utf-8")
        return entry

    # ---------------- User Conversations & Messages ----------------
    def get_user_conversations(self, user_id: str, advisor_type: Optional[str] = None) -> List[Dict[str, Any]]:
        if self.firebase_initialized and self.db:
            try:
                import firebase_admin
                from firebase_admin import firestore
                col = self.db.collection("users").document(user_id).collection("conversations")
                if advisor_type:
                    query = col.where("advisorType", "==", advisor_type).order_by("updatedAt", direction=firestore.Query.DESCENDING)
                else:
                    query = col.order_by("updatedAt", direction=firestore.Query.DESCENDING)
                docs = query.stream()
                return [{"id": d.id, **d.to_dict()} for d in docs]
            except Exception:
                pass

        c_file = self._get_user_file(user_id, "conversations")
        if c_file.exists():
            try:
                data = json.loads(c_file.read_text(encoding="utf-8"))
                if advisor_type:
                    return [c for c in data if c.get("advisorType") == advisor_type]
                return data
            except Exception:
                pass
        return []

    def save_user_conversation(self, user_id: str, conv_meta: Dict[str, Any]) -> Dict[str, Any]:
        if self.firebase_initialized and self.db:
            try:
                self.db.collection("users").document(user_id).collection("conversations").document(conv_meta["id"]).set(conv_meta, merge=True)
            except Exception:
                pass

        current = self.get_user_conversations(user_id)
        updated = [conv_meta] + [c for c in current if c.get("id") != conv_meta["id"]]
        c_file = self._get_user_file(user_id, "conversations")
        c_file.write_text(json.dumps(updated, indent=2), encoding="utf-8")
        return conv_meta

    def delete_user_conversation(self, user_id: str, conversation_id: str):
        if self.firebase_initialized and self.db:
            try:
                # Delete nested messages
                msgs = self.db.collection("users").document(user_id).collection("conversations").document(conversation_id).collection("messages").stream()
                for m in msgs:
                    m.reference.delete()
                # Delete conversation document
                self.db.collection("users").document(user_id).collection("conversations").document(conversation_id).delete()
            except Exception:
                pass

        current = self.get_user_conversations(user_id)
        updated = [c for c in current if c.get("id") != conversation_id]
        c_file = self._get_user_file(user_id, "conversations")
        c_file.write_text(json.dumps(updated, indent=2), encoding="utf-8")

    def get_conversation_messages(self, user_id: str, conversation_id: str) -> List[Dict[str, Any]]:
        if self.firebase_initialized and self.db:
            try:
                import firebase_admin
                from firebase_admin import firestore
                docs = self.db.collection("users").document(user_id).collection("conversations").document(conversation_id).collection("messages").order_by("timestamp", direction=firestore.Query.ASCENDING).stream()
                return [{"id": d.id, **d.to_dict()} for d in docs]
            except Exception:
                pass

        m_file = self._get_user_file(user_id, f"conv_msgs_{conversation_id}")
        if m_file.exists():
            try:
                return json.loads(m_file.read_text(encoding="utf-8"))
            except Exception:
                pass
        return []

    def save_conversation_message(self, user_id: str, conversation_id: str, message: Dict[str, Any]) -> Dict[str, Any]:
        if self.firebase_initialized and self.db:
            try:
                self.db.collection("users").document(user_id).collection("conversations").document(conversation_id).collection("messages").document(message["id"]).set(message, merge=True)
            except Exception:
                pass

        current = self.get_conversation_messages(user_id, conversation_id)
        updated = [m for m in current if m.get("id") != message["id"]] + [message]
        m_file = self._get_user_file(user_id, f"conv_msgs_{conversation_id}")
        m_file.write_text(json.dumps(updated, indent=2), encoding="utf-8")
        return message

firestore_service = FirestoreService()
