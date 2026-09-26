'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LLMMonitoringSnapshot, ProviderStatus } from '@/lib/ai/monitoring';
import {
  Activity,
  Cpu,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Zap,
  Info,
  Layers,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LlmProviderStatusCardProps {
  language?: 'en' | 'te';
  refreshTrigger?: number; // increments when a query runs to auto-refresh metrics
}

export function LlmProviderStatusCard({ language = 'en', refreshTrigger }: LlmProviderStatusCardProps) {
  const isTe = language === 'te';
  const [data, setData] = useState<LLMMonitoringSnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const fetchMonitoringData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/monitoring');
      if (res.ok) {
        const snapshot: LLMMonitoringSnapshot = await res.json();
        setData(snapshot);
      }
    } catch (e) {
      console.warn('Failed to fetch LLM monitoring:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonitoringData();
  }, [fetchMonitoringData, refreshTrigger]);

  if (!data) return null;

  const getStatusBadge = (status: ProviderStatus) => {
    switch (status) {
      case 'ONLINE':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            ONLINE
          </span>
        );
      case 'RATE_LIMITED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300 border border-amber-500/20">
            <AlertTriangle className="size-3" />
            RATE LIMITED
          </span>
        );
      case 'QUOTA_EXCEEDED':
      case 'AUTH_ERROR':
      case 'NETWORK_ERROR':
      case 'PROVIDER_ERROR':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:text-rose-300 border border-rose-500/20">
            <AlertCircle className="size-3" />
            {status.replace('_', ' ')}
          </span>
        );
      case 'FALLBACK_ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:text-blue-300 border border-blue-500/20">
            <Layers className="size-3" />
            FALLBACK ACTIVE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground border">
            {status}
          </span>
        );
    }
  };

  const getThresholdBadge = (state: 'NORMAL' | 'WARNING' | 'CRITICAL') => {
    if (state === 'CRITICAL') {
      return (
        <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1 text-[11px]">
          <AlertCircle className="size-3" />
          Critical ({data.totalRequests}/{data.thresholdConfig.criticalRequestsThreshold} reqs)
        </span>
      );
    }
    if (state === 'WARNING') {
      return (
        <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 text-[11px]">
          <AlertTriangle className="size-3" />
          Warning ({data.totalRequests}/{data.thresholdConfig.warningRequestsThreshold} reqs)
        </span>
      );
    }
    return (
      <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 text-[11px]">
        <CheckCircle2 className="size-3" />
        Normal (&lt; {data.thresholdConfig.warningRequestsThreshold} reqs)
      </span>
    );
  };

  return (
    <div className="rounded-2xl border bg-card/95 backdrop-blur-sm p-4 shadow-2xs transition-all hover:border-primary/30">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary">
            <Activity className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-foreground font-sora tracking-tight">
                {isTe ? 'AI ప్రొవైడర్ & కోటా పర్యవేక్షణ' : 'AI Provider & Quota Observability'}
              </h4>
              {getStatusBadge(data.overallStatus)}
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <span>{isTe ? 'యాక్టివ్ ప్రొవైడర్:' : 'Active:'}</span>
              <span className="font-semibold text-foreground">{data.activeProvider}</span>
              <span className="text-muted-foreground">•</span>
              <span className="font-mono text-[10px] text-muted-foreground truncate max-w-44">{data.activeModel}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchMonitoringData()}
            disabled={loading}
            className="size-7 p-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
            title={isTe ? 'రిఫ్రెష్ చేయండి' : 'Refresh Telemetry'}
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-7 px-2 text-[11px] rounded-lg flex items-center gap-1 cursor-pointer font-medium"
          >
            <span>{isExpanded ? (isTe ? 'దాచండి' : 'Less') : (isTe ? 'వివరాలు' : 'Details')}</span>
            {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </Button>
        </div>
      </div>

      {/* Primary KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-3 border-t">
        {/* Metric 1: Request Counter */}
        <div className="rounded-xl bg-muted/40 p-2.5 flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {isTe ? 'మొత్తం అభ్యర్థనలు' : 'Total Requests'}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold font-sora text-foreground">{data.totalRequests}</span>
            <span className="text-[10px] text-muted-foreground">
              ({data.totalSuccessfulRequests} ✓ / {data.totalFailedRequests} ✗)
            </span>
          </div>
        </div>

        {/* Metric 2: Token Consumption */}
        <div className="rounded-xl bg-muted/40 p-2.5 flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {isTe ? 'టోకెన్ల వినియోగం' : 'Token Usage'}
          </span>
          <div>
            {data.totalTokensConsumed !== null ? (
              <span className="text-base font-bold font-sora text-foreground">
                {data.totalTokensConsumed.toLocaleString('en-IN')}
              </span>
            ) : (
              <span className="text-[11px] font-medium text-muted-foreground italic">
                {isTe ? 'అందుబాటులో లేదు' : 'Unavailable from provider'}
              </span>
            )}
          </div>
        </div>

        {/* Metric 3: Provider Quota */}
        <div className="rounded-xl bg-muted/40 p-2.5 flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            {isTe ? 'ప్రొవైడర్ కోటా' : 'Provider Quota'}
          </span>
          <div>
            <span className="text-[11px] font-medium text-muted-foreground">
              {data.quotaRemaining}
            </span>
          </div>
        </div>

        {/* Metric 4: Fallback State */}
        <div className="rounded-xl bg-muted/40 p-2.5 flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {isTe ? 'ఫాల్‌బ్యాక్ స్థితి' : 'Fallback Engine'}
          </span>
          <div>
            {data.fallbackActive ? (
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle className="size-3" />
                Active ({data.activeProvider})
              </span>
            ) : (
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="size-3" />
                Inactive (Primary Active)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Details Drawer */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t space-y-3 page-enter">
          {/* Detailed Tier Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {/* Primary Tier */}
            <div className="rounded-xl border bg-background/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5 font-sora">
                  <Cpu className="size-3.5 text-primary" />
                  Primary (NVIDIA NIM)
                </span>
                {getStatusBadge(data.primary.status)}
              </div>
              <div className="text-[11px] space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Model:</span>
                  <span className="font-mono text-[10px] text-foreground truncate max-w-32">{data.primary.model}</span>
                </div>
                <div className="flex justify-between">
                  <span>Requests:</span>
                  <span className="font-semibold text-foreground">{data.primary.requestCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tokens:</span>
                  <span className="font-semibold text-foreground">
                    {data.primary.tokensAvailable && data.primary.totalTokens !== null
                      ? data.primary.totalTokens.toLocaleString('en-IN')
                      : 'Unavailable'}
                  </span>
                </div>
                {data.primary.lastLatencyMs !== null && (
                  <div className="flex justify-between">
                    <span>Latency:</span>
                    <span className="text-foreground">{data.primary.lastLatencyMs} ms</span>
                  </div>
                )}
              </div>
            </div>

            {/* Secondary Tier */}
            <div className="rounded-xl border bg-background/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5 font-sora">
                  <Zap className="size-3.5 text-primary" />
                  Secondary (Google Gemini)
                </span>
                {getStatusBadge(data.secondary.status)}
              </div>
              <div className="text-[11px] space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Model:</span>
                  <span className="font-mono text-[10px] text-foreground truncate max-w-32">{data.secondary.model}</span>
                </div>
                <div className="flex justify-between">
                  <span>Requests:</span>
                  <span className="font-semibold text-foreground">{data.secondary.requestCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tokens:</span>
                  <span className="font-semibold text-foreground">
                    {data.secondary.tokensAvailable && data.secondary.totalTokens !== null
                      ? data.secondary.totalTokens.toLocaleString('en-IN')
                      : 'Unavailable'}
                  </span>
                </div>
                {data.secondary.lastLatencyMs !== null && (
                  <div className="flex justify-between">
                    <span>Latency:</span>
                    <span className="text-foreground">{data.secondary.lastLatencyMs} ms</span>
                  </div>
                )}
              </div>
            </div>

            {/* Local Fallback Tier */}
            <div className="rounded-xl border bg-background/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5 font-sora">
                  <ShieldCheck className="size-3.5 text-primary" />
                  Grounded Local Fallback
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  READY
                </span>
              </div>
              <div className="text-[11px] space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Engine:</span>
                  <span className="text-foreground">Deterministic Dataset</span>
                </div>
                <div className="flex justify-between">
                  <span>Invocations:</span>
                  <span className="font-semibold text-foreground">{data.localFallback.requestCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tokens:</span>
                  <span className="text-foreground">0 (Local Synthesis)</span>
                </div>
                <div className="flex justify-between">
                  <span>Reliability:</span>
                  <span className="text-emerald-600 font-semibold">100% Offline Safe</span>
                </div>
              </div>
            </div>
          </div>

          {/* Fallback Notice if active */}
          {data.fallbackActive && data.fallbackReason && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
              <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <span className="font-bold block">{isTe ? 'ఫాల్‌బ్యాక్ కారణం:' : 'Active Fallback Notice:'}</span>
                <span className="text-[11px]">{data.fallbackReason}</span>
              </div>
            </div>
          )}

          {/* Local Usage Threshold & Transparency Footer */}
          <div className="rounded-xl bg-muted/30 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Info className="size-3.5 text-primary shrink-0" />
              <span>
                {isTe
                  ? 'స్థానిక వినియోగ హెచ్చరిక పరిమితి:'
                  : 'Local Usage Threshold Status:'}
              </span>
              {getThresholdBadge(data.localUsageState)}
            </div>

            <span className="text-[10px] text-muted-foreground/80">
              {isTe ? 'చివరి నవీకరణ:' : 'Last telemetry update:'} {new Date(data.lastUpdated).toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
