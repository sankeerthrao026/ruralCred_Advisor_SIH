'use client';

import React, { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { calculateMultiYearProjection, MultiYearProjectionResult } from '@/lib/finance/engine';
import { formatINR } from '@/lib/utils/currency';
import {
  TrendingUp,
  Calendar,
  Layers,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Info,
  DollarSign,
} from 'lucide-react';

export function MultiYearProjectionTable() {
  const { finance, language } = useApp();
  const isTe = language === 'te';

  const projectionResult: MultiYearProjectionResult = useMemo(() => {
    return calculateMultiYearProjection({
      marginCapital: finance.marginCapital || 100000,
      projectCost: finance.projectCost || 1000000,
      loanAmount: finance.loanAmount || 900000,
      interestRateAnnual: finance.scheme?.interestRateAnnual || 8.0,
      tenureYears: finance.scheme?.tenureYears || 7,
      moratoriumMonths: finance.scheme?.moratoriumMonths || 6,
      projectionYears: 5,
    });
  }, [finance]);

  const { assumptions, years, averageDscr, minDscr, totalFiveYearNetCashFlow, totalInterestPaid, isBankable, bankabilitySummary, bankabilitySummaryTe } = projectionResult;

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-xs flex flex-col gap-5 hover-lift transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-semibold flex items-center gap-1">
              <Calendar className="size-3.5" />
              {isTe ? '5-వార్షిక ఆర్థిక ప్రణాళిక' : '5-Year Strategic Financial Projections'}
            </span>
            <span className="text-xs text-muted-foreground">
              {isTe ? 'వృద్ధి & అరుగుదల అంచనాలతో' : 'Compound Revenue Growth & Asset Depreciation'}
            </span>
          </div>
          <h3 className="mt-2 text-lg font-bold font-sora tracking-tight text-foreground">
            {isTe ? 'వార్షిక లాభనష్టాలు & రుణ విమోచన పట్టిక' : 'Annual Statement of Operations & Debt Servicing'}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-2xl">
            {isTe ? bankabilitySummaryTe : bankabilitySummary}
          </p>
        </div>

        {/* DSCR Average Badge */}
        <div className="flex items-center gap-3 bg-muted/20 p-3 rounded-xl border shrink-0">
          <div>
            <span className="text-[10px] text-muted-foreground block">{isTe ? 'సగటు DSCR' : 'Average DSCR'}</span>
            <span className="text-xl font-bold font-sora text-emerald-700 dark:text-emerald-400">
              {averageDscr.toFixed(2)}x
            </span>
          </div>
          <div className="border-l pl-3">
            <span className="text-[10px] text-muted-foreground block">{isTe ? 'కనిష్ట DSCR' : 'Minimum DSCR'}</span>
            <span className={`text-base font-bold font-sora ${minDscr >= 1.25 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-600'}`}>
              {minDscr.toFixed(2)}x
            </span>
          </div>
        </div>
      </div>

      {/* Assumptions Expose Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-muted/30 text-[11px] text-muted-foreground border">
        <span className="font-bold text-foreground flex items-center gap-1">
          <Info className="size-3 text-primary" />
          {isTe ? 'ప్రణాళిక భావనలు' : 'Financial Assumptions'}:
        </span>
        <span>Rev Growth: <strong>+{assumptions.annualRevenueGrowthPct}%/yr</strong></span>
        <span>•</span>
        <span>OPEX Inflation: <strong>+{assumptions.annualExpenseGrowthPct}%/yr</strong></span>
        <span>•</span>
        <span>Asset Depreciation: <strong>{assumptions.assetDepreciationRatePct}%/yr</strong></span>
        <span>•</span>
        <span>Loan Tenure: <strong>{assumptions.tenureYears} Years ({assumptions.moratoriumMonths}m Grace)</strong></span>
      </div>

      {/* Multi-Year Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="text-[11px] text-muted-foreground bg-muted/40 uppercase tracking-wider border-b">
            <tr>
              <th className="py-2.5 px-3 font-semibold">{isTe ? 'సంవత్సరం' : 'Year'}</th>
              <th className="py-2.5 px-3 font-semibold">{isTe ? 'స్థూల రాబడి' : 'Gross Revenue'}</th>
              <th className="py-2.5 px-3 font-semibold">{isTe ? 'నిర్వహణ ఖర్చులు' : 'Operating Exp'}</th>
              <th className="py-2.5 px-3 font-semibold">{isTe ? 'నికర లాభం (NOI)' : 'NOI / EBITDA'}</th>
              <th className="py-2.5 px-3 font-semibold">{isTe ? 'రుణ చెల్లింపు' : 'Debt Service'}</th>
              <th className="py-2.5 px-3 font-semibold">{isTe ? 'నికర నగదు ప్రవాహం' : 'Net Cash Flow'}</th>
              <th className="py-2.5 px-3 font-semibold">DSCR</th>
              <th className="py-2.5 px-3 font-semibold">{isTe ? 'ముగింపు నిల్వ' : 'Closing Loan Bal'}</th>
            </tr>
          </thead>
          <tbody className="divide-y text-foreground">
            {years.map((y) => (
              <tr key={y.year} className="hover:bg-muted/20 transition-colors">
                <td className="py-2.5 px-3 font-bold">Year {y.year}</td>
                <td className="py-2.5 px-3">{formatINR(y.grossRevenue)}</td>
                <td className="py-2.5 px-3 text-muted-foreground">{formatINR(y.operatingExpenses)}</td>
                <td className="py-2.5 px-3 font-semibold text-emerald-700 dark:text-emerald-400">{formatINR(y.netOperatingIncome)}</td>
                <td className="py-2.5 px-3 text-muted-foreground">{formatINR(y.totalDebtService)}</td>
                <td className="py-2.5 px-3 font-bold">{formatINR(y.netCashFlow)}</td>
                <td className="py-2.5 px-3">
                  <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                    y.isDscrHealthy ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                  }`}>
                    {y.dscr.toFixed(2)}x
                  </span>
                </td>
                <td className="py-2.5 px-3 text-muted-foreground font-mono">{formatINR(y.closingLoanBalance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
