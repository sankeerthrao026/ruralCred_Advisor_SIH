/**
 * RuralCred Advisor — Centralized LLM Usage, Quota & Provider Observability Engine.
 * 
 * Provides verifiable runtime tracking for:
 * 1. Active Provider & Model hierarchy (NVIDIA NIM -> Google Gemini -> Deterministic Local Fallback).
 * 2. Provider health status (ONLINE, DEGRADED, RATE_LIMITED, AUTH_ERROR, NETWORK_ERROR, FALLBACK_ACTIVE, etc.).
 * 3. Request counts (Total, Successful, Failed).
 * 4. Token consumption metrics when reported by the provider (Input, Output, Total).
 * 5. Provider Quota Transparency (Explicitly flags 'Not available from provider' when not returned by upstream API).
 * 6. Configurable local usage thresholds (Warning at 80%, Critical at 90%) clearly separated from provider quota.
 * 7. Fallback activation tracking and reason audit.
 * 
 * Security Guarantee: Never stores or exposes raw API keys, tokens, or credentials.
 */

export type ProviderStatus =
  | 'ONLINE'
  | 'DEGRADED'
  | 'RATE_LIMITED'
  | 'QUOTA_EXCEEDED'
  | 'AUTH_ERROR'
  | 'NETWORK_ERROR'
  | 'PROVIDER_ERROR'
  | 'FALLBACK_ACTIVE'
  | 'UNKNOWN';

export type QuotaSource = 'provider_confirmed' | 'provider_not_available';

export interface ProviderMetrics {
  providerName: string;
  model: string;
  isConfigured: boolean;
  status: ProviderStatus;
  requestCount: number;
  successfulRequestCount: number;
  failedRequestCount: number;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  tokensAvailable: boolean;
  lastRequestAt: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  lastErrorType: string | null;
  lastLatencyMs: number | null;
}

export interface LocalThresholdConfig {
  warningRequestsThreshold: number;
  criticalRequestsThreshold: number;
  warningTokensThreshold: number;
  criticalTokensThreshold: number;
}

export interface LLMMonitoringSnapshot {
  activeProvider: string;
  activeModel: string;
  overallStatus: ProviderStatus;
  fallbackActive: boolean;
  fallbackReason: string | null;
  activeTier: 'primary' | 'secondary' | 'local_fallback';
  quotaRemaining: string;
  quotaSource: QuotaSource;
  localUsageState: 'NORMAL' | 'WARNING' | 'CRITICAL';
  thresholdConfig: LocalThresholdConfig;
  primary: ProviderMetrics;
  secondary: ProviderMetrics;
  localFallback: ProviderMetrics;
  totalRequests: number;
  totalSuccessfulRequests: number;
  totalFailedRequests: number;
  totalTokensConsumed: number | null;
  lastUpdated: string;
}

const DEFAULT_THRESHOLDS: LocalThresholdConfig = {
  warningRequestsThreshold: 80,
  criticalRequestsThreshold: 100,
  warningTokensThreshold: 80000,
  criticalTokensThreshold: 100000,
};

class LLMMonitor {
  private thresholds: LocalThresholdConfig = { ...DEFAULT_THRESHOLDS };

  private primary: ProviderMetrics = {
    providerName: 'NVIDIA NIM',
    model: process.env.NVIDIA_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b',
    isConfigured: Boolean(process.env.NVIDIA_API_KEY),
    status: Boolean(process.env.NVIDIA_API_KEY) ? 'ONLINE' : 'UNKNOWN',
    requestCount: 0,
    successfulRequestCount: 0,
    failedRequestCount: 0,
    inputTokens: null,
    outputTokens: null,
    totalTokens: null,
    tokensAvailable: false,
    lastRequestAt: null,
    lastSuccessAt: null,
    lastErrorAt: null,
    lastErrorMessage: null,
    lastErrorType: null,
    lastLatencyMs: null,
  };

  private secondary: ProviderMetrics = {
    providerName: 'Google Gemini',
    model: 'gemini-2.5-flash',
    isConfigured: Boolean(process.env.GEMINI_API_KEY),
    status: Boolean(process.env.GEMINI_API_KEY) ? 'ONLINE' : 'UNKNOWN',
    requestCount: 0,
    successfulRequestCount: 0,
    failedRequestCount: 0,
    inputTokens: null,
    outputTokens: null,
    totalTokens: null,
    tokensAvailable: false,
    lastRequestAt: null,
    lastSuccessAt: null,
    lastErrorAt: null,
    lastErrorMessage: null,
    lastErrorType: null,
    lastLatencyMs: null,
  };

  private localFallback: ProviderMetrics = {
    providerName: 'Deterministic Grounded Engine',
    model: 'local-dataset-synthesizer',
    isConfigured: true,
    status: 'ONLINE',
    requestCount: 0,
    successfulRequestCount: 0,
    failedRequestCount: 0,
    inputTokens: null,
    outputTokens: null,
    totalTokens: null,
    tokensAvailable: false,
    lastRequestAt: null,
    lastSuccessAt: null,
    lastErrorAt: null,
    lastErrorMessage: null,
    lastErrorType: null,
    lastLatencyMs: null,
  };

