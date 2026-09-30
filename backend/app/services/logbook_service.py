import time
import uuid
from typing import List, Dict, Any
from app.models.schemas import LogbookEntry, LogbookCreate, LogbookUpdate
from app.services.firestore_service import firestore_service

INITIAL_DEMO_ENTRIES = [
    {
        "id": "demo-exp-6",
        "date": "24 Sep 2026",
        "amount": 2000.0,
        "type": "expense",
        "category": "Transport",
        "note": "Transport and delivery expenses",
        "tags": ["#transport", "#delivery"],
        "timestamp": 1789725600000,
    },
    {
        "id": "demo-inc-6",
        "date": "22 Sep 2026",
        "amount": 6000.0,
        "type": "income",
        "category": "Sales",
        "note": "Retail morning milk delivery",
        "tags": ["#morning_batch", "#retail"],
        "timestamp": 1789552800000,
    },
    {
        "id": "demo-exp-5",
        "date": "20 Sep 2026",
        "amount": 2000.0,
        "type": "expense",
        "category": "Equipment Maintenance",
        "note": "Dairy equipment maintenance",
        "tags": ["#maintenance", "#equipment"],
        "timestamp": 1789380000000,
    },
    {
        "id": "demo-inc-5",
        "date": "18 Sep 2026",
        "amount": 7500.0,
        "type": "income",
        "category": "Sales",
        "note": "Bulk milk supply",
        "tags": ["#bulk_supply", "#dairy"],
        "timestamp": 1789207200000,
    },
    {
        "id": "demo-exp-4",
        "date": "16 Sep 2026",
        "amount": 1200.0,
        "type": "expense",
        "category": "Rent & Power",
        "note": "Electricity and water",
        "tags": ["#utilities", "#electricity"],
        "timestamp": 1789034400000,
    },
    {
        "id": "demo-inc-4",
        "date": "14 Sep 2026",
        "amount": 8700.0,
        "type": "income",
        "category": "Cooperative Payout",
        "note": "Weekly cooperative milk payment",
        "tags": ["#cooperative", "#weekly_payout"],
        "timestamp": 1788861600000,
    },
    {
        "id": "demo-exp-3",
        "date": "12 Sep 2026",
        "amount": 2800.0,
        "type": "expense",
        "category": "Feed / Supplies",
        "note": "Fodder purchase",
        "tags": ["#fodder", "#green_feed"],
        "timestamp": 1788688800000,
    },
    {
        "id": "demo-inc-3",
        "date": "10 Sep 2026",
        "amount": 9800.0,
        "type": "income",
        "category": "Cooperative Payout",
        "note": "Cooperative bulk milk supply",
        "tags": ["#bulk_deal", "#cooperative"],
        "timestamp": 1788516000000,
    },
    {
        "id": "demo-exp-2",
        "date": "08 Sep 2026",
        "amount": 1500.0,
        "type": "expense",
        "category": "Healthcare / Veterinary",
        "note": "Veterinary visit and medicines",
        "tags": ["#veterinary", "#healthcare"],
        "timestamp": 1788343200000,
    },
    {
        "id": "demo-inc-2",
        "date": "06 Sep 2026",
        "amount": 5200.0,
        "type": "income",
        "category": "Sales",
        "note": "Local milk sales",
        "tags": ["#retail", "#local_sales"],
        "timestamp": 1788170400000,
    },
    {
        "id": "demo-exp-1",
        "date": "03 Sep 2026",
        "amount": 3200.0,
        "type": "expense",
        "category": "Feed / Supplies",
        "note": "Cattle feed and mineral mix",
        "tags": ["#feed", "#supplies"],
        "timestamp": 1787911200000,
    },
    {
        "id": "demo-inc-1",
        "date": "02 Sep 2026",
        "amount": 8500.0,
        "type": "income",
        "category": "Cooperative Payout",
        "note": "Weekly cooperative milk payment",
        "tags": ["#cooperative", "#milk_supply"],
        "timestamp": 1787824800000,
    },
]

class LogbookService:
    def get_entries(self, user_id: str) -> List[LogbookEntry]:
        raw_entries = firestore_service.get_user_logbook(user_id)
        if not raw_entries and ("anita" in user_id.lower() or user_id == "demo-user"):
            # Seed default demo entries for Anita Sharma evaluation persona
            for item in INITIAL_DEMO_ENTRIES:
                firestore_service.save_user_logbook_entry(user_id, item)
            raw_entries = INITIAL_DEMO_ENTRIES

        return [LogbookEntry(**e) for e in raw_entries]

    def add_entry(self, user_id: str, entry_data: LogbookCreate) -> LogbookEntry:
        new_id = f"entry-{int(time.time())}-{str(uuid.uuid4())[:6]}"
        entry_dict = {
            "id": new_id,
            "date": entry_data.date,
            "amount": float(entry_data.amount),
            "type": entry_data.type,
            "category": entry_data.category,
            "note": entry_data.note,
            "tags": entry_data.tags or [],
            "timestamp": int(time.time() * 1000),
        }
        saved = firestore_service.save_user_logbook_entry(user_id, entry_dict)
        return LogbookEntry(**saved)

    def update_entry(self, user_id: str, entry_id: str, updates: LogbookUpdate) -> LogbookEntry:
        existing = self.get_entries(user_id)
        target = None
        for e in existing:
            if e.id == entry_id:
                target = e
                break

        if target:
            target_dict = target.model_dump()
            for k, v in updates.model_dump(exclude_unset=True).items():
                if v is not None:
                    target_dict[k] = v
        else:
            target_dict = {
                "id": entry_id,
                "date": updates.date or "2026-09-20",
                "amount": float(updates.amount or 1000.0),
                "type": updates.type or "income",
                "category": updates.category or "Sales",
                "note": updates.note or "",
                "tags": updates.tags or [],
                "timestamp": int(time.time() * 1000),
            }

        saved = firestore_service.save_user_logbook_entry(user_id, target_dict)
        return LogbookEntry(**saved)

    def delete_entry(self, user_id: str, entry_id: str):
        firestore_service.delete_user_logbook_entry(user_id, entry_id)

    def calculate_aggregates(self, entries: List[LogbookEntry]) -> Dict[str, Any]:
        total_income = sum(e.amount for e in entries if e.type == "income")
        total_expenses = sum(e.amount for e in entries if e.type == "expense")
        net_cash_flow = total_income - total_expenses
        expense_ratio = (total_expenses / total_income) if total_income > 0 else 0.0

        return {
            "totalIncome": total_income,
            "totalExpenses": total_expenses,
            "netCashFlow": net_cash_flow,
            "expenseRatio": round(expense_ratio, 3),
        }

logbook_service = LogbookService()
