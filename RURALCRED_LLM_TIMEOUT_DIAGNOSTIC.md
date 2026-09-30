# RuralCred Advisor — LLM Timeout & Dead Model Diagnostic Report

**Generated:** September 29, 2026  
**Document Status:** Complete Diagnostic & Root Cause Analysis (Phase 1)  
**Target Repository:** `sankeerthrao026/ruralCred_Advisor_SIH`  
**Scope:** Performance & Reliability Diagnostic of Business Advisor AI Pipeline  

---

## 1. Executive Summary & Problem Statement

Users experiencing latency spikes of **~72+ seconds** when initiating business advisory analysis or follow-up conversational queries in the Business Advisor module. During this delay, the user interface remains locked in the active loading state with looping animation steps, leading to perceived application unresponsiveness before eventually falling back or failing.

This diagnostic establishes the exact end-to-end execution path, identifies all contributing timeout settings and dead model candidates across the frontend and backend layers, explains the mathematical accumulation of timeouts, and outlines the precise remediation plan.

---

## 2. End-to-End Execution Flow & Component Mapping

The Business Advisor request executes across two dual-mode pipelines:

```
[Browser UI: BusinessAdvisorScreen.tsx]
       │
       ▼  (fetch POST /api/ai/business-advisor)
[Next.js API Route: app/api/ai/business-advisor/route.ts]
       │
       ▼  (generateBusinessAnalysis in lib/ai/provider.ts)
       ├───► [Primary AI Path: FastAPI Backend /api/advisor/analyze]
       │         │
       │         ▼  (rag_service.py -> chroma_service.py & gemini_service.py)
       │         ├── 1. Vector Retrieval (ChromaDB 65 Chunks, <15ms)
       │         ├── 2. Primary LLM: NVIDIA NIM (_call_nvidia_nim)
       │         ├── 3. Secondary LLM: Google Gemini (generate_grounded_advice)
       │         └── 4. Local Fallback: Synthesizer (_generate_grounded_fallback)
       │
       └───► [Secondary Standalone Path: Next.js Direct Provider]
                 │
                 ▼  (lib/ai/gemini.ts: callGeminiApi)
                 ├── 1. Primary LLM: NVIDIA NIM (NVIDIA_MODELS)
                 ├── 2. Secondary LLM: Google Gemini (GEMINI_CANDIDATE_MODELS)
                 └── 3. Local Fallback: synthesizeGroundedLocalAdvisor
```

### Component Inventory

| Layer | File Path | Function / Class | Role |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | `components/screens/BusinessAdvisorScreen.tsx` | `runAnalysis()`, `handleSendFollowUp()` | UI trigger, animated step loader, state management |
| **Next.js API** | `app/api/ai/business-advisor/route.ts` | `POST()` | Request proxy and input validation |
| **Frontend Orchestrator** | `lib/ai/provider.ts` | `generateBusinessAnalysis()` | Backend client call + standalone direct Gemini/NIM caller + local fallback |
| **Frontend LLM Client** | `lib/ai/gemini.ts` | `callGeminiApi()` | Sequential HTTP caller for NVIDIA NIM and Google Gemini |
| **Backend API Route** | `backend/app/api/advisor.py` | `analyze_business()` | FastAPI endpoint handler |
| **Backend RAG Service** | `backend/app/services/rag_service.py` | `analyze_business_opportunity()` | Vector retrieval, query intent routing, context formatting |
| **Backend LLM Engine** | `backend/app/services/gemini_service.py` | `_call_nvidia_nim()`, `generate_grounded_advice()` | Upstream SDK/HTTP callers for NIM and Gemini |
| **Backend Monitoring** | `backend/app/services/llm_monitor.py` | `LLMMonitorService` | Telemetry, error tracking, quota monitoring |

---

## 3. Provider Order & Candidate Models

### A. Backend Layer (`backend/app/services/gemini_service.py`)

1. **Tier 1 (Primary): NVIDIA NIM**
   - Configured Endpoint: `https://integrate.api.nvidia.com/v1/chat/completions`
   - Configured Candidate Models:
     1. `nvidia/nemotron-3-ultra-550b-a55b` (or `settings.NVIDIA_MODEL`)
     2. `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning`
     3. `nvidia/nemotron-3.5-lightning-30b-a3b`
   - Configured Timeout: `httpx.Timeout(60.0, connect=10.0)` *(60s total / 10s connect)*

2. **Tier 2 (Secondary Fallback): Google Gemini**
   - SDK: `google-genai` Python Client
   - Configured Candidate Models:
     1. `gemini-1.5-flash` *(Deprecated / Returning 404/Unsupported on latest v1beta endpoints)*
     2. `gemini-2.5-flash` *(Active / Supported)*
     3. `gemini-2.0-flash` *(Active / Supported)*
   - Client Configured Timeout: `types.HttpOptions(timeout=10000)` *(10s per model)*

