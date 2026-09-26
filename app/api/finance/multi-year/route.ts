import { NextRequest, NextResponse } from 'next/server';
import { calculateMultiYearProjection, MultiYearProjectionParams } from '@/lib/finance/engine';

export async function POST(request: NextRequest) {
  try {
    const body: MultiYearProjectionParams = await request.json();

    // Try FastAPI Backend
    const backendUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000';
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const backendRes = await fetch(`${backendUrl}/api/finance/multi-year`, {
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

    const localResult = calculateMultiYearProjection(body);
    return NextResponse.json(localResult);
  } catch (error: any) {
    console.error('API Error /api/finance/multi-year:', error);
    return NextResponse.json(
      { error: 'Failed to calculate multi-year projection', details: error?.message },
      { status: 500 }
    );
  }
}
