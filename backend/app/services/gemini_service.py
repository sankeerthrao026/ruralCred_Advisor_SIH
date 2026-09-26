import json
import os
import time
from typing import Dict, Any, Optional
from app.config import settings
from app.services.llm_monitor import llm_monitor

class GeminiService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.nvidia_api_key = settings.NVIDIA_API_KEY
        self.nvidia_base_url = (settings.NVIDIA_BASE_URL or "https://integrate.api.nvidia.com/v1").rstrip("/")
        self.nvidia_model = settings.NVIDIA_MODEL or "nvidia/nemotron-3-ultra-550b-a55b"
        self.client = None
        self.last_model_used = None
        self._init_client()

    def _init_client(self):
        if self.api_key:
            try:
                from google import genai
                from google.genai import types
                self.client = genai.Client(
                    api_key=self.api_key,
                    http_options=types.HttpOptions(timeout=10000)
                )
                print("[INFO] Gemini AI Client initialized successfully with Google GenAI SDK (timeout=10s).")
            except Exception as e:
                print(f"[WARN] Failed to initialize Gemini client: {e}")
                self.client = None
        elif self.nvidia_api_key:
            print("[INFO] NVIDIA NIM Client active as primary LLM engine.")
        else:
            print("[INFO] No LLM API key configured. AI advisor will utilize verified ChromaDB grounded fallback.")

    def is_available(self) -> bool:
        return bool(self.nvidia_api_key or (self.client and self.api_key))

    def _call_nvidia_nim(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = 2048,
        temperature: float = 0.2,
        json_mode: bool = True,
    ) -> Optional[str]:
        if not self.nvidia_api_key:
            return None
        import httpx
        candidate_models = [
            self.nvidia_model,
            "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
            "nvidia/nemotron-3.5-lightning-30b-a3b",
        ]
        headers = {
            "Authorization": f"Bearer {self.nvidia_api_key}",
            "Content-Type": "application/json",
        }
        for model in candidate_models:
            t_start = time.time()
            llm_monitor.record_request_start("primary", model)
            try:
                payload = {
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                }
                if json_mode:
                    payload["response_format"] = {"type": "json_object"}
                resp = httpx.post(
                    f"{self.nvidia_base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=httpx.Timeout(60.0, connect=10.0),
                )
                t_dur = (time.time() - t_start) * 1000
                if resp.status_code == 200:
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"]
                    self.last_model_used = f"NVIDIA NIM ({model})"
                    usage = data.get("usage") or {}
                    llm_monitor.record_request_success(
                        "primary",
                        model,
                        input_tokens=usage.get("prompt_tokens"),
                        output_tokens=usage.get("completion_tokens"),
                        total_tokens=usage.get("total_tokens"),
                        latency_ms=t_dur,
                    )
                    print(f"[INFO] NVIDIA NIM advisory generated successfully via {model} in {t_dur:.1f}ms.")
                    return content
                else:
                    err_msg = resp.text[:150]
                    print(f"[WARN] NVIDIA NIM model {model} returned HTTP {resp.status_code}: {err_msg}")
                    llm_monitor.record_request_failure("primary", model, f"HTTP_{resp.status_code}", err_msg, status_code=resp.status_code)
            except Exception as e:
                t_dur = (time.time() - t_start) * 1000
                print(f"[WARN] NVIDIA NIM request with {model} failed: {e}")
                llm_monitor.record_request_failure("primary", model, "NETWORK_EXCEPTION", str(e))
        llm_monitor.record_fallback_activation("NVIDIA NIM", "secondary", "All NVIDIA candidate models failed or timed out")
        return None

    def generate_grounded_advice(
        self,
        user_query: str,
        retrieved_context: str,
        language: str = "en",
        history: Optional[list] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Calls Gemini API with strict grounding on the retrieved ChromaDB context.
        Incorporates conversational history for multi-turn dialogue.
        Enforces structured JSON response with thinking_budget=0 and max_output_tokens=1024 for minimal latency.
        """
        if not self.is_available():
            return None

        import time
        from google.genai import types

        is_te = language == "te"
        if is_te:
            system_prompt = """You are the RuralCred Advisor AI Engine.
You provide realistic, grounded, and concise business advisory for rural Indian micro-entrepreneurs.
CRITICAL MANDATORY LANGUAGE RULE:
The selected active application language is TELUGU (తెలుగు).
Respond entirely in Telugu. Do not include Hindi. Use Telugu as the primary language throughout the answer. Keep technical names, proper nouns, numbers, currency values, and unavoidable technical terminology in their standard form where appropriate.
You MUST generate EVERY user-facing string value in the output JSON exclusively in natural, fluent Telugu (తెలుగు) script.
This applies unconditionally to all keys: 'reply', 'marketReach' ('headline', 'details', 'targetSegment', 'estimatedLocalDemand'), 'opportunityAnalysis' ('overview', 'primaryDrivers', 'seasonalOpportunity'), 'swot' ('strengths', 'weaknesses', 'opportunities', 'threats'), 'competitorDensity' ('description', 'mitigationStrategy'), 'pricingSuggestion' ('recommendedBand', 'benchmarkComparison', 'marginTarget'), 'risks', and 'assumptions'.
STRICT RULES:
1. Do NOT write in English. Do NOT return bilingual or mixed English-Telugu text.
2. Even if the user's question, conversation history, or retrieved context is in English, your response MUST be in pure Telugu script.
3. For numerical / business questions (e.g. how many cows/birds/looms needed, target profit, break-even, required sales):
   - You MUST answer the exact question directly in the 'reply' field using the exact figures from the DETERMINISTIC BUSINESS CALCULATION block.
   - Show the step-by-step numbers clearly: (Target ÷ Profit per Unit = Required Units).
   - State the unit economics and assumptions clearly in Telugu.
   - NEVER provide vague generic boilerplate or dodge the calculation.
4. Ground all factual claims strictly in the provided context and benchmarks.
5. Output valid JSON matching the exact schema requested without altering JSON keys."""
        else:
            system_prompt = """You are the RuralCred Advisor AI Engine.
You provide realistic, grounded, and concise business advisory for rural Indian micro-entrepreneurs.
CRITICAL MANDATORY LANGUAGE RULE:
The selected active application language is ENGLISH.
Respond entirely in English. Do not include Telugu, Hindi, or any other regional-language translations. Do not provide bilingual terminology. Answer the user's question directly and completely in English.
You MUST generate EVERY user-facing string value in the output JSON in clear, simple English.
STRICT RULES:
1. Output pure English with clear rural business terminology. Do NOT generate Telugu, Hindi, or bilingual parentheticals (e.g. never output 'Dairy Farming (పాడి పరిశ్రమ)' or 'Warangal (వరంగల్)').
2. Even if the user's question or conversation history is written in Telugu script, translate the intent and respond completely in English.
3. For numerical / business questions (e.g. how many cows/birds/looms needed, target profit, break-even, required sales):
   - You MUST answer the exact question directly in the 'reply' field using the exact figures from the DETERMINISTIC BUSINESS CALCULATION block.
   - Show the step-by-step numbers clearly: (Target ÷ Profit per Unit = Required Units).
   - State the unit economics and assumptions clearly in English.
   - NEVER provide vague generic boilerplate or dodge the calculation.
4. Ground all factual claims strictly in the provided context and benchmarks.
5. Output valid JSON matching the exact schema requested without altering JSON keys."""

        history_text = ""
        if history and len(history) > 0:
            formatted_turns = []
            for item in history[-6:]:
                role_val = item.get("role") if isinstance(item, dict) else getattr(item, "role", "user")
                content_val = item.get("content") if isinstance(item, dict) else getattr(item, "content", "")
                speaker = "Entrepreneur" if role_val == "user" else "Advisor"
                formatted_turns.append(f"{speaker}: {content_val}")
            history_text = "CONVERSATION HISTORY (RECENT TURNS):\n" + "\n".join(formatted_turns) + "\n\n"

        lang_directive = (
            "MANDATORY: Respond entirely in Telugu. Do not include Hindi. Use Telugu as the primary language throughout the answer. Keep technical names, proper nouns, numbers, currency values, and unavoidable technical terminology in their standard form where appropriate."
            if is_te
            else "MANDATORY: Respond entirely in English. Do not include Telugu, Hindi, or any other regional-language translations. Do not provide bilingual terminology. Answer the user's question directly and completely in English."
        )

        prompt = f"""{history_text}CURRENT USER INQUIRY & CALCULATION CONTEXT:
{user_query}

RETRIEVED LOCAL CONTEXT (ChromaDB Vector Store):
{retrieved_context}

{lang_directive}
Return a valid JSON object with the following structure:
{{
  "reply": "Direct, precise answer to the user's inquiry first, followed by clear step-by-step numbers, unit economics, and actionable guidance.",
  "marketReach": {{
    "headline": "string",
    "details": "string",
    "targetSegment": "string",
    "estimatedLocalDemand": "string"
  }},
  "opportunityAnalysis": {{
    "overview": "string",
    "primaryDrivers": ["string", "string"],
    "seasonalOpportunity": "string"
  }},
  "swot": {{
    "strengths": ["string", "string"],
    "weaknesses": ["string", "string"],
    "opportunities": ["string", "string"],
    "threats": ["string", "string"]
  }},
  "competitorDensity": {{
    "densityLevel": "Low|Moderate|High",
    "description": "string",
    "mitigationStrategy": "string"
  }},
  "pricingSuggestion": {{
    "recommendedBand": "string",
    "benchmarkComparison": "string",
    "marginTarget": "string"
  }},
  "risks": ["string", "string"],
  "assumptions": ["string"]
}}"""

        # 1. Primary Engine: NVIDIA NIM (Nemotron)
        if self.nvidia_api_key:
            nim_text = self._call_nvidia_nim(system_prompt, prompt, max_tokens=2048, json_mode=True)
            if nim_text:
                try:
                    import re
                    json_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", nim_text)
                    raw_json = json_match.group(1).strip() if json_match else nim_text.strip()
                    if not raw_json.startswith("{"):
                        brace_idx = raw_json.find("{")
                        if brace_idx != -1:
                            raw_json = raw_json[brace_idx:]
                    if not raw_json.endswith("}"):
                        last_brace = raw_json.rfind("}")
                        if last_brace != -1:
                            raw_json = raw_json[:last_brace+1]
                    
                    try:
                        parsed = json.loads(raw_json)
                    except Exception:
                        sanitized = re.sub(r"[\x00-\x1F]+", lambda m: " " if m.group(0) in ("\n", "\r", "\t") else "", raw_json)
                        sanitized = re.sub(r",\s*([\]}])", r"\1", sanitized)
                        parsed = json.loads(sanitized)
                    return parsed
                except Exception as e:
                    print(f"[WARN] Failed to parse NVIDIA NIM advisory JSON: {e}")

        # 2. Secondary Engine: Google Gemini (if configured)
        if self.client and self.api_key:
            from google.genai import types
            candidate_models = [
                "gemini-1.5-flash",
                "gemini-2.5-flash",
                "gemini-2.0-flash",
            ]
            for model in candidate_models:
                t_model_start = time.time()
                llm_monitor.record_request_start("secondary", model)
                try:
                    response = self.client.models.generate_content(
                        model=model,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            system_instruction=system_prompt,
                            response_mime_type="application/json",
                            temperature=0.2,
                            max_output_tokens=1024,
                            thinking_config=types.ThinkingConfig(thinking_budget=0),
                        ),
                    )
                    t_model_duration = (time.time() - t_model_start) * 1000

                    raw_text = response.text or ""
                    json_text = raw_text.strip()
                    if json_text.startswith("```"):
                        lines = json_text.split("\n")
                        if lines[0].startswith("```"):
                            lines = lines[1:]
                        if lines and lines[-1].startswith("```"):
                            lines = lines[:-1]
                        json_text = "\n".join(lines).strip()

                    parsed = json.loads(json_text)
                    self.last_model_used = f"Google Gemini ({model})"
                    
                    usage = getattr(response, "usage_metadata", None)
                    in_tok = getattr(usage, "prompt_token_count", None) if usage else None
                    out_tok = getattr(usage, "candidates_token_count", None) if usage else None
                    tot_tok = getattr(usage, "total_token_count", None) if usage else None

                    llm_monitor.record_request_success(
                        "secondary",
                        model,
                        input_tokens=in_tok,
                        output_tokens=out_tok,
                        total_tokens=tot_tok,
                        latency_ms=t_model_duration,
                    )
                    print(f"[INFO] Gemini advisory generated successfully via {model} in {t_model_duration:.1f}ms.")
                    return parsed
                except Exception as e:
                    t_model_duration = (time.time() - t_model_start) * 1000
                    print(f"[WARN] Gemini generation with {model} failed after {t_model_duration:.1f}ms: {e}")
                    llm_monitor.record_request_failure("secondary", model, "API_EXCEPTION", str(e))

            llm_monitor.record_fallback_activation("Google Gemini", "local_fallback", "All Gemini candidate models failed or timed out")

        # Record deterministic fallback start and success
        llm_monitor.record_request_start("local_fallback")
        llm_monitor.record_request_success("local_fallback", "local-dataset-synthesizer", latency_ms=0)
        print("[WARN] All LLM engines failed or unconfigured. Reverting to grounded local fallback.")
        return None

    def generate_conversational_finance_reply(
        self,
        user_query: str,
        loan_context: Dict[str, Any],
        language: str = "en",
        history: Optional[list] = None,
    ) -> Optional[str]:
        """
        Calls Gemini API with full awareness of deterministic loan figures,
        demographics (gender, social category), working capital split, and seasonal moratorium.
        Returns a plain-language conversational advisor reply in the requested language.
        """
        if not self.is_available():
            return None

        from google.genai import types

        is_te = language == "te"
        if is_te:
            system_prompt = """You are the RuralCred AI Loan & Finance Advisor.
You converse with rural Indian micro-entrepreneurs in supportive, respectful, and practical language.
CRITICAL MANDATORY LANGUAGE RULE:
The selected active application language is TELUGU (తెలుగు).
Respond entirely in Telugu. Do not include Hindi. Use Telugu as the primary language throughout the answer. Keep technical names, proper nouns, numbers, currency values, and unavoidable technical terminology in their standard form where appropriate.
You MUST generate your entire conversational response in natural, fluent Telugu (తెలుగు) script.
STRICT RULES:
1. Do NOT write in English. Do NOT provide bilingual text.
2. Even if the user inquiry or loan context is in English, your response MUST be in pure Telugu script.
3. NEVER alter, hallucinate, or recalculate the verified loan numbers provided in the LOAN SUMMARY below (these are calculated deterministically by our banking engine).
4. Directly answer the entrepreneur's question or follow-up, referencing their exact loan amount, EMI, working capital split, or seasonal moratorium where appropriate.
5. Tailor your explanation to their demographic profile (e.g. woman entrepreneur, SC/ST/OBC category, rural location)."""
        else:
            system_prompt = """You are the RuralCred AI Loan & Finance Advisor.
You converse with rural Indian micro-entrepreneurs in supportive, respectful, and practical language.
CRITICAL MANDATORY LANGUAGE RULE:
The selected active application language is ENGLISH.
Respond entirely in English. Do not include Telugu, Hindi, or any other regional-language translations. Do not provide bilingual terminology. Answer the user's question directly and completely in English.
You MUST generate your entire conversational response in clear, simple English.
STRICT RULES:
1. Output pure English with clear financial terminology. Do NOT generate Telugu, Hindi, or bilingual terms.
2. Even if the user inquiry is in Telugu script, your response MUST be in English.
3. NEVER alter, hallucinate, or recalculate the verified loan numbers provided in the LOAN SUMMARY below (these are calculated deterministically by our banking engine).
4. Directly answer the entrepreneur's question or follow-up, referencing their exact loan amount, EMI, working capital split, or seasonal moratorium where appropriate.
5. Tailor your explanation to their demographic profile (e.g. woman entrepreneur, SC/ST/OBC category, rural location)."""

        history_text = ""
        if history and len(history) > 0:
            formatted_turns = []
            for item in history[-8:]:
                role_val = item.get("role") if isinstance(item, dict) else getattr(item, "role", "user")
                content_val = item.get("content") if isinstance(item, dict) else getattr(item, "content", "")
                speaker = "Entrepreneur" if role_val == "user" else "Loan Advisor"
                formatted_turns.append(f"{speaker}: {content_val}")
            history_text = "PREVIOUS CONVERSATION:\n" + "\n".join(formatted_turns) + "\n\n"

        lang_instruction = (
            "MANDATORY: Respond entirely in Telugu. Do not include Hindi. Use Telugu as the primary language throughout the answer. Keep technical names, proper nouns, numbers, currency values, and unavoidable technical terminology in their standard form where appropriate."
            if is_te
            else "MANDATORY: Respond entirely in English. Do not include Telugu, Hindi, or any other regional-language translations. Do not provide bilingual terminology. Answer the user's question directly and completely in English."
        )

        prompt = f"""{history_text}CURRENT USER PROFILE:
- Name: {loan_context.get('userName', 'Entrepreneur')}
- Business: {loan_context.get('category', 'Dairy Farming')}
- Location: {loan_context.get('location', 'Warangal, Telangana')}
- Demographics: {loan_context.get('gender', 'female')}, {loan_context.get('socialCategory', 'OBC')}

CURRENT FINANCIAL SUMMARY:
- Monthly Revenue: ₹{loan_context.get('monthlyRevenue', 0):,.0f}
- Monthly Expenses: ₹{loan_context.get('monthlyExpenses', 0):,.0f}
- Net Monthly Cash Surplus: ₹{loan_context.get('monthlyProfit', 0):,.0f}
- Debt-Service Coverage Ratio (DSCR): {loan_context.get('dscr', 1.8)}x

DIGITAL LOGBOOK SUMMARY:
- Total Income: ₹{loan_context.get('totalIncome', 0):,.0f} | Total Expenses: ₹{loan_context.get('totalExpenses', 0):,.0f}
- Net Cash Flow: ₹{loan_context.get('netCashFlow', 0):,.0f}
- Top Expense Categories: {loan_context.get('topExpenseCategories', 'N/A')}

LOAN SUMMARY:
- Margin Capital (Equity): ₹{loan_context.get('marginCapital', 0):,.0f}
- Bank Loan Amount: ₹{loan_context.get('loanAmount', 0):,.0f}
- Total Project Outlay: ₹{loan_context.get('projectCost', 0):,.0f}
- Quarterly EMI: ₹{loan_context.get('quarterlyEmi', 0):,.0f}
- Working Capital Split: ₹{loan_context.get('workingCapitalAmount', 0):,.0f} ({loan_context.get('workingCapitalPercent', 0)}%)
- Capital Expenditure (Capex) Split: ₹{loan_context.get('capexAmount', 0):,.0f} ({loan_context.get('capexPercent', 0)}%)
- Recommended Schemes: {loan_context.get('topSchemes')}
- Seasonal Moratorium Guidance: {loan_context.get('moratoriumGuidance')}

VERIFIED DETERMINISTIC CALCULATIONS FOR THIS QUESTION:
{loan_context.get('verifiedCalculationSummary', 'N/A')}

CURRENT ENTREPRENEUR INQUIRY:
{user_query}

{lang_instruction}
Provide a direct, helpful, and professional conversational response (2 to 4 paragraphs) addressing the entrepreneur's question directly using the verified calculations above."""

        # 1. Primary Engine: NVIDIA NIM (Nemotron)
        if self.nvidia_api_key:
            nim_text = self._call_nvidia_nim(system_prompt, prompt, max_tokens=1024, json_mode=False)
            if nim_text and nim_text.strip():
                return nim_text.strip()

        # 2. Secondary Engine: Google Gemini (if configured)
        if self.client and self.api_key:
            from google.genai import types
            candidate_models = [
                "gemini-1.5-flash",
                "gemini-2.5-flash",
                "gemini-2.0-flash",
            ]
            for model in candidate_models:
                try:
                    response = self.client.models.generate_content(
                        model=model,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            system_instruction=system_prompt,
                            temperature=0.3,
                            max_output_tokens=1024,
                            thinking_config=types.ThinkingConfig(thinking_budget=0),
                        ),
                    )
                    text = response.text or ""
                    if text.strip():
                        self.last_model_used = f"Google Gemini ({model})"
                        return text.strip()
                except Exception as e:
                    print(f"[WARN] Gemini finance reply with {model} failed: {e}")

        return None

gemini_service = GeminiService()
