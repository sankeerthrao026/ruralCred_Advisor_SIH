'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatINR } from '@/lib/utils/currency';
import { calculateAllEligibleSchemes, SchemeCalculationResult } from '@/lib/finance/schemes';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck,
  ArrowRight,
  Percent,
  Calendar,
  IndianRupee,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Award,
  Filter,
  ExternalLink,
  ChevronRight,
  Clock,
  Landmark,
} from 'lucide-react';

export function SchemeMatchingScreen({ setActive }: { setActive?: (tab: string) => void }) {
  const { finance, profile, language, setSelectedSchemeId } = useApp();
  const isTe = language === 'te';

  const [activeFilter, setActiveFilter] = useState<'all' | 'eligible' | 'collateralFree' | 'subsidized'>('all');

  // Compute all eligible schemes with deterministic calculations
  const calculatedSchemes: SchemeCalculationResult[] = useMemo(() => {
    return calculateAllEligibleSchemes({
      loanAmount: finance.loanAmount || 900000,
      category: profile.category || 'Dairy Farming',
      gender: profile.gender || 'female',
      socialCategory: profile.socialCategory || 'OBC',
      locationType: 'rural',
      isNewEnterprise: true,
      isArtisanTrade: (profile.category || '').toLowerCase().includes('handloom') ||
                      (profile.category || '').toLowerCase().includes('weaving') ||
                      (profile.category || '').toLowerCase().includes('pottery'),
    });
  }, [finance.loanAmount, profile.category, profile.gender, profile.socialCategory]);

  // Filter schemes based on selection
  const filteredSchemes = useMemo(() => {
    return calculatedSchemes.filter((s) => {
      if (activeFilter === 'eligible' && !s.isEligible) return false;
      if (activeFilter === 'collateralFree' && !s.collateralFree) return false;
      if (activeFilter === 'subsidized' && (!s.subsidyPercent || s.subsidyPercent <= 0)) return false;
      return true;
    });
  }, [calculatedSchemes, activeFilter]);

  const eligibleCount = calculatedSchemes.filter((s) => s.isEligible).length;

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header Banner */}
      <div className="rounded-2xl border bg-card p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover-lift transition-all">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-semibold flex items-center gap-1">
              <Landmark className="size-3.5" />
              {isTe ? 'ప్రభుత్వ సహాయ పథకాలు' : 'Government Funding & Schemes'}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
              {eligibleCount} {isTe ? 'అర్హతగల పథకాలు' : 'eligible schemes for your profile'}
            </span>
          </div>
          <h2 className="mt-2 text-xl font-bold font-sora tracking-tight text-foreground">
            {isTe ? 'అధికారిక ప్రభుత్వ రుణ పథకాలు & సబ్సిడీలు' : 'Government Schemes & Statutory Funding'}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground max-w-xl">
            {isTe
              ? 'గ్రామీణ సూక్ష్మ మరియు చిన్న పరిశ్రమల కోసం అందుబాటులో ఉన్న నిజమైన కేంద్ర మరియు రాష్ట్ర ప్రభుత్వ ఆర్థిక పథకాలు.'
              : 'Pre-vetted statutory credit schemes offered through NBCFDC, MUDRA, PMEGP, and SIDBI with concessional rates and sovereign collateral guarantees.'}
          </p>
        </div>

        {/* Profile Baseline Badge */}
        <div className="rounded-xl bg-muted/40 p-3.5 border flex items-center gap-3 shrink-0">
          <div>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider block">
              {isTe ? 'ప్రస్తుత పెట్టుబడి బేస్‌లైన్' : 'Active Capital Baseline'}
            </span>
            <p className="text-sm font-bold font-sora text-foreground mt-0.5">
              {formatINR(finance.loanAmount || 900000)} <span className="text-xs font-normal text-muted-foreground">loan</span>
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setActive?.('Finance Advisor')}
            className="text-xs font-medium cursor-pointer"
          >
            {isTe ? 'ఫైనాన్స్ అడ్వైజర్' : 'Open Advisor'}
          </Button>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex items-center rounded-xl border bg-muted/30 p-1 text-xs shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {isTe ? 'అన్ని పథకాలు' : 'All Schemes'} ({calculatedSchemes.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('eligible')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeFilter === 'eligible'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {isTe ? 'అర్హతగలవి' : 'Eligible Matches'} ({eligibleCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('collateralFree')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeFilter === 'collateralFree'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {isTe ? 'పూచీకత్తు లేనివి (Collateral-Free)' : 'Collateral-Free'}
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('subsidized')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeFilter === 'subsidized'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {isTe ? 'సబ్సిడీ కలవి' : 'Capital Subsidies'}
          </button>
        </div>

        <span className="text-xs text-muted-foreground">
          {filteredSchemes.length} {isTe ? 'పథకాలు అందుబాటులో ఉన్నాయి' : 'options matching filter'}
        </span>
      </div>

      {/* 3. Scheme Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {filteredSchemes.map((scheme, idx) => {
          const isCurrentlyRouted = scheme.schemeId === finance.scheme.id;

          return (
            <div
              key={scheme.schemeId}
              className={`stagger-${Math.min(idx + 1, 6)} hover-lift rounded-2xl border p-6 flex flex-col justify-between shadow-xs transition-all ${
                isCurrentlyRouted
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                  : 'bg-card hover:border-primary/40'
              }`}
            >
              <div>
                {/* Header: Scheme Name, Badges */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      {isCurrentlyRouted && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-bold">
                          <ShieldCheck className="size-3" />
                          {isTe ? 'ప్రస్తుత ఎంపిక' : 'Active Scheme'}
                        </span>
                      )}
                      {scheme.isEligible ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold border border-emerald-500/20">
                          <CheckCircle2 className="size-3 text-emerald-600" />
                          {isTe ? 'అర్హత ఉంది' : 'Eligible Match'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 text-rose-800 dark:text-rose-300 px-2 py-0.5 text-[10px] font-bold border border-rose-500/20">
                          <AlertCircle className="size-3 text-rose-600" />
                          {isTe ? 'అర్హత నిబంధన వర్తించదు' : 'Ineligible'}
                        </span>
                      )}
                      {scheme.collateralFree && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {isTe ? 'పూచీకత్తు అవసరం లేదు' : 'No Collateral'}
                        </span>
                      )}
                      {scheme.subsidyPercent && scheme.subsidyPercent > 0 && (
                        <span className="rounded-full bg-amber-500/10 text-amber-900 dark:text-amber-300 px-2 py-0.5 text-[10px] font-semibold">
                          {scheme.subsidyPercent}% Subsidy
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold font-sora text-base text-foreground">
                      {isTe ? scheme.schemeNameTe : scheme.schemeName}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{scheme.agency}</p>
                  </div>
                </div>

                {/* Why It Matters / Matching Reason */}
                <div className="mt-3 p-3 rounded-xl bg-muted/30 border border-border/50 text-xs">
                  <span className="font-semibold text-foreground block mb-0.5">
                    {isTe ? 'ఎందుకు సరిపోతుంది:' : 'Why It Matches:'}
                  </span>
                  <p className="text-muted-foreground leading-relaxed">
                    {scheme.isEligible
                      ? isTe
                        ? `మీ ${profile.category || 'వ్యాపారం'} కోసం ₹${(scheme.sanctionedLoanAmount).toLocaleString('en-IN')} రుణానికి మరియు గ్రామీణ మార్జిన్ నిబంధనలకు అనుకూలం.`
                        : `Pre-approved for ₹${scheme.sanctionedLoanAmount.toLocaleString('en-IN')} loan for ${profile.category || 'rural enterprise'} in rural district.`
                      : scheme.ineligibilityReason || (isTe ? 'రుణ పరిమితి మీ పెట్టుబడి అవసరానికి మించి ఉంది.' : 'Loan amount exceeds scheme upper threshold.')}
                  </p>
                </div>

                {/* Key Financial Terms Grid */}
                <div className="mt-4 grid grid-cols-3 gap-2 border-y py-3 text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">{isTe ? 'వడ్డీ రేటు' : 'Interest Rate'}</span>
                    <strong className="font-bold font-sora text-foreground mt-0.5 block">
                      {scheme.interestRateAnnual}% {isTe ? 'సం.' : 'p.a.'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">{isTe ? 'కాలపరిమితి' : 'Tenure'}</span>
                    <strong className="font-bold font-sora text-foreground mt-0.5 block">
                      {scheme.tenureYears} {isTe ? 'సంవత్సరాలు' : 'Years'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">{isTe ? 'మారటోరియం' : 'Moratorium'}</span>
                    <strong className="font-bold font-sora text-foreground mt-0.5 block">
                      {scheme.moratoriumMonths} {isTe ? 'నెలలు' : 'Months'}
                    </strong>
                  </div>
                </div>

                {/* Benefits List */}
                <div className="mt-3.5 space-y-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    {isTe ? 'పథకం ప్రయోజనాలు:' : 'Key Statutory Benefits:'}
                  </span>
                  {(isTe ? scheme.benefitsTe : scheme.benefits).slice(0, 2).map((benefit, bIdx) => (
                    <div key={bIdx} className="flex items-start gap-1.5 text-xs text-foreground">
                      <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Footer: Action */}
              <div className="mt-5 pt-3 border-t flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-muted-foreground block">
                    {isTe ? 'గరిష్ట పరిమితి' : 'Max Sanction'}
                  </span>
                  <span className="text-xs font-bold font-sora text-foreground">
                    {formatINR(scheme.maxEligibleLoan)}
                  </span>
                </div>

                <Button
                  variant={isCurrentlyRouted ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedSchemeId(scheme.schemeId);
                    setActive?.('Finance Advisor');
                  }}
                  className="text-xs font-semibold cursor-pointer gap-1"
                >
                  <span>{isCurrentlyRouted ? (isTe ? 'అడ్వైజర్‌లో చూడండి' : 'Active in Advisor') : (isTe ? 'లెక్కించండి' : 'Simulate in Advisor')}</span>
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SchemeMatchingScreen;
