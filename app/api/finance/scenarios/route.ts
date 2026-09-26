import { NextRequest, NextResponse } from 'next/server';
import { runScenarioComparisonSuite, ScenarioBaseParams } from '@/lib/finance/scenarios';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      marginCapital,
      projectCost,
      loanAmount,
      baseMonthlyRevenue,
      baseMonthlyExpense,
      interestRateAnnual,
      tenureYears,
      hasActiveLoan,
      simulatingSecondLoan,
      customRevenueDeltaPct,
      customExpenseDeltaPct,
      customInterestRateDeltaPct,
      customProjectCost,
      customLoanAmount,
    } = body;

    const baseParams: ScenarioBaseParams = {
      marginCapital: marginCapital || 100000,
      projectCost,
      loanAmount,
      baseMonthlyRevenue,
      baseMonthlyExpense,
      interestRateAnnual,
      tenureYears,
      hasActiveLoan,
      simulatingSecondLoan,
    };

    // Try FastAPI Backend
    const backendUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000';
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const backendRes = await fetch(`${backendUrl}/api/finance/scenarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (backendRes.ok) {
        const data = await backendRes.json();
        return NextResponse.json(data);
      }
    } catch (backendErr) {
      // Graceful fallback to local TS engine
    }

    const customConfig =
      customRevenueDeltaPct !== undefined || customExpenseDeltaPct !== undefined
        ? {
            revenueDeltaPct: customRevenueDeltaPct ?? 0,
            expenseDeltaPct: customExpenseDeltaPct ?? 0,
            interestRateDeltaPct: customInterestRateDeltaPct,
            customProjectCost,
            customLoanAmount,
          }
        : undefined;

    const localResult = runScenarioComparisonSuite(baseParams, customConfig);
    return NextResponse.json(localResult);
  } catch (error: any) {
    console.error('API Error /api/finance/scenarios:', error);
    return NextResponse.json(
      { error: 'Failed to simulate scenarios', details: error?.message },
      { status: 500 }
    );
  }
}