3. **Tier 3 (Final Local Fallback): Grounded Local Dataset Synthesizer**
   - Deterministic RAG rule synthesizer based on 65 verified ChromaDB chunks and district APMC benchmarks (<5ms latency).

---

### B. Frontend Standalone Layer (`lib/ai/gemini.ts`)

1. **Tier 1 (Primary): NVIDIA NIM**
   - Candidate Models:
     1. `process.env.NVIDIA_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b'`
     2. `'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning'`
     3. `'nvidia/nemotron-3.5-lightning-30b-a3b'`
   - Configured Timeout: `AbortSignal.timeout(35000)` *(35s per model)*

2. **Tier 2 (Secondary Fallback): Google Gemini**
   - Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
   - Candidate Models:
     1. `'gemini-1.5-flash'` *(Returns 404)*
     2. `'gemini-2.5-flash-lite'` *(Returns 404/400)*
     3. `'gemini-2.5-flash'` *(Active)*
   - Configured Timeout: `AbortSignal.timeout(10000)` *(10s per model)*

---

## 4. Root Cause Analysis: How the ~72-Second Hang Occurs

The ~72-second delay is caused by **cascading sequential timeouts on unresolvable or dead model candidates**:

```
[Request Initiated]
  │
  ├──► NVIDIA NIM Candidate #1 ('nvidia/nemotron-3-ultra-550b-a55b')
  │      └── Hangs / Connect latency / API Key check (~10.0s - 35.0s) ──► Fails
  │
  ├──► NVIDIA NIM Candidate #2 ('nvidia/nemotron-3-nano-omni-30b-a3b-reasoning')
  │      └── Hangs / Connect latency (~10.0s - 35.0s) ──► Fails
  │
  ├──► NVIDIA NIM Candidate #3 ('nvidia/nemotron-3.5-lightning-30b-a3b')
  │      └── Hangs / Connect latency (~10.0s - 35.0s) ──► Fails
  │
  ├──► Gemini Candidate #1 ('gemini-1.5-flash')
  │      └── Dead Model 404 / Connect Delay (~3.0s - 10.0s) ──► Fails
  │
  ├──► Gemini Candidate #2 ('gemini-2.5-flash-lite')
  │      └── Dead Model 404 / Connect Delay (~3.0s - 10.0s) ──► Fails
  │
  ▼
[Cumulative Latency: ~72.4s] ──► Fallback Triggered / Response Returned
```

### Key Contributing Defects:
1. **Excessive Timeout Limits**:
   - `60.0s` read timeout per NIM candidate in Python `httpx.Timeout(60.0, connect=10.0)`.
   - `35.0s` timeout per NIM candidate in Next.js `AbortSignal.timeout(35000)`.
   - Sequential retry loop through 3 candidates multiplies these latencies by 3.
2. **Dead / Deprecated Gemini Model IDs**:
   - `gemini-1.5-flash` returned HTTP 404 on current endpoints.
   - `gemini-2.5-flash-lite` returned HTTP 404 on v1beta REST endpoints.
   - Trying dead models sequentially adds unneeded delays before hitting valid models or fallback.
3. **Absence of Global Bounded Request Timeout**:
   - No overall deadline was enforced across candidate retries.
4. **UI State Coupling**:
   - `BusinessAdvisorScreen.tsx` sets `loading = true` and cycles a 3-step animation until the promise settles. Because the promise took 72+ seconds, the UI appeared frozen on Step 3 ("Synthesizing strategic SWOT matrix...").

---

## 5. Remediation Plan

1. **Tighten LLM Timeouts to ≤ 5.0s**:
   - NVIDIA NIM per-model timeout: `httpx.Timeout(5.0, connect=3.0)` in Python; `AbortSignal.timeout(5000)` in TypeScript.
   - Google Gemini per-model timeout: `5000ms` (5.0s).
2. **Eliminate Dead Model IDs**:
   - Remove `gemini-1.5-flash` and `gemini-2.5-flash-lite`.
   - Use verified active models: `gemini-2.5-flash` (primary) and `gemini-2.0-flash` (secondary).
3. **Fast Failover on Fatal HTTP Status Codes**:
   - On HTTP 404 (Not Found), 401/403 (Auth), or 429 (Quota), break candidate loop immediately to prevent sequential stalling.
4. **Guaranteed Local Fallback (<100ms)**:
   - When all external LLMs fail or timeout, instantly revert to verified deterministic ChromaDB grounded synthesis.
5. **Standardized Telemetry Logging**:
   - Log standardized structured lines for every LLM attempt: `[LLM] Provider:`, `[LLM] Model:`, `[LLM] Latency:`, `[LLM] Status:`.
6. **UI Loading State Hardening**:
   - Ensure `finally { setLoading(false); }` and `finally { setIsFollowUpLoading(false); }` execute deterministically under all network conditions.
