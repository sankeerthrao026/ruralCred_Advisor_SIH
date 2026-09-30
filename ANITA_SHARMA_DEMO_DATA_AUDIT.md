# Anita Sharma Demo Data Population & Financial Profile Audit

**Document Version**: 1.0.0  
**Audit Date**: September 29, 2026  
**Subject**: Anita Sharma Demo Account Data Population & Cash-Flow Verification  
**Environment**: Local Development & Evaluation Runtime  

---

## 1. Executive Summary

The existing **Anita Sharma** demo account has been populated with realistic test data for evaluation and demonstration of cash-flow monitoring, digital logbook, credit ledger (Khata), and financial readiness analysis.

All values are generated and stored strictly through the application's existing demo/user persistence layer (`lib/demo-session.ts`, `lib/firebase/logbook.ts`, `backend/app/services/logbook_service.py`, `backend/app/models/schemas.py`). Zero AI agent reasoning, LLM prompts, RAG retrieval algorithms, ChromaDB vector collections, or financial calculation formulas were altered.

---

## 2. Anita Sharma User & Demo Identifier

- **Demo Identifier Prefix**: `demo_anita_` (e.g. `demo_anita_9e5d074f` or `demo-anita`)
- **Email**: `anita.dairy@ruralcred.in`
- **Auth Mode**: `demo` (`isDemo: true`)
- **Isolated Storage Keys**:
  - Profile: `ruralcred_profile_${userId}`
  - Logbook: `ruralcred_logbook_${userId}`
  - Khata: `ruralcred_khata_${userId}`

---

## 3. Profile Fields Populated

| Field | Populated Value | Status |
| :--- | :--- | :---: |
| **Name** | `Anita Sharma` | PASS |
| **Business Name** | `Sharma Dairy Farm` | PASS |
| **Business Category** | `Dairy Farming` | PASS |
| **Location** | `Warangal, Telangana` | PASS |
| **Business Type** | `Dairy Farm` | PASS |
| **Years in Business** | `6` | PASS |
| **Number of Cattle** | `18` | PASS |
| **Primary Activity** | `Milk production and cooperative milk supply` | PASS |
| **Monthly Average Income** | `₹45,000–₹50,000` | PASS |
| **Monthly Average Expenses** | `₹12,000–₹15,000` | PASS |
| **Existing Loan** | `No` (`hasActiveLoan: false`) | PASS |
| **Loan Requirement** | `₹1,50,000` (`marginCapital: 150000`) | PASS |
| **Loan Purpose** | `Purchase additional cattle and improve dairy infrastructure` | PASS |
| **Gender** | `female` | PASS |
| **Social Category** | `OBC` | PASS |
| **Onboarding Completed** | `true` | PASS |

---

## 4. Cash-Flow & Logbook Transactions Added

### A. Income Transactions (Inflows) — Total: ₹45,700
| Date | Description / Note | Amount (₹) | Type | Category | Tags | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **02 Sep 2026** | Weekly cooperative milk payment | ₹8,500 | `income` | Cooperative Payout | `#cooperative`, `#milk_supply` | ADDED |
| **06 Sep 2026** | Local milk sales | ₹5,200 | `income` | Sales | `#retail`, `#local_sales` | ADDED |
| **10 Sep 2026** | Cooperative bulk milk supply | ₹9,800 | `income` | Cooperative Payout | `#bulk_deal`, `#cooperative` | ADDED |
| **14 Sep 2026** | Weekly cooperative milk payment | ₹8,700 | `income` | Cooperative Payout | `#cooperative`, `#weekly_payout` | ADDED |
| **18 Sep 2026** | Bulk milk supply | ₹7,500 | `income` | Sales | `#bulk_supply`, `#dairy` | ADDED |
| **22 Sep 2026** | Retail morning milk delivery | ₹6,000 | `income` | Sales | `#morning_batch`, `#retail` | ADDED |