  private fallbackActive: boolean = false;
  private fallbackReason: string | null = null;
  private activeTier: 'primary' | 'secondary' | 'local_fallback' = 'primary';
  private providerReportedQuota: string | null = null;

  public updateConfig() {
    this.primary.isConfigured = Boolean(process.env.NVIDIA_API_KEY) || this.primary.isConfigured;
    this.secondary.isConfigured = Boolean(process.env.GEMINI_API_KEY) || this.secondary.isConfigured;
    if (!this.fallbackActive) {
      if (this.primary.isConfigured) {
        this.activeTier = 'primary';
      } else if (this.secondary.isConfigured) {
        this.activeTier = 'secondary';
      } else {
        this.activeTier = 'local_fallback';
      }
    }
  }

  public setConfigured(providerKey: 'primary' | 'secondary', configured: boolean) {
    if (providerKey === 'primary') this.primary.isConfigured = configured;
    if (providerKey === 'secondary') this.secondary.isConfigured = configured;
    this.updateConfig();
  }

  public recordRequestStart(providerKey: 'primary' | 'secondary' | 'local_fallback', modelName?: string) {
    this.updateConfig();
    const target = this.getProviderMetrics(providerKey);
    target.requestCount++;
    target.lastRequestAt = new Date().toISOString();
    if (modelName) target.model = modelName;
  }

