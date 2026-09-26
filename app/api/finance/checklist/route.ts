import { NextRequest, NextResponse } from 'next/server';
import { evaluateMissingInformation, BusinessInputContext } from '@/lib/finance/checklist';

export async function POST(request: NextRequest) {
  try {
    const body: BusinessInputContext = await request.json();

    // Try FastAPI Backend
    const backendUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000';
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const backendRes = await fetch(`${backendUrl}/api/finance/checklist`, {
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

    const localResult = evaluateMissingInformation(body);
    return NextResponse.json(localResult);
  } catch (error: any) {
    console.error('API Error /api/finance/checklist:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate missing information checklist', details: error?.message },
      { status: 500 }
    );
  }
}