### B. Expense Transactions (Outflows) — Total: ₹12,700
| Date | Description / Note | Amount (₹) | Type | Category | Tags | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **03 Sep 2026** | Cattle feed and mineral mix | ₹3,200 | `expense` | Feed / Supplies | `#feed`, `#supplies` | ADDED |
| **08 Sep 2026** | Veterinary visit and medicines | ₹1,500 | `expense` | Healthcare / Veterinary | `#veterinary`, `#healthcare` | ADDED |
| **12 Sep 2026** | Fodder purchase | ₹2,800 | `expense` | Feed / Supplies | `#fodder`, `#green_feed` | ADDED |
| **16 Sep 2026** | Electricity and water | ₹1,200 | `expense` | Rent & Power | `#utilities`, `#electricity` | ADDED |
| **20 Sep 2026** | Dairy equipment maintenance | ₹2,000 | `expense` | Equipment Maintenance | `#maintenance`, `#equipment` | ADDED |
| **24 Sep 2026** | Transport and delivery expenses | ₹2,000 | `expense` | Transport | `#transport`, `#delivery` | ADDED |

---

## 5. Duplicate Check & Skipped Transactions

- **Transactions Skipped**: 0
- **Duplicate Check Result**: **PASSED (Zero Duplicate IDs)**
  - Logbook Unique Entries: 12 / 12
  - Khata Unique Entries: 12 / 12

---

## 6. Financial Totals & Cash Flow Verification

| Metric | Expected Value | Stored / Derived Value | Variance | Status |
| :--- | :---: | :---: | :---: | :---: |
| **Total Income** | ₹45,700 | ₹45,700 | ₹0 | **PASS** |
| **Total Expenses** | ₹12,700 | ₹12,700 | ₹0 | **PASS** |
| **Net Cash Flow** | ₹33,000 | ₹33,000 | ₹0 | **PASS** |
| **Expense-to-Income Ratio** | ~27.8% | 27.8% (`0.278`) | 0.0% | **PASS** |

---

## 7. Khata (Credit Ledger) Data Verification

All 12 financial transactions are symmetrically represented in the existing Khata credit ledger model:

### A. Customer Credit (Receivables / Inflow Credit): ₹45,700
1. `02 Sep 2026` — **Warangal Milk Cooperative Society** — Weekly cooperative milk payment — **₹8,500** (`unpaid`)
2. `06 Sep 2026` — **Local Village Milk Customers (K. Rao)** — Local milk sales — **₹5,200** (`unpaid`)
3. `10 Sep 2026` — **Warangal Milk Cooperative Bulk Center** — Cooperative bulk milk supply — **₹9,800** (`unpaid`)
4. `14 Sep 2026` — **Warangal Milk Cooperative Society** — Weekly cooperative milk payment — **₹8,700** (`unpaid`)
5. `18 Sep 2026` — **Sri Laxmi Sweets & Dairy Outlet** — Bulk milk supply — **₹7,500** (`unpaid`)
6. `22 Sep 2026` — **Morning Residential Delivery Route** — Retail milk delivery — **₹6,000** (`unpaid`)

### B. Supplier Credit (Payables / Outflow Credit): ₹12,700
1. `03 Sep 2026` — **Balaji Agro Cattle Feed Depot** — Cattle feed and mineral mix — **₹3,200** (`unpaid`)
2. `08 Sep 2026` — **Dr. Reddy Veterinary Clinic** — Veterinary visit and medicines — **₹1,500** (`unpaid`)
3. `12 Sep 2026` — **Kishan Green Fodder Depot** — Fodder purchase — **₹2,800** (`unpaid`)
4. `16 Sep 2026` — **TSSPDCL Rural Electricity & Water Supply** — Electricity and water — **₹1,200** (`unpaid`)
5. `20 Sep 2026` — **Venkata Dairy Equipment Services** — Dairy equipment maintenance — **₹2,000** (`unpaid`)
6. `24 Sep 2026` — **Sri Sai Milk Transport Logistics** — Transport and delivery expenses — **₹2,000** (`unpaid`)

