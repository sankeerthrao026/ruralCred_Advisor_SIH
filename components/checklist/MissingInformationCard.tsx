'use client';

import React, { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { evaluateMissingInformation, MissingInformationResult } from '@/lib/finance/checklist';
import {
  CheckCircle2,
  AlertTriangle,
  FileText,
  Building2,
  MapPin,
  DollarSign,
  Layers,
  ArrowRight,
  Sparkles,
  Info,
} from 'lucide-react';

export function MissingInformationCard({ onNavigateToField }: { onNavigateToField?: (field: string) => void }) {
  const { profile, finance, language } = useApp();
  const isTe = language === 'te';

  const checklistResult: MissingInformationResult = useMemo(() => {
    return evaluateMissingInformation({
      name: profile.name,
      businessName: profile.businessName,
      category: profile.category,
      location: profile.location,
      marginCapital: finance.marginCapital,
      projectCost: finance.projectCost,
      loanAmount: finance.loanAmount,
    });
  }, [profile, finance]);

  const { isComplete, completionPercentage, availableItems, missingRequiredItems, optionalMissingItems } = checklistResult;

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-xs flex flex-col gap-5 hover-lift transition-all">
      {/* Header & Completion Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        {/* Header Badges */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-semibold flex items-center gap-1">
              <FileText className="size-3.5" />
              {isTe ? 'సందర్భోచిత సమాచార తనిఖీ జాబితా' : 'Contextual Appraisal Checklist'}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              isComplete
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
            }`}>
              {isComplete
                ? (isTe ? '100% పూర్తయింది (Ready)' : 'Complete (100%)')
                : (isTe ? `${missingRequiredItems.length} తప్పనిసరి అంశాలు అవసరం` : `${missingRequiredItems.length} Mandatory Pending`)}
            </span>
            {optionalMissingItems.length > 0 && !isComplete && (
              <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-400">
                {isTe ? `${optionalMissingItems.length} సిఫార్సు చేయబడినవి` : `${optionalMissingItems.length} Recommended`}
              </span>
            )}
          </div>
          <h3 className="mt-2 text-lg font-bold font-sora tracking-tight text-foreground">
            {isTe ? 'రుణ దరఖాస్తు సంసిద్ధత & అవసరమైన సమాచారం' : 'Application Data Completeness & Statutory Proofs'}
          </h3>
        </div>

        {/* Completion Progress Bar */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span className="text-[11px] text-muted-foreground font-medium block">
              {isTe
                ? `${availableItems.length} / ${checklistResult.totalItemsCount} వివరాలు పూర్తి`
                : `${availableItems.length} of ${checklistResult.totalItemsCount} inputs complete`}
            </span>
            <div className="w-32 bg-muted rounded-full h-2 overflow-hidden mt-1">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
          <span className="text-sm font-bold font-mono text-primary">{completionPercentage}%</span>
        </div>
      </div>

      {/* Available vs Pending Requirements Grid */}
      <div className="grid md:grid-cols-2 gap-4 text-xs">
        {/* Available Items */}
        <div className="space-y-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
          <span className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5" />
            {isTe ? `లభ్యమైన సమాచారం (${availableItems.length})` : `Verified Available Inputs (${availableItems.length})`}
          </span>
          <div className="space-y-2">
            {availableItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-background/60 border">
                <div>
                  <span className="font-semibold text-foreground block">{isTe ? item.labelTe : item.label}</span>
                  <span className="text-[10px] text-muted-foreground">{isTe ? item.categoryLabelTe : item.categoryLabel}</span>
                </div>
                {item.currentValue && (
                  <span className="text-[11px] font-mono font-bold text-primary bg-primary/5 px-2 py-0.5 rounded">
                    {item.currentValue}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Pending Required & Recommended Items Container */}
        <div className="space-y-4">
          {/* Pending Mandatory Requirements */}
          <div className="space-y-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <span className="font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="size-3.5" />
              {isTe ? `తప్పనిసరిగా అవసరమైన అంశాలు (${missingRequiredItems.length})` : `Pending Mandatory Requirements (${missingRequiredItems.length})`}
            </span>
            <div className="space-y-2">
              {missingRequiredItems.length === 0 ? (
                <div className="p-3 text-center text-muted-foreground text-xs">
                  {isTe ? 'అన్ని తప్పనిసరి వివరాలు పూర్తయ్యాయి.' : 'All mandatory financial & business inputs are verified.'}
                </div>
              ) : (
                missingRequiredItems.map((item) => (
                  <div key={item.id} className="p-2.5 rounded-lg bg-background/60 border border-amber-500/30 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{isTe ? item.labelTe : item.label}</span>
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                        {isTe ? 'తప్పనిసరి' : 'Required'}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {isTe ? item.promptMessageTe : item.promptMessage}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recommended / Optional Inputs Section */}
          {optionalMissingItems.length > 0 && (
            <div className="space-y-3 p-4 rounded-xl bg-sky-500/5 border border-sky-500/20">
              <span className="font-bold text-sky-800 dark:text-sky-400 flex items-center gap-1.5">
                <Sparkles className="size-3.5" />
                {isTe ? `సిఫార్సు చేయబడిన / ఐచ్ఛిక అంశాలు (${optionalMissingItems.length})` : `Recommended / Optional Inputs (${optionalMissingItems.length})`}
              </span>
              <div className="space-y-2">
                {optionalMissingItems.map((item) => (
                  <div key={item.id} className="p-2.5 rounded-lg bg-background/60 border border-sky-500/30 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{isTe ? item.labelTe : item.label}</span>
                      <span className="text-[10px] font-bold text-sky-700 dark:text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded">
                        {isTe ? 'సిఫార్సు' : 'Recommended'}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {isTe ? item.promptMessageTe : item.promptMessage}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
