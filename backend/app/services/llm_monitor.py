import datetime
import os
import re
from typing import Dict, Any, Optional

DEFAULT_THRESHOLDS = {
    "warningRequestsThreshold": 80,
    "criticalRequestsThreshold": 100,
    "warningTokensThreshold": 80000,
    "criticalTokensThreshold": 100000,
}

class LLMMonitorService:
    def __init__(self):
        self.thresholds = dict(DEFAULT_THRESHOLDS)
        self.primary = {
            "providerName": "NVIDIA NIM",
            "model": os.getenv("NVIDIA_MODEL", "nvidia/nemotron-3-ultra-550b-a55b"),
            "isConfigured": bool(os.getenv("NVIDIA_API_KEY")),
            "status": "ONLINE" if bool(os.getenv("NVIDIA_API_KEY")) else "UNKNOWN",
            "requestCount": 0,
            "successfulRequestCount": 0,
            "failedRequestCount": 0,
            "inputTokens": None,
            "outputTokens": None,
            "totalTokens": None,
            "tokensAvailable": False,
            "lastRequestAt": None,
            "lastSuccessAt": None,
            "lastErrorAt": None,
            "lastErrorMessage": None,
            "lastErrorType": None,
            "lastLatencyMs": None,
        }
        self.secondary = {
            "providerName": "Google Gemini",
            "model": "gemini-2.5-flash",
            "isConfigured": bool(os.getenv("GEMINI_API_KEY")),
            "status": "ONLINE" if bool(os.getenv("GEMINI_API_KEY")) else "UNKNOWN",
            "requestCount": 0,
            "successfulRequestCount": 0,
            "failedRequestCount": 0,
            "inputTokens": None,
            "outputTokens": None,
            "totalTokens": None,
            "tokensAvailable": False,
            "lastRequestAt": None,
            "lastSuccessAt": None,
            "lastErrorAt": None,
            "lastErrorMessage": None,
            "lastErrorType": None,
            "lastLatencyMs": None,
        }
        self.local_fallback = {
            "providerName": "Deterministic Grounded Engine",
            "model": "local-dataset-synthesizer",
            "isConfigured": True,
            "status": "ONLINE",
            "requestCount": 0,
            "successfulRequestCount": 0,
            "failedRequestCount": 0,
            "inputTokens": None,
            "outputTokens": None,
            "totalTokens": None,
            "tokensAvailable": False,
            "lastRequestAt": None,
            "lastSuccessAt": None,
            "lastErrorAt": None,
            "lastErrorMessage": None,
            "lastErrorType": None,
            "lastLatencyMs": None,
        }
        self.fallback_active = False
        self.fallback_reason = None
        self.active_tier = "primary"
        self.provider_reported_quota = None

    def _update_config(self):
        self.primary["isConfigured"] = bool(os.getenv("NVIDIA_API_KEY"))
        self.secondary["isConfigured"] = bool(os.getenv("GEMINI_API_KEY"))
        if not self.primary["isConfigured"] and self.secondary["isConfigured"]:
            self.active_tier = "secondary"
        elif not self.primary["isConfigured"] and not self.secondary["isConfigured"]:
            self.active_tier = "local_fallback"

    def record_request_start(self, tier: str, model_name: Optional[str] = None):
        self._update_config()
        target = self._get_target(tier)
        target["requestCount"] += 1
        target["lastRequestAt"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        if model_name:
            target["model"] = model_name

    def record_request_success(
        self,
        tier: str,
        model_name: str,
        input_tokens: Optional[int] = None,
        output_tokens: Optional[int] = None,
        total_tokens: Optional[int] = None,
        latency_ms: Optional[float] = None,
        quota_info: Optional[str] = None,
    ):
        self._update_config()
        target = self._get_target(tier)
        target["successfulRequestCount"] += 1
        target["status"] = "ONLINE"
        target["lastSuccessAt"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        target["model"] = model_name
        if latency_ms is not None:
            target["lastLatencyMs"] = round(latency_ms, 1)

        if total_tokens is not None or input_tokens is not None:
            target["tokensAvailable"] = True
            target["inputTokens"] = (target["inputTokens"] or 0) + (input_tokens or 0)
            target["outputTokens"] = (target["outputTokens"] or 0) + (output_tokens or 0)
            target["totalTokens"] = (target["totalTokens"] or 0) + (
                total_tokens if total_tokens is not None else ((input_tokens or 0) + (output_tokens or 0))
            )

        if quota_info:
            self.provider_reported_quota = quota_info

        if tier == "primary":
            self.fallback_active = False
            self.fallback_reason = None
            self.active_tier = "primary"
        elif tier == "secondary" and not self.primary["isConfigured"]:
            self.fallback_active = False
            self.fallback_reason = None
            self.active_tier = "secondary"

    def record_request_failure(
        self,
        tier: str,
        model_name: str,
        error_type: str,
        error_message: str,
        status_code: Optional[int] = None,
    ):
        self._update_config()
        target = self._get_target(tier)
        target["failedRequestCount"] += 1
        target["lastErrorAt"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        target["lastErrorType"] = error_type
        target["lastErrorMessage"] = self._sanitize(error_message)

        if status_code == 429 or "rate_limit" in error_type.lower() or "ratelimit" in error_type.lower():
            target["status"] = "RATE_LIMITED"
        elif status_code in (401, 403) or "auth" in error_type.lower() or "permission" in error_type.lower():
            target["status"] = "AUTH_ERROR"
        elif "quota" in error_type.lower() or "resource_exhausted" in error_type.lower():
            target["status"] = "QUOTA_EXCEEDED"
        elif "timeout" in error_type.lower() or "network" in error_type.lower() or "connect" in error_type.lower():
            target["status"] = "NETWORK_ERROR"
        else:
            target["status"] = "PROVIDER_ERROR"

    def record_fallback_activation(self, from_provider: str, to_tier: str, reason: str):
        self.fallback_active = True
        self.active_tier = to_tier
        self.fallback_reason = f"{from_provider} unavailable: {self._sanitize(reason)}"
        if to_tier == "local_fallback":
            self.local_fallback["status"] = "ONLINE"

    def get_snapshot(self) -> Dict[str, Any]:
        self._update_config()
        total_req = self.primary["requestCount"] + self.secondary["requestCount"] + self.local_fallback["requestCount"]
        total_success = self.primary["successfulRequestCount"] + self.secondary["successfulRequestCount"] + self.local_fallback["successfulRequestCount"]
        total_failed = self.primary["failedRequestCount"] + self.secondary["failedRequestCount"] + self.local_fallback["failedRequestCount"]

        total_tokens = (self.primary["totalTokens"] or 0) + (self.secondary["totalTokens"] or 0)
        has_tokens = self.primary["tokensAvailable"] or self.secondary["tokensAvailable"]

        local_usage_state = "NORMAL"
        if (
            total_req >= self.thresholds["criticalRequestsThreshold"]
            or (has_tokens and total_tokens >= self.thresholds["criticalTokensThreshold"])
        ):
            local_usage_state = "CRITICAL"
        elif (
            total_req >= self.thresholds["warningRequestsThreshold"]
            or (has_tokens and total_tokens >= self.thresholds["warningTokensThreshold"])
        ):
            local_usage_state = "WARNING"

        active_provider = self.primary["providerName"]
        active_model = self.primary["model"]
        overall_status = self.primary["status"]

        if self.active_tier == "secondary" or (not self.primary["isConfigured"] and self.secondary["isConfigured"]):
            active_provider = self.secondary["providerName"]
            active_model = self.secondary["model"]
            overall_status = self.secondary["status"]
        elif self.active_tier == "local_fallback" or (not self.primary["isConfigured"] and not self.secondary["isConfigured"]):
            active_provider = self.local_fallback["providerName"]
            active_model = self.local_fallback["model"]
            overall_status = "FALLBACK_ACTIVE" if self.fallback_active else "ONLINE"

        if self.fallback_active:
            overall_status = "FALLBACK_ACTIVE"

        return {
            "activeProvider": active_provider,
            "activeModel": active_model,
            "overallStatus": overall_status,
            "fallbackActive": self.fallback_active,
            "fallbackReason": self.fallback_reason,
            "activeTier": self.active_tier,
            "quotaRemaining": self.provider_reported_quota or "Quota remaining: Not available from provider",
            "quotaSource": "provider_confirmed" if self.provider_reported_quota else "provider_not_available",
            "localUsageState": local_usage_state,
            "thresholdConfig": dict(self.thresholds),
            "primary": dict(self.primary),
            "secondary": dict(self.secondary),
            "localFallback": dict(self.local_fallback),
            "totalRequests": total_req,
            "totalSuccessfulRequests": total_success,
            "totalFailedRequests": total_failed,
            "totalTokensConsumed": total_tokens if has_tokens else None,
            "lastUpdated": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }

    def _get_target(self, tier: str) -> Dict[str, Any]:
        if tier == "primary":
            return self.primary
        if tier == "secondary":
            return self.secondary
        return self.local_fallback

    def _sanitize(self, msg: str) -> str:
        if not msg:
            return "Unknown error"
        msg = re.sub(r"AIza[0-9A-Za-z-_]{35}", "[REDACTED_KEY]", msg)
        msg = re.sub(r"nvapi-[0-9A-Za-z-_]+", "[REDACTED_KEY]", msg)
        msg = re.sub(r"Bearer\s+[A-Za-z0-9-_.]+", "Bearer [REDACTED]", msg, flags=re.IGNORECASE)
        return msg[:200]

llm_monitor = LLMMonitorService()