---

## 8. Dashboard, Analytics & Health Score Derivation

- **Dynamic Cash Flow Computation**: Derived directly from the 12 stored entries (`netCashFlow = 45700 - 12700 = 33000`).
- **Dashboard Synchronization**: Both FastAPI backend (`/api/dashboard`) and client-side fallback compute identical totals from the stored data.
- **Credit Readiness / Health Score**: Derived deterministically based on high logging consistency (12 entries), strong positive surplus (₹33,000), and healthy expense discipline (<30% ratio).

---

## 9. Persistence & UID Isolation Verification

1. **Refresh Persistence**: Demo session profiles and logbook caches persist in browser `localStorage` keyed by `demo_anita_${randomHex}` and rehydrate seamlessly.
2. **Logout / Login Persistence**: Clean teardown on logout via `clearDemoSession()`, reinitialized cleanly on preset selection.
3. **UID Isolation**:
   - Real Firebase authenticated users (`request.auth.uid`) query isolated Firestore paths `users/{userId}/logbook` and `users/{userId}/khata`.
   - Real user accounts never receive Anita Sharma demo data.
   - Demo personas (Anita, Ramesh, Lakshmi) each use unique isolated prefixes and distinct storage keys.

---

## 10. Code & Files Modified

1. [`lib/firebase/logbook.ts`](file:///D:/dev_classroom/ruralCred_Advisor/lib/firebase/logbook.ts) — Populated `INITIAL_DEMO_ENTRIES` (12 entries) and `INITIAL_KHATA_ENTRIES` (12 entries).
2. [`lib/demo-session.ts`](file:///D:/dev_classroom/ruralCred_Advisor/lib/demo-session.ts) — Extended `DemoUserProfile` interface and `PRESET_PROFILES.dairy` with full profile metadata.
3. [`context/AppContext.tsx`](file:///D:/dev_classroom/ruralCred_Advisor/context/AppContext.tsx) — Updated `UserProfile` interface to support extended business profile fields.
4. [`backend/app/services/logbook_service.py`](file:///D:/dev_classroom/ruralCred_Advisor/backend/app/services/logbook_service.py) — Updated backend `INITIAL_DEMO_ENTRIES` to match frontend dataset.
5. [`backend/app/models/schemas.py`](file:///D:/dev_classroom/ruralCred_Advisor/backend/app/models/schemas.py) — Updated `UserProfile` and `ProfileUpdate` Pydantic schemas.
6. [`scripts/verify_anita_demo_data.ts`](file:///D:/dev_classroom/ruralCred_Advisor/scripts/verify_anita_demo_data.ts) — Automated end-to-end verification script.

---

## 11. Confirmation of Protected Systems

- **AI Agents**: Business Advisor & Financial Advisor behaviors, prompts, and reasoning pipelines were **100% UNTOUCHED**.
- **Intent Orchestrator**: 7 numeric roles and query classification in `intent_orchestrator.py` were **100% UNTOUCHED**.
- **RAG & ChromaDB Pipeline**: Embeddings, vector retrieval, and ground truth knowledge base were **100% UNTOUCHED**.
- **Deterministic Math & Rules**: Banking calculation engines, DSCR logic, and risk rule evaluators were **100% UNTOUCHED**.
- **Firestore Security Rules**: Authorization architecture and user-isolated subcollection rules were **100% UNTOUCHED**.

---

## 12. Final Status Summary

```
================================================================================
ANITA PROFILE: PASS
LOGBOOK DATA: PASS
KHATA DATA: PASS
CASH FLOW: PASS (Total Income: ₹45,700 | Total Expenses: ₹12,700 | Net: ₹33,000)
PERSISTENCE: PASS
UID ISOLATION: PASS
DUPLICATE CHECK: PASS (0 duplicates)
AGENT/RAG/CHROMADB UNCHANGED: YES
================================================================================
```
