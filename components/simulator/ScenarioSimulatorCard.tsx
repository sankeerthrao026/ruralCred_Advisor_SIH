'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  runScenarioComparisonSuite,
  ScenarioBaseParams,
  ScenarioSimulationResult,
  ScenarioSuiteComparison,
} from '@/lib/finance/scenarios';
import { formatINR } from '@/lib/utils/currency';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  Sparkles,
  ArrowRight,
  Info,
  RefreshCw,
  CheckCircle2,
  DollarSign,
  Activity,
  Layers,
} from 'lucide-react';

export function ScenarioSimulatorCard() {
  const { profile, finance, language } = useApp();
  const isTe = language === 'te';
  const isHi = language === 'hi';

  const [activeTab, setActiveTab] = useState<'suite' | 'custom'>('suite');

  // Custom User-Adjustable Sliders
  const [revenueDelta, setRevenueDelta] = useState<number>(0);
  const [expenseDelta, setExpenseDelta] = useState<number>(0);
  const [customRate, setCustomRate] = useState<number>(finance.scheme?.interestRateAnnual || 8.0);
  const [customProjectCost, setCustomProjectCost] = useState<number>(finance.projectCost || 1000000);

  // Compute base scenario parameters from authoritative AppContext state
  const baseParams: ScenarioBaseParams = useMemo(() => {
    return {
      marginCapital: finance.marginCapital || 100000,
      projectCost: finance.projectCost || 1000000,
      loanAmount: finance.loanAmount || 900000,
      interestRateAnnual: finance.scheme?.interestRateAnnual || 8.0,
      tenureYears: finance.scheme?.tenureYears || 7,
      hasActiveLoan: profile.hasActiveLoan,
      simulatingSecondLoan: profile.simulatingSecondLoan,
    };
  }, [finance, profile.hasActiveLoan, profile.simulatingSecondLoan]);

  // Run full scenario comparison suite (Base, Conservative, Optimistic + Custom)
  const comparisonSuite: ScenarioSuiteComparison = useMemo(() => {
    return runScenarioComparisonSuite(baseParams, {
      revenueDeltaPct: revenueDelta,
      expenseDeltaPct: expenseDelta,
      customInterestRateAnnual: customRate,
      customProjectCost: customProjectCost,
      customLoanAmount: Math.round(customProjectCost * 0.90),
    });
  }, [baseParams, revenueDelta, expenseDelta, customRate, customProjectCost]);

  const { base, conservative, optimistic, custom, resilienceRating, resilienceRatingTe, executiveSummary, executiveSummaryTe, recommendations, recommendationsTe } = comparisonSuite;

  const resetCustomSliders = () => {
    setRevenueDelta(0);
    setExpenseDelta(0);
    setCustomRate(finance.scheme?.interestRateAnnual || 8.0);
    setCustomProjectCost(finance.projectCost || 1000000);
  };

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-xs flex flex-col gap-6 hover-lift transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-semibold flex items-center gap-1">
              <Sliders className="size-3.5" />
              {isTe ? 'వ్యాపార సంక్షోభ సిమ్యులేటర్' : 'Business Scenario & Stress Simulator'}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
              resilienceRating.includes('High')
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : resilienceRating.includes('Moderate')
                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                : 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
            }`}>
              {isTe ? resilienceRatingTe : resilienceRating}
            </span>
          </div>
          <h3 className="mt-2 text-lg font-bold font-sora tracking-tight text-foreground">
            {isTe ? 'వాట్-ఇఫ్ దృశ్య విశ్లేషణ & రిస్క్ ప్రభావం' : 'What-If Stress Testing & Risk Impact'}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-2xl">
            {isTe ? executiveSummaryTe : executiveSummary}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-muted/60 p-1 rounded-xl border shrink-0">
          <button
            onClick={() => setActiveTab('suite')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'suite'
                ? 'bg-background text-foreground shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {isTe ? '3-కేస్ పోలిక' : '3-Case Comparison'}
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'custom'
                ? 'bg-background text-foreground shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {isTe ? 'ఇంటరాక్టివ్ స్లైడర్లు' : 'Custom Sliders'}
          </button>
        </div>
      </div>

      {/* 3-Case Comparison Grid */}
      {activeTab === 'suite' && (
        <div className="grid md:grid-cols-3 gap-4">
          {/* 1. Base Case */}
          <div className="rounded-xl border bg-muted/20 p-4 flex flex-col justify-between gap-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-blue-500" />
                {isTe ? base.nameTe : base.name}
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground bg-background px-2 py-0.5 rounded-full border">
                0% Delta
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>{isTe ? 'నెలవారీ రాబడి' : 'Monthly Revenue'}:</span>
                <span className="font-semibold text-foreground">{formatINR(base.monthlyRevenue)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{isTe ? 'నెలవారీ లాభం (NOI)' : 'Monthly Net Surplus'}:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatINR(base.monthlyNetOperatingIncome)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{isTe ? 'త్రైమాసిక EMI' : 'Quarterly EMI'}:</span>
                <span className="font-semibold text-foreground">{formatINR(base.quarterlyEmi)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>DSCR:</span>
                <span className={`font-bold ${base.isDscrHealthy ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-600'}`}>
                  {base.dscr.toFixed(2)}x
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{isTe ? 'వార్షిక నికర నగదు' : 'Annual Net Cash'}:</span>
                <span className="font-bold text-foreground">{formatINR(base.netAnnualCashFlow)}</span>
              </div>
            </div>

            <div className="pt-2 border-t text-[11px] flex items-center justify-between">
              <span className="text-muted-foreground">{isTe ? 'రిస్క్ స్థాయి' : 'Risk Level'}:</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="size-3.5" />
                {isTe ? base.riskSeverityTe : base.riskSeverity.toUpperCase()}
              </span>
            </div>
          </div>

          {/* 2. Conservative Stress Case */}
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 flex flex-col justify-between gap-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-rose-500" />
                {isTe ? conservative.nameTe : conservative.name}
              </span>
              <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">
                -20% Rev / +10% Exp
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>{isTe ? 'నెలవారీ రాబడి' : 'Monthly Revenue'}:</span>
                <span className="font-semibold text-foreground">{formatINR(conservative.monthlyRevenue)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{isTe ? 'నెలవారీ లాభం (NOI)' : 'Monthly Net Surplus'}:</span>
                <span className="font-bold text-foreground">{formatINR(conservative.monthlyNetOperatingIncome)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{isTe ? 'త్రైమాసిక EMI' : 'Quarterly EMI'}:</span>
                <span className="font-semibold text-foreground">{formatINR(conservative.quarterlyEmi)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>DSCR:</span>
                <span className={`font-bold ${conservative.isDscrHealthy ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {conservative.dscr.toFixed(2)}x
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{isTe ? 'వార్షిక నికర నగదు' : 'Annual Net Cash'}:</span>
                <span className="font-bold text-foreground">{formatINR(conservative.netAnnualCashFlow)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-rose-500/20 text-[11px] flex items-center justify-between">
              <span className="text-muted-foreground">{isTe ? 'రిస్క్ ప్రభావం' : 'Risk Impact'}:</span>
              <span className="font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1">
                <AlertTriangle className="size-3.5" />
                {isTe ? conservative.riskSeverityTe : conservative.riskSeverity.toUpperCase()}
              </span>
            </div>
          </div>

          {/* 3. Optimistic Growth Case */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex flex-col justify-between gap-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500" />
                {isTe ? optimistic.nameTe : optimistic.name}
              </span>
              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                +15% Rev / -5% Exp
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>{isTe ? 'నెలవారీ రాబడి' : 'Monthly Revenue'}:</span>
                <span className="font-semibold text-foreground">{formatINR(optimistic.monthlyRevenue)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{isTe ? 'నెలవారీ లాభం (NOI)' : 'Monthly Net Surplus'}:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatINR(optimistic.monthlyNetOperatingIncome)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{isTe ? 'త్రైమాసిక EMI' : 'Quarterly EMI'}:</span>
                <span className="font-semibold text-foreground">{formatINR(optimistic.quarterlyEmi)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>DSCR:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  {optimistic.dscr.toFixed(2)}x
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{isTe ? 'వార్షిక నికర నగదు' : 'Annual Net Cash'}:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatINR(optimistic.netAnnualCashFlow)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-emerald-500/20 text-[11px] flex items-center justify-between">
              <span className="text-muted-foreground">{isTe ? 'రిస్క్ ప్రొఫైల్' : 'Risk Profile'}:</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="size-3.5" />
                {isTe ? optimistic.riskSeverityTe : optimistic.riskSeverity.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Custom Sliders Workflow */}
      {activeTab === 'custom' && custom && (
        <div className="flex flex-col gap-6">
          <div className="grid md:grid-cols-2 gap-6 bg-muted/10 p-5 rounded-xl border">
            {/* Sliders Column */}
            <div className="space-y-4">
              {/* Slider 1: Revenue Delta */}
              <div>
                <div className="flex justify-between items-center text-xs font-semibold mb-1">
                  <span>{isTe ? 'రాబడి సర్దుబాటు' : 'Revenue Adjustment'}:</span>
                  <span className={`font-mono font-bold ${revenueDelta >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {revenueDelta > 0 ? `+${revenueDelta}%` : `${revenueDelta}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-40"
                  max="40"
                  step="5"
                  value={revenueDelta}
                  onChange={(e) => setRevenueDelta(parseInt(e.target.value, 10))}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                  <span>-40% (Severe Drought / Drop)</span>
                  <span>0% (Base)</span>
                  <span>+40% (Boom)</span>
                </div>
              </div>

              {/* Slider 2: Operating Expense Delta */}
              <div>
                <div className="flex justify-between items-center text-xs font-semibold mb-1">
                  <span>{isTe ? 'నిర్వహణ ఖర్చుల సర్దుబాటు' : 'Operating Cost Adjustment'}:</span>
                  <span className={`font-mono font-bold ${expenseDelta <= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {expenseDelta > 0 ? `+${expenseDelta}%` : `${expenseDelta}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-20"
                  max="40"
                  step="5"
                  value={expenseDelta}
                  onChange={(e) => setExpenseDelta(parseInt(e.target.value, 10))}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                  <span>-20% (Bulk Discount)</span>
                  <span>0% (Base)</span>
                  <span>+40% (Feed Spike)</span>
                </div>
              </div>

              {/* Slider 3: Interest Rate */}
              <div>
                <div className="flex justify-between items-center text-xs font-semibold mb-1">
                  <span>{isTe ? 'వార్షిక వడ్డీ రేటు' : 'Annual Interest Rate'}:</span>
                  <span className="font-mono font-bold text-primary">{customRate.toFixed(1)}% p.a.</span>
                </div>
                <input
                  type="range"
                  min="4.0"
                  max="16.0"
                  step="0.5"
                  value={customRate}
                  onChange={(e) => setCustomRate(parseFloat(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                  <span>4.0% (Subsidized)</span>
                  <span>8.0% (Term Loan)</span>
                  <span>16.0% (Commercial)</span>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetCustomSliders}
                  className="text-xs h-7 gap-1"
                >
                  <RefreshCw className="size-3" />
                  {isTe ? 'రీసెట్ చేయండి' : 'Reset Sliders'}
                </Button>
              </div>
            </div>

            {/* Custom Output Result Card */}
            <div className="rounded-xl border bg-card p-4 flex flex-col justify-between gap-4 shadow-xs">
              <div>
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-xs font-bold text-foreground">
                    {isTe ? 'సిమ్యులేట్ చేసిన ఫలితం' : 'Simulated Financial Output'}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    custom.riskSeverity === 'low'
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      : custom.riskSeverity === 'moderate'
                      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                      : 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                  }`}>
                    {isTe ? custom.riskSeverityTe : custom.riskSeverity.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                  <div className="p-2 rounded-lg bg-muted/30">
                    <span className="text-muted-foreground block text-[10px]">{isTe ? 'నెలవారీ రాబడి' : 'Monthly Revenue'}</span>
                    <span className="font-bold text-foreground text-sm">{formatINR(custom.monthlyRevenue)}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/30">
                    <span className="text-muted-foreground block text-[10px]">{isTe ? 'నెలవారీ నికర లాభం' : 'Monthly Net Surplus'}</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">{formatINR(custom.monthlyNetOperatingIncome)}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/30">
                    <span className="text-muted-foreground block text-[10px]">DSCR Coverage</span>
                    <span className={`font-bold text-sm ${custom.isDscrHealthy ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {custom.dscr.toFixed(2)}x
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/30">
                    <span className="text-muted-foreground block text-[10px]">{isTe ? 'వార్షిక నికర నగదు' : 'Annual Net Cash Flow'}</span>
                    <span className="font-bold text-foreground text-sm">{formatINR(custom.netAnnualCashFlow)}</span>
                  </div>
                </div>
              </div>

              {/* Live Risk Shift Explanation Banner */}
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs">
                <span className="font-semibold text-primary block mb-1 flex items-center gap-1">
                  <Activity className="size-3.5" />
                  {isTe ? 'రిస్క్ మార్పు వివరణ (గణిత సూత్రం)' : 'Deterministic Risk Shift Reasoning'}
                </span>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  {isTe ? custom.riskShiftExplanationTe : custom.riskShiftExplanation}
                </p>
                {custom.triggeredSafeguards.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-primary/10 text-[10px] text-rose-600 dark:text-rose-400 font-medium space-y-0.5">
                    {custom.triggeredSafeguards.map((s, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <AlertTriangle className="size-3 shrink-0" />
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actionable Recommendations */}
      <div className="rounded-xl border bg-muted/30 p-4 text-xs">
        <span className="font-bold text-foreground flex items-center gap-1.5 mb-2">
          <Sparkles className="size-3.5 text-primary" />
          {isTe ? 'సిమ్యులేటర్ ఆధారిత సిఫార్సులు' : 'Stress Resilience Directives'}
        </span>
        <ul className="space-y-1.5 text-muted-foreground">
          {(isTe ? recommendationsTe : recommendations).map((rec, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