  public recordRequestSuccess(
    providerKey: 'primary' | 'secondary' | 'local_fallback',
    modelName: string,
    usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number },
    latencyMs?: number,
    quotaInfo?: string
  ) {
    this.updateConfig();
    const target = this.getProviderMetrics(providerKey);
    target.successfulRequestCount++;
    target.status = 'ONLINE';
    target.lastSuccessAt = new Date().toISOString();
    target.model = modelName;
    if (latencyMs !== undefined) target.lastLatencyMs = latencyMs;

    if (usage && (usage.totalTokens !== undefined || usage.inputTokens !== undefined)) {
      target.tokensAvailable = true;
      target.inputTokens = (target.inputTokens || 0) + (usage.inputTokens || 0);
      target.outputTokens = (target.outputTokens || 0) + (usage.outputTokens || 0);
      target.totalTokens = (target.totalTokens || 0) + (usage.totalTokens || (usage.inputTokens || 0) + (usage.outputTokens || 0));
    }

    if (quotaInfo) {
      this.providerReportedQuota = quotaInfo;
    }

    // Reset fallback if primary succeeds
    if (providerKey === 'primary') {
      this.fallbackActive = false;
      this.fallbackReason = null;
      this.activeTier = 'primary';
    } else if (providerKey === 'secondary' && !this.primary.isConfigured) {
      this.fallbackActive = false;
      this.fallbackReason = null;
      this.activeTier = 'secondary';
    }
  }

  public recordRequestFailure(
    providerKey: 'primary' | 'secondary' | 'local_fallback',
    modelName: string,
    errorType: string,
    errorMessage: string,
    statusCode?: number
  ) {
    this.updateConfig();
    const target = this.getProviderMetrics(providerKey);
    target.failedRequestCount++;
    target.lastErrorAt = new Date().toISOString();
    target.lastErrorType = errorType;
    target.lastErrorMessage = this.sanitizeErrorMessage(errorMessage);

    // Map status accurately based on evidence
    if (statusCode === 429 || errorType.toLowerCase().includes('rate_limit') || errorType.toLowerCase().includes('ratelimit')) {
      target.status = 'RATE_LIMITED';
    } else if (statusCode === 401 || statusCode === 403 || errorType.toLowerCase().includes('auth') || errorType.toLowerCase().includes('permission')) {
      target.status = 'AUTH_ERROR';
    } else if (errorType.toLowerCase().includes('quota') || errorType.toLowerCase().includes('resource_exhausted')) {
      target.status = 'QUOTA_EXCEEDED';
    } else if (errorType.toLowerCase().includes('timeout') || errorType.toLowerCase().includes('network') || errorType.toLowerCase().includes('econnrefused')) {
      target.status = 'NETWORK_ERROR';
    } else {
      target.status = 'PROVIDER_ERROR';
    }
  }

  public recordFallbackActivation(
    fromProvider: string,
    toTier: 'secondary' | 'local_fallback',
    reason: string
  ) {
    this.fallbackActive = true;
    this.activeTier = toTier;
    this.fallbackReason = `${fromProvider} unavailable: ${this.sanitizeErrorMessage(reason)}`;
    if (toTier === 'local_fallback') {
      this.localFallback.status = 'ONLINE';
    }
  }

  public setThresholds(config: Partial<LocalThresholdConfig>) {
    this.thresholds = { ...this.thresholds, ...config };
  }

  public resetMetrics() {
    this.primary.requestCount = 0;
    this.primary.successfulRequestCount = 0;
    this.primary.failedRequestCount = 0;
    this.primary.inputTokens = null;
    this.primary.outputTokens = null;
    this.primary.totalTokens = null;
    this.primary.tokensAvailable = false;
    this.primary.status = this.primary.isConfigured ? 'ONLINE' : 'UNKNOWN';

    this.secondary.requestCount = 0;
    this.secondary.successfulRequestCount = 0;
    this.secondary.failedRequestCount = 0;
    this.secondary.inputTokens = null;
    this.secondary.outputTokens = null;
    this.secondary.totalTokens = null;
    this.secondary.tokensAvailable = false;
    this.secondary.status = this.secondary.isConfigured ? 'ONLINE' : 'UNKNOWN';

    this.localFallback.requestCount = 0;
    this.localFallback.successfulRequestCount = 0;
    this.localFallback.failedRequestCount = 0;

    this.fallbackActive = false;
    this.fallbackReason = null;
    this.providerReportedQuota = null;
  }

  public getSnapshot(): LLMMonitoringSnapshot {
    this.updateConfig();

    const totalReq = this.primary.requestCount + this.secondary.requestCount + this.localFallback.requestCount;
    const totalSuccess = this.primary.successfulRequestCount + this.secondary.successfulRequestCount + this.localFallback.successfulRequestCount;
    const totalFailed = this.primary.failedRequestCount + this.secondary.failedRequestCount + this.localFallback.failedRequestCount;

    const totalTokens = (this.primary.totalTokens || 0) + (this.secondary.totalTokens || 0);
    const hasAnyTokens = this.primary.tokensAvailable || this.secondary.tokensAvailable;

    // Evaluate local threshold state
    let localUsageState: 'NORMAL' | 'WARNING' | 'CRITICAL' = 'NORMAL';
    if (
      totalReq >= this.thresholds.criticalRequestsThreshold ||
      (hasAnyTokens && totalTokens >= this.thresholds.criticalTokensThreshold)
    ) {
      localUsageState = 'CRITICAL';
    } else if (
      totalReq >= this.thresholds.warningRequestsThreshold ||
      (hasAnyTokens && totalTokens >= this.thresholds.warningTokensThreshold)
    ) {
      localUsageState = 'WARNING';
    }

    // Determine active provider & model
    let activeProvider = this.primary.providerName;
    let activeModel = this.primary.model;
    let overallStatus = this.primary.status;

    if (this.activeTier === 'secondary' || (!this.primary.isConfigured && this.secondary.isConfigured)) {
      activeProvider = this.secondary.providerName;
      activeModel = this.secondary.model;
      overallStatus = this.secondary.status;
    } else if (this.activeTier === 'local_fallback' || (!this.primary.isConfigured && !this.secondary.isConfigured)) {
      activeProvider = this.localFallback.providerName;
      activeModel = this.localFallback.model;
      overallStatus = this.fallbackActive ? 'FALLBACK_ACTIVE' : 'ONLINE';
    }

    if (this.fallbackActive) {
      overallStatus = 'FALLBACK_ACTIVE';
    }

    return {
      activeProvider,
      activeModel,
      overallStatus,
      fallbackActive: this.fallbackActive,
      fallbackReason: this.fallbackReason,
      activeTier: this.activeTier,
      quotaRemaining: this.providerReportedQuota || 'Quota remaining: Not available from provider',
      quotaSource: this.providerReportedQuota ? 'provider_confirmed' : 'provider_not_available',
      localUsageState,
      thresholdConfig: { ...this.thresholds },
      primary: { ...this.primary },
      secondary: { ...this.secondary },
      localFallback: { ...this.localFallback },
      totalRequests: totalReq,
      totalSuccessfulRequests: totalSuccess,
      totalFailedRequests: totalFailed,
      totalTokensConsumed: hasAnyTokens ? totalTokens : null,
      lastUpdated: new Date().toISOString(),
    };
  }

  private getProviderMetrics(tier: 'primary' | 'secondary' | 'local_fallback'): ProviderMetrics {
    if (tier === 'primary') return this.primary;
    if (tier === 'secondary') return this.secondary;
    return this.localFallback;
  }

  public reset() {
    this.resetMetrics();
  }

  public sanitizeErrorMessage(msg: string): string {
    return sanitizeErrorMessage(msg);
  }
}

export function sanitizeErrorMessage(msg: string): string {
  if (!msg) return 'Unknown error';
  // Strictly strip any key patterns (e.g. AIza..., nvapi-..., Bearer ...)
  return msg
    .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_GOOGLE_API_KEY]')
    .replace(/nvapi-[0-9A-Za-z-_]+/g, '[REDACTED_NVIDIA_API_KEY]')
    .replace(/key=[A-Za-z0-9-_]+/gi, 'key=[REDACTED_KEY]')
    .replace(/Bearer\s+[A-Za-z0-9-_.]+/gi, 'Bearer [REDACTED_TOKEN]')
    .slice(0, 300);
}

export const llmMonitor = new LLMMonitor();

