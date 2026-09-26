import { NextRequest, NextResponse } from 'next/server';
import { llmMonitor } from '@/lib/ai/monitoring';
import { apiClient } from '@/lib/api/client';

export async function GET(request: NextRequest) {
  try {
    const localSnapshot = llmMonitor.getSnapshot();

    // Check if FastAPI backend has additional server-side telemetry
    let backendSnapshot: any = null;
    try {
      const backendRes = await apiClient.getLlmMonitoring(2000);
      if (backendRes.success && backendRes.data) {
        backendSnapshot = backendRes.data;
      }
    } catch {}

    // Merge backend metrics if available (e.g. higher request counts from backend executions)
    if (backendSnapshot) {
      if (backendSnapshot.totalRequests > localSnapshot.totalRequests) {
        localSnapshot.primary = {
          ...localSnapshot.primary,
          ...backendSnapshot.primary,
        };
        localSnapshot.secondary = {
          ...localSnapshot.secondary,
          ...backendSnapshot.secondary,
        };
        localSnapshot.localFallback = {
          ...localSnapshot.localFallback,
          ...backendSnapshot.localFallback,
        };
        localSnapshot.totalRequests = backendSnapshot.totalRequests;
        localSnapshot.totalSuccessfulRequests = backendSnapshot.totalSuccessfulRequests;
        localSnapshot.totalFailedRequests = backendSnapshot.totalFailedRequests;
        localSnapshot.totalTokensConsumed = backendSnapshot.totalTokensConsumed;
        localSnapshot.overallStatus = backendSnapshot.overallStatus;
        localSnapshot.activeProvider = backendSnapshot.activeProvider;
        localSnapshot.activeModel = backendSnapshot.activeModel;
        localSnapshot.fallbackActive = backendSnapshot.fallbackActive;
        localSnapshot.fallbackReason = backendSnapshot.fallbackReason;
        localSnapshot.localUsageState = backendSnapshot.localUsageState;
      }
    }

    return NextResponse.json(localSnapshot);
  } catch (error: any) {
    console.error('[API Error] /api/ai/monitoring:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve LLM monitoring snapshot',
        details: error?.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.thresholds && typeof body.thresholds === 'object') {
      llmMonitor.setThresholds(body.thresholds);
    }
    return NextResponse.json({ success: true, snapshot: llmMonitor.getSnapshot() });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 400 });
  }
}
