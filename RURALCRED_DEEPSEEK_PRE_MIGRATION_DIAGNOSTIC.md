# RURALCRED ADVISOR — DEEPSEEK PRIMARY LLM PRE-MIGRATION DIAGNOSTIC REPORT

**Project:** RuralCred Advisor — SIH MVP  
**Date:** September 29, 2026  
**Status:** Pre-Migration Complete Diagnostic  
**Objective:** Complete pre-migration assessment of the AI infrastructure for DeepSeek primary LLM migration, latency optimization, timeout elimination, and architecture preservation.

---

## 1. Executive Summary & Non-Negotiable Invariants

This diagnostic provides an exact, code-grounded inspection of the RuralCred Advisor AI/LLM infrastructure prior to the migration of the primary LLM provider to DeepSeek.

### Strict Architectural Invariants Preserved
- **Zero AI/Agent Architecture Modification:** Functional preservation of agent responsibilities, agent routing, intent classification (`classifyQueryIntent`), seven numeric roles, Business Advisor and Financial Advisor reasoning pipelines.
- **RAG & ChromaDB Preservation:** Unified ChromaDB collection `ruralcred_knowledge`, embedding model `sentence-transformers/all-MiniLM-L6-v2`, 65 verified knowledge chunks, metadata schemas, and vector retrieval logic remain 100% untouched.
- **Core Domain Calculations:** All deterministic math (financial outlays, DSCR, EMI, amortization, unit economics, scheme rules) remain purely mathematical and authoritative.
- **User Data & Authentication:** Firebase Auth, UID isolation, Firestore collections, user profiles, chat history, demo accounts (e.g., Anita Sharma, Lakshmi Devi), Khata, Logbook, and UI/UX styling remain completely unmodified.

---

## 2. Comprehensive 25-Point Codebase Inspection

### Item 1: Current Primary LLM Provider
- **Configured Primary:** NVIDIA NIM (via `https://integrate.api.nvidia.com/v1`).
- **Implementation:** Selected when `NVIDIA_API_KEY` is present in both `backend/app/services/gemini_service.py` and `lib/ai/gemini.ts`.

### Item 2: Current Primary Model
- **Primary Model ID:** `nvidia/nemotron-3-ultra-550b-a55b` (configurable via `NVIDIA_MODEL` environment variable).
- **Candidate Models:** `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning`, `nvidia/nemotron-3.5-lightning-30b-a3b`.

### Item 3: Current Fallback Providers
- **Secondary Provider:** Google Gemini (`gemini_service.py` via Google GenAI SDK, and `lib/ai/gemini.ts` via Google REST API v1beta).
- **Tertiary Provider:** Grounded Local Synthesizer / Deterministic Math Engine (`_generate_grounded_fallback` in Python, `synthesizeGroundedLocalAdvisor` in TypeScript).

### Item 4: Current Fallback Models
- **Google Gemini Candidates:** `gemini-3.8-flash`, `gemini-flash-latest`.
- **Local Fallback Identifier:** `local-dataset-synthesizer`.

### Item 5: Provider Priority
- **Current Runtime Flow (Backend & Frontend):**
  $$\text{NVIDIA NIM (Primary)} \xrightarrow{\text{on failure/timeout}} \text{Google Gemini (Secondary)} \xrightarrow{\text{on failure/timeout}} \text{Grounded Local Synthesizer (Tertiary)}$$
- *Note:* While a `_call_deepseek` stub existed in `gemini_service.py`, it was never wired into `generate_grounded_advice` or `generate_conversational_finance_reply`, and was completely absent in Next.js `lib/ai/gemini.ts`.

