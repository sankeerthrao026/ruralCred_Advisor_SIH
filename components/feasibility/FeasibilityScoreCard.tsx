'use client';

import React, { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { evaluateBusinessFeasibility, FeasibilityAssessmentResult } from '@/lib/finance/feasibility';
import {
  Award,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Building2,
  MapPin,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
} from 'lucide-react';

export function FeasibilityScoreCard() {
  const { profile, finance, language } = useApp();
  const isTe = language === 'te';

  const assessment: FeasibilityAssessmentResult = useMemo(() => {
    return evaluateBusinessFeasibility({
      category: profile.category || 'Dairy Farming',
      location: profile.location || 'Warangal, Telangana',
      projectCost: finance.projectCost || 1000000,
      marginCapital: finance.marginCapital || 100000,
      loanAmount: finance.loanAmount || 900000,
      hasActiveLoan: profile.hasActiveLoan,
      simulatingSecondLoan: profile.simulatingSecondLoan,
    });
  }, [profile, finance]);

  const { overallScore, grade, gradeTe, summary, summaryTe, dimensions, strengths, strengthsTe, vulnerabilities, vulnerabilitiesTe, recommendedActions, recommendedActionsTe } = assessment;

  const dimList = [
    dimensions.financialViability,
    dimensions.marketViability,
    dimensions.operationalReadiness,
    dimensions.locationSuitability,
    dimensions.riskProfile,
  ];

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-xs flex flex-col gap-6 hover-lift transition-all">
      {/* 1. Header Banner & Overall Score */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-semibold flex items-center gap-1">
              <Award className="size-3.5" />
              {isTe ? 'పారదర్శక వ్యాపార సాధ్యత స్కోరు' : 'Transparent Business Feasibility Matrix'}
            </span>
            <span className="text-xs text-muted-foreground">
              {isTe ? '5-డైమెన్షన్ వెయిటెడ్ మోడల్' : '5-Dimension Deterministic Formulation'}
            </span>
          </div>
          <h3 className="mt-2 text-xl font-bold font-sora tracking-tight text-foreground">
            {profile.businessName || 'Rural Micro Enterprise'} • {isTe ? 'వ్యాపార సాధ్యత' : 'Feasibility Assessment'}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-xl">
            {isTe ? summaryTe : summary}
          </p>
        </div>

        {/* Circular Overall Score Radial */}
        <div className="flex items-center gap-4 shrink-0 bg-muted/20 p-3 rounded-2xl border">
          <div className="relative grid size-20 place-items-center rounded-full bg-primary/10 border-2 border-primary/30">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-extrabold font-sora text-primary">
                {overallScore}
              </span>
              <span className="text-[9px] font-bold text-muted-foreground uppercase">
                / 100
              </span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              overallScore >= 80
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : overallScore >= 60
                ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
            }`}>
              {isTe ? gradeTe : grade}
            </span>
            <span className="text-[11px] text-muted-foreground mt-1">
              {isTe ? 'బ్యాంకింగ్ ప్రమాణాలు అమలవుతాయి' : 'Bank Appraisal Standard'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. 5-Dimension Score Progress Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {dimList.map((d) => (
          <div key={d.key} className="rounded-xl border bg-muted/10 p-3 flex flex-col justify-between gap-2">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-foreground truncate">{isTe ? d.labelTe : d.label}</span>
                <span className="text-[10px] text-muted-foreground font-mono">{(d.weight * 100)}%</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-lg font-bold font-sora text-foreground">{d.score}</span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                  d.status === 'strong'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    : d.status === 'moderate'
                    ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                    : 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                }`}>
                  {isTe ? d.statusTe : d.status.toUpperCase()}
                </span>
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-muted rounded-full h-1.5 mt-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    d.status === 'strong' ? 'bg-emerald-600' : d.status === 'moderate' ? 'bg-blue-600' : 'bg-rose-600'
                  }`}
                  style={{ width: `${d.score}%` }}
                />
              </div>
            </div>

            <div className="text-[10px] text-muted-foreground pt-1 border-t line-clamp-2">
              {(isTe ? d.reasonsTe[0] : d.reasons[0]) || 'Deterministic calculation evaluated.'}
            </div>
          </div>
        ))}
      </div>

      {/* 3. Strengths vs Vulnerabilities Row */}
      <div className="grid md:grid-cols-2 gap-4 text-xs">
        {/* Strengths */}
        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
          <span className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5" />
            {isTe ? 'ప్రధాన సానుకూలతలు (Strengths)' : 'Key Viability Drivers'}
          </span>
          <ul className="space-y-1 text-muted-foreground">
            {(isTe ? strengthsTe : strengths).map((s, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Vulnerabilities */}
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
          <span className="font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
            <AlertCircle className="size-3.5" />
            {isTe ? 'జాగ్రత్త వహించాల్సిన అంశాలు (Vulnerabilities)' : 'Sensitivity & Monitoring Areas'}
          </span>
          <ul className="space-y-1 text-muted-foreground">
            {(isTe ? vulnerabilitiesTe : vulnerabilities).map((v, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="size-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <span>{v}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
