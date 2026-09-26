'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { DetectedRisk } from '@/lib/risk/engine';
import { formatINR } from '@/lib/utils/currency';
import { Button } from '@/components/ui/button';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  TrendingDown,
  Layers,
  HelpCircle,
  Activity,
  CreditCard,
  Scale,
  RefreshCw,
} from 'lucide-react';

export function RiskAlertsScreen() {
  const { detectedRisks, language, profile, dictionary } = useApp();
  const t = dictionary.risk;
  const isTe = language === 'te';

  const [explainingId, setExplainingId] = useState<string | null>(null);
  const [aiExplanations, setAiExplanations] = useState<Record<string, any>>({});

  const handleFetchAiExplanation = async (risk: DetectedRisk) => {
    setExplainingId(risk.ruleCode);
    try {
      const res = await fetch('/api/ai/risk-explanation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          risk,
          businessName: profile.businessName,
          language,
        }),
      });
      const data = await res.json();
      setAiExplanations((prev) => ({ ...prev, [risk.ruleCode]: data }));
    } catch (e) {
      console.error('Failed to get AI risk explanation:', e);
    } finally {
      setExplainingId(null);
    }
  };

  // Determine status of the 3 invariant rules
  const hasRule1 = detectedRisks.some((r) => r.ruleCode === 'RULE_1');
  const hasRule2 = detectedRisks.some((r) => r.ruleCode === 'RULE_2');
  const hasRule3 = detectedRisks.some((r) => r.ruleCode === 'RULE_3');

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Intro Header */}
      <div className="rounded-2xl border bg-card p-6 shadow-xs hover-lift transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary flex items-center gap-1">
              <ShieldAlert className="size-3.5" />
              {isTe ? 'ఆర్థిక భద్రతా నిబంధనలు' : 'Deterministic Financial Safeguards'}
            </span>
            <span className="text-xs text-muted-foreground">
              3 Invariant Guardrails Active
            </span>
          </div>
          <h2 className="mt-2 text-xl font-bold font-sora tracking-tight text-foreground">
            {isTe ? 'రిస్క్ సెంటర్ & నియంత్రణ నివేదిక' : 'Risk Center & Financial Safeguards'}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground max-w-xl">
            {isTe
              ? 'బహుళ రుణ భారాలు, ప్రతికూల నగదు ప్రవాహం మరియు తగ్గుతున్న లాభాల మార్జిన్లను నివారించే నియమాధారిత రక్షణ వ్యవస్థ.'
              : 'Deterministic safeguards that monitor against multiple debt burdens, negative operating cash burn, and margin decay before formal loan sanction.'}
          </p>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border shadow-2xs ${
              detectedRisks.length === 0
                ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-900 dark:text-amber-300 border-amber-500/30'
            }`}
          >
            <span
              className={`size-2 rounded-full ${
                detectedRisks.length === 0 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping'
              }`}
            />
            <span>
              {detectedRisks.length === 0
                ? (isTe ? 'అన్ని నిబంధనలు సురక్షితం' : 'All Safeguards Passed')
                : `${detectedRisks.length} ${isTe ? 'సమస్యలు గుర్తించబడ్డాయి' : 'Active Triggers'}`}
            </span>
          </span>
        </div>
      </div>

      {/* 2. Three Invariant Guardrails Telemetry Strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Guardrail 1: Multiple Debt Commitment */}
        <div className={`rounded-xl border p-4 transition-all hover-lift ${
          hasRule1 ? 'border-rose-400 bg-rose-500/5' : 'bg-card border-border/80'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
              <CreditCard className="size-3.5 text-primary" />
              Invariant Rule 1
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              hasRule1 ? 'bg-rose-500/20 text-rose-800 dark:text-rose-300' : 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
            }`}>
              {hasRule1 ? (isTe ? 'హెచ్చరిక' : 'Triggered') : (isTe ? 'సురక్షితం' : 'Clear')}
            </span>
          </div>
          <p className="mt-2 font-bold font-sora text-sm text-foreground">
            {isTe ? 'బహుళ రుణ నిరోధం' : 'Single Debt Profile'}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {isTe ? 'ప్రస్తుత రుణం ఉండగా నూతన రుణాన్ని నివారిస్తుంది' : 'Prevents debt stacking when prior loans are active'}
          </p>
        </div>

        {/* Guardrail 2: Solvency & Operating Cash Flow */}
        <div className={`rounded-xl border p-4 transition-all hover-lift ${
          hasRule2 ? 'border-rose-400 bg-rose-500/5' : 'bg-card border-border/80'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
              <Activity className="size-3.5 text-primary" />
              Invariant Rule 2
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              hasRule2 ? 'bg-rose-500/20 text-rose-800 dark:text-rose-300' : 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
            }`}>
              {hasRule2 ? (isTe ? 'హెచ్చరిక' : 'Triggered') : (isTe ? 'సురక్షితం' : 'Clear')}
            </span>
          </div>
          <p className="mt-2 font-bold font-sora text-sm text-foreground">
            {isTe ? 'ధనాత్మక నగదు ప్రవాహం' : 'Cash Flow Solvency'}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {isTe ? 'ఖర్చులు రాబడిని మించకుండా చూస్తుంది' : 'Requires operating revenues to exceed routine outflows'}
          </p>
        </div>

        {/* Guardrail 3: Operating Margin Stability */}
        <div className={`rounded-xl border p-4 transition-all hover-lift ${
          hasRule3 ? 'border-rose-400 bg-rose-500/5' : 'bg-card border-border/80'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
              <Scale className="size-3.5 text-primary" />
              Invariant Rule 3
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              hasRule3 ? 'bg-rose-500/20 text-rose-800 dark:text-rose-300' : 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
            }`}>
              {hasRule3 ? (isTe ? 'హెచ్చరిక' : 'Triggered') : (isTe ? 'సురక్షితం' : 'Clear')}
            </span>
          </div>
          <p className="mt-2 font-bold font-sora text-sm text-foreground">
            {isTe ? 'లాభాల మార్జిన్ నిలుపుదల' : 'Margin Decay Guard'}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {isTe ? 'ఆదాయం క్షీణించకుండా ముందస్తు హెచ్చరిక' : 'Monitors trend trajectory against operating margin collapse'}
          </p>
        </div>
      </div>

      {/* 3. Main Body: No Risk State OR Detected Risk Cards */}
      {detectedRisks.length === 0 ? (
        <div className="rounded-2xl border border-emerald-300/60 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20 p-8 text-center flex flex-col items-center hover-lift transition-all">
          <div className="grid size-12 place-items-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="size-6" />
          </div>
          <h3 className="mt-4 text-base font-bold font-sora text-emerald-950 dark:text-emerald-200">{t.noRiskTitle}</h3>
          <p className="mt-2 text-xs text-emerald-800/80 dark:text-emerald-300/80 max-w-md">{t.noRiskDesc}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-4 text-xs font-medium text-emerald-900 dark:text-emerald-200">
            <span className="flex items-center gap-1.5 bg-background/50 px-3 py-1.5 rounded-lg border border-emerald-300/40">
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
              {isTe ? 'సింగిల్ లోన్ కమిట్‌మెంట్' : 'Single debt profile verified'}
            </span>
            <span className="flex items-center gap-1.5 bg-background/50 px-3 py-1.5 rounded-lg border border-emerald-300/40">
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
              {isTe ? 'ధనాత్మక నగదు ప్రవాహం' : 'Net positive cash surplus'}
            </span>
            <span className="flex items-center gap-1.5 bg-background/50 px-3 py-1.5 rounded-lg border border-emerald-300/40">
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
              {isTe ? 'స్థిరమైన లాభాల మార్జిన్' : 'Healthy operating margin'}
            </span>
          </div>
        </div>
      ) : (
        /* Detected Risk Cards */
        <div className="flex flex-col gap-4">
          {detectedRisks.map((risk, idx) => {
            const explanation = aiExplanations[risk.ruleCode];
            const isExplaining = explainingId === risk.ruleCode;

            return (
              <div
                key={risk.ruleCode}
                className={`stagger-${Math.min(idx + 1, 4)} rounded-2xl border border-rose-300/80 dark:border-rose-900/80 bg-rose-50/40 dark:bg-rose-950/20 p-6 flex flex-col gap-4 shadow-xs hover-lift transition-all`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-8 place-items-center rounded-lg bg-rose-600 text-white shrink-0">
                      <AlertTriangle className="size-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-100 px-1.5 py-0.5 text-[10px] font-bold">
                          {risk.ruleCode}
                        </span>
                        <h4 className="font-bold font-sora text-sm text-rose-950 dark:text-rose-200">
                          {isTe ? risk.titleTe : risk.title}
                        </h4>
                      </div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleFetchAiExplanation(risk)}
                    disabled={isExplaining}
                    className="flex items-center gap-1.5 bg-card hover:bg-muted font-semibold text-xs border-rose-300 dark:border-rose-800 cursor-pointer"
                  >
                    <Sparkles className="size-3.5 text-primary" />
                    <span>{isExplaining ? t.aiExplaining : (isTe ? 'AI పరిష్కారాన్ని చూడండి' : 'Explain & Generate Action Plan')}</span>
                  </Button>
                </div>

                {/* What Happened / Deterministic Reason */}
                <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-card p-3.5 text-xs text-rose-950 dark:text-rose-200 leading-relaxed">
                  <p className="font-semibold text-foreground">{isTe ? 'ఏమి జరిగింది (గణాంక కారణం):' : 'What Happened (Deterministic Reason):'}</p>
                  <p className="mt-0.5 text-muted-foreground">{isTe ? risk.reasonTe : risk.reason}</p>
                </div>

                {/* Localized AI Explanation Output */}
                {explanation && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col gap-3 animate-in fade-in duration-300">
                    <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                      <Sparkles className="size-4" />
                      <span>{t.aiExplanationLabel}</span>
                      <span className="rounded bg-primary/10 text-primary px-1.5 py-0.2 text-[10px]">
                        {dictionary.aiEstimateBadge}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-foreground mb-1">
                        {isTe ? 'ఇది ఎందుకు ముఖ్యం (ఆర్థిక ప్రభావం):' : 'Why It Matters (Financial Impact):'}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {explanation.explanation}
                      </p>
                    </div>

                    {explanation.practicalActionSteps && explanation.practicalActionSteps.length > 0 && (
                      <div className="rounded-lg bg-card p-3 border">
                        <p className="text-xs font-semibold text-foreground mb-1.5">
                          {isTe ? 'మీరు ఏమి చేయవచ్చు (ఆచరణాత్మక పరిష్కార చర్యలు):' : 'What You Can Do (Recommended Action Steps):'}
                        </p>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          {explanation.practicalActionSteps.map((step: string, sIdx: number) => (
                            <li key={sIdx} className="flex items-start gap-1.5">
                              <span className="text-primary font-bold">•</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {explanation.cashFlowPreservationTip && (
                      <div className="flex items-center gap-2 text-[11px] text-primary/90 bg-primary/10 p-2.5 rounded-lg font-medium">
                        <Lightbulb className="size-4 shrink-0 text-amber-600" />
                        <span>{explanation.cashFlowPreservationTip}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default RiskAlertsScreen;