### Item 6: LLM Abstraction / Interface
- **Backend (Python):** `GeminiService` class in [`backend/app/services/gemini_service.py`](file:///d:/dev_classroom/ruralCred_Advisor/backend/app/services/gemini_service.py) with methods `generate_grounded_advice()` and `generate_conversational_finance_reply()`.
- **Frontend / Next.js (TypeScript):** `callGeminiApi()` in [`lib/ai/gemini.ts`](file:///d:/dev_classroom/ruralCred_Advisor/lib/ai/gemini.ts) and `callLlmService()` in [`lib/ai/provider.ts`](file:///d:/dev_classroom/ruralCred_Advisor/lib/ai/provider.ts).
- **Client Wrapper:** `apiClient` in [`lib/api/client.ts`](file:///d:/dev_classroom/ruralCred_Advisor/lib/api/client.ts).

### Item 7: API Routes
- **Next.js Server-Side Routes:**
  - [`app/api/ai/business-advisor/route.ts`](file:///d:/dev_classroom/ruralCred_Advisor/app/api/ai/business-advisor/route.ts)
  - [`app/api/ai/finance-advisor/route.ts`](file:///d:/dev_classroom/ruralCred_Advisor/app/api/ai/finance-advisor/route.ts)
  - [`app/api/ai/business-plan/route.ts`](file:///d:/dev_classroom/ruralCred_Advisor/app/api/ai/business-plan/route.ts)
  - [`app/api/ai/risk-explanation/route.ts`](file:///d:/dev_classroom/ruralCred_Advisor/app/api/ai/risk-explanation/route.ts)
  - [`app/api/ai/monitoring/route.ts`](file:///d:/dev_classroom/ruralCred_Advisor/app/api/ai/monitoring/route.ts)
- **FastAPI Endpoints:**
  - `POST /api/advisor/analyze` ([`backend/app/api/advisor.py`](file:///d:/dev_classroom/ruralCred_Advisor/backend/app/api/advisor.py))
  - `POST /api/finance/advisor-chat` ([`backend/app/api/finance.py`](file:///d:/dev_classroom/ruralCred_Advisor/backend/app/api/finance.py))
  - `POST /api/plan/generate` ([`backend/app/api/plan.py`](file:///d:/dev_classroom/ruralCred_Advisor/backend/app/api/plan.py))
  - `GET /api/advisor/monitoring` ([`backend/app/api/advisor.py`](file:///d:/dev_classroom/ruralCred_Advisor/backend/app/api/advisor.py))

### Item 8: LLM Service Files
1. [`backend/app/services/gemini_service.py`](file:///d:/dev_classroom/ruralCred_Advisor/backend/app/services/gemini_service.py)
2. [`backend/app/services/rag_service.py`](file:///d:/dev_classroom/ruralCred_Advisor/backend/app/services/rag_service.py)
3. [`backend/app/services/finance_service.py`](file:///d:/dev_classroom/ruralCred_Advisor/backend/app/services/finance_service.py)
4. [`backend/app/services/llm_monitor.py`](file:///d:/dev_classroom/ruralCred_Advisor/backend/app/services/llm_monitor.py)
5. [`lib/ai/gemini.ts`](file:///d:/dev_classroom/ruralCred_Advisor/lib/ai/gemini.ts)
6. [`lib/ai/provider.ts`](file:///d:/dev_classroom/ruralCred_Advisor/lib/ai/provider.ts)
7. [`lib/ai/monitoring.ts`](file:///d:/dev_classroom/ruralCred_Advisor/lib/ai/monitoring.ts)
8. [`lib/finance/advisor-pipeline.ts`](file:///d:/dev_classroom/ruralCred_Advisor/lib/finance/advisor-pipeline.ts)

### Item 9: Environment Variables
- `DEEPSEEK_API_KEY`: Server-side secret key (configured in `Settings` in `config.py`; currently not populated in `.env`).
- `DEEPSEEK_BASE_URL`: Defaults to `https://api.deepseek.com/v1`.
- `DEEPSEEK_MODEL`: Defaults to `deepseek-chat`.
- `NVIDIA_API_KEY`: Configured in `.env.local` and `backend/.env`.
- `NVIDIA_BASE_URL`: `https://integrate.api.nvidia.com/v1`.
- `NVIDIA_MODEL`: `nvidia/nemotron-3-ultra-550b-a55b`.
- `GEMINI_API_KEY`: Configured in `.env`, `.env.local`, and `backend/.env`.

### Item 10: API-Key Loading Mechanism
- **Backend:** Loaded via Pydantic `BaseSettings` (`backend/app/config.py`) reading `.env`, `.env.local`, and `backend/.env` with fallback to `os.getenv()`.
- **Frontend / Next.js API Routes:** Loaded securely on the Node.js server via `process.env.DEEPSEEK_API_KEY`, `process.env.NVIDIA_API_KEY`, and `process.env.GEMINI_API_KEY`.
- *Security:* No secrets are prefixed with `NEXT_PUBLIC_` or bundled into client code.

### Item 11: Timeout Configuration
- **Backend `gemini_service.py`:**
  - `_call_nvidia_nim`: `httpx.Timeout(4.0, connect=2.0)` per model attempt.
  - Google GenAI SDK: `types.HttpOptions(timeout=10000)` (10s).
- **Next.js `lib/ai/gemini.ts`:**
  - NVIDIA NIM: `AbortSignal.timeout(4000)` (4s per model attempt).
  - Google Gemini: `AbortSignal.timeout(5000)` (5s per model attempt).
- **Next.js `lib/api/client.ts`:**
  - `analyzeAdvisor`: `timeoutMs = 6000` (6s).
  - `consultFinanceAdvisor`: `timeoutMs = 8000` (8s).
  - `requestJson` default: `timeoutMs = 3500` (3.5s).

### Item 12: Retry Configuration
- **Sequential Multi-Model Failover:** Iterates across 3 NVIDIA candidate models, then falls back to 2 Gemini models.
- **Fast-fail triggers:** Fast breaks on status `401`, `403`, `404`, `429`, and `503`.

### Item 13: AbortController / Request Cancellation
- Used in `lib/api/client.ts` (`const controller = new AbortController()`) and `lib/ai/gemini.ts` (`AbortSignal.timeout()`).
- Unhandled gap: Frontend `BusinessAdvisorScreen.tsx` lacked a client-side fetch `AbortController` timeout for server responses.

### Item 14: Streaming Configuration
- Non-streaming structured generation is enforced: `response_format: { type: "json_object" }` (OpenAI / DeepSeek / NVIDIA) and `responseMimeType: "application/json"` (Gemini).

### Item 15: Request Construction
- System prompts enforce strict bilingual rules (pure Telugu or pure English without bilingual parentheticals).
- Injects verified deterministic mathematical outputs (`[DETERMINISTIC BUSINESS CALCULATION ENGINE RESULT]`) directly into prompt text.
- Retrieved context from ChromaDB (benchmarks, mandi prices, district profiles, schemes) appended under `RETRIEVED LOCAL CONTEXT`.

### Item 16: Response Parsing
- Extracts JSON with regex markdown fence stripping (` ```(?:json)? ... ``` `).
- Normalizes escaped characters, cleans trailing commas, and validates all required JSON keys (`reply`, `marketReach`, `opportunityAnalysis`, `swot`, `competitorDensity`, `pricingSuggestion`, `risks`, `assumptions`).

### Item 17: Error Handling
- Tiered try-catch wrappers: Provider failure -> Next Candidate Model -> Next Provider -> Deterministic Grounded Synthesizer.
- Failsafe guarantee: Never returns a raw 500 or broken JSON to the user.

### Item 18: Business Advisor Integration
- UI: [`components/screens/BusinessAdvisorScreen.tsx`](file:///d:/dev_classroom/ruralCred_Advisor/components/screens/BusinessAdvisorScreen.tsx)
- Route: [`app/api/ai/business-advisor/route.ts`](file:///d:/dev_classroom/ruralCred_Advisor/app/api/ai/business-advisor/route.ts)
- Engine: [`lib/ai/provider.ts`](file:///d:/dev_classroom/ruralCred_Advisor/lib/ai/provider.ts) $\rightarrow$ [`backend/app/api/advisor.py`](file:///d:/dev_classroom/ruralCred_Advisor/backend/app/api/advisor.py) $\rightarrow$ [`backend/app/services/rag_service.py`](file:///d:/dev_classroom/ruralCred_Advisor/backend/app/services/rag_service.py).

### Item 19: Financial Advisor Integration
- UI: [`components/screens/FinancialAdvisorScreen.tsx`](file:///d:/dev_classroom/ruralCred_Advisor/components/screens/FinancialAdvisorScreen.tsx)
- Route: [`app/api/ai/finance-advisor/route.ts`](file:///d:/dev_classroom/ruralCred_Advisor/app/api/ai/finance-advisor/route.ts)
- Engine: [`lib/finance/advisor-pipeline.ts`](file:///d:/dev_classroom/ruralCred_Advisor/lib/finance/advisor-pipeline.ts) $\rightarrow$ [`backend/app/api/finance.py`](file:///d:/dev_classroom/ruralCred_Advisor/backend/app/api/finance.py) $\rightarrow$ [`backend/app/services/finance_service.py`](file:///d:/dev_classroom/ruralCred_Advisor/backend/app/services/finance_service.py).

### Item 20: RAG Integration
- Query decomposition and keyword extraction in `rag_service.py`.
- Semantic search against ChromaDB collection `ruralcred_knowledge` with top-k=4 filtering by category and district metadata.
- Grounding context formatting for prompt injection.

### Item 21: ChromaDB Integration
- Persistent vector store at `backend/chroma_db`.
- Collection `ruralcred_knowledge` containing 65 domain and district chunks.
- Embedded with `sentence-transformers/all-MiniLM-L6-v2`.

### Item 22: Frontend Loading State
- State flags `loading` and `isFollowUpLoading` in `BusinessAdvisorScreen.tsx`.
- Guaranteed reset in `finally` blocks, but rendered for excessive duration due to server-side cascade delays.

### Item 23: Current Reason for the ~72-Second Response (Root Cause Analysis)
- **Detailed Execution Breakdown:**
  1. **FastAPI Backend Execution:**
     - Request received at `/api/advisor/analyze`.
     - `gemini_service.py` checks `NVIDIA_API_KEY`:
       - Attempt 1: `nvidia/nemotron-3-ultra-550b-a55b` $\rightarrow$ hangs on connect/handshake, times out (~4-6s).
       - Attempt 2: `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning` $\rightarrow$ hangs, times out (~4s).
       - Attempt 3: `nvidia/nemotron-3.5-lightning-30b-a3b` $\rightarrow$ hangs, times out (~4s).
     - `gemini_service.py` falls back to Google Gemini:
       - Attempt 4: `gemini-3.8-flash` $\rightarrow$ Google GenAI SDK returns HTTP 404 (model name invalid/non-existent) after retry (~5-10s).
       - Attempt 5: `gemini-flash-latest` $\rightarrow$ Google GenAI SDK returns HTTP 404.
  2. **Next.js Client Timeout & Secondary Fallback:**
     - Meanwhile, `apiClient.analyzeAdvisor` in Next.js times out at 6.0s.
     - `lib/ai/provider.ts` catches the timeout error and launches standalone Next.js fallback (`callGeminiApi` in `lib/ai/gemini.ts`).
  3. **Next.js Standalone LLM Cascade:**
     - Next.js checks `NVIDIA_API_KEY`:
       - Model 1: `nvidia/nemotron-3-ultra-550b-a55b` $\rightarrow$ AbortSignal timeout at 4.0s.
       - Model 2: `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning` $\rightarrow$ AbortSignal timeout at 4.0s.
       - Model 3: `nvidia/nemotron-3.5-lightning-30b-a3b` $\rightarrow$ AbortSignal timeout at 4.0s.
     - Next.js falls back to Google Gemini:
       - Model 1: `gemini-3.8-flash` $\rightarrow$ HTTP 404 at 5.0s.
       - Model 2: `gemini-flash-latest` $\rightarrow$ HTTP 404 at 5.0s.
  4. **Final Fallback Activation:**
     - After ~10 consecutive failed/timed-out external calls across Python and Node.js processes, the system finally reaches `synthesizeGroundedLocalAdvisor`.
     - Total elapsed latency observed in browser: **~72 seconds**.

### Item 24: Current NVIDIA Configuration
- API Key: Populated in `.env.local` and `backend/.env`.
- Base URL: `https://integrate.api.nvidia.com/v1`.
- Primary Model: `nvidia/nemotron-3-ultra-550b-a55b`.
- Status: Experiencing frequent connection drops and endpoint timeouts.

### Item 25: Current Gemini Configuration
- API Key: Populated in `.env`, `.env.local`, and `backend/.env`.
- Configured Models: `gemini-3.8-flash`, `gemini-flash-latest`.
- Status: Failing with HTTP 404 due to non-existent model identifiers in Google GenAI API.

---

## 3. DeepSeek Target Migration Architecture

```
USER QUERY
    │
    ▼
FRONTEND (BusinessAdvisorScreen / FinancialAdvisorScreen)
    │
    ▼
API ROUTE (/api/ai/business-advisor or /api/ai/finance-advisor)
    │
    ▼
QUERY INTERPRETATION (classifyQueryIntent / 7 Numeric Roles)
    │
    ▼
AGENT ORCHESTRATION (rag_service.py / advisor-pipeline.ts)
    │
    ▼
RAG RETRIEVAL (ChromaDB collection 'ruralcred_knowledge', top-k=4)
    │
    ▼
RETRIEVED CONTEXT + DETERMINISTIC CALCULATIONS
    │
    ▼
DEEPSEEK (Primary LLM: deepseek-chat via https://api.deepseek.com/v1)
    │
    ├─► [SUCCESS (<2s)] ──► IMMEDIATE RESPONSE RETURNED (No further LLM calls)
    │
    └─► [FAIL/TIMEOUT (3.5s)] ──► Grounded Deterministic Dataset Synthesizer (<50ms)
```

---

## 4. Pre-Migration Checklist & Next Step

- [x] Phase 1: Complete codebase inspection conducted without code alterations.
- [x] Phase 2: Root cause of the ~72s timeout identified and documented.
- [x] Environment files and server-side secret mechanisms audited.
- [ ] Phase 3: Awaiting DeepSeek API credential injection through secure environment variable.

**DIAGNOSTIC COMPLETE — READY FOR PHASE 3 CREDENTIAL CONFIGURATION.**
