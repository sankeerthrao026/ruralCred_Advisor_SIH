import { NextResponse } from 'next/server';

export async function GET() {
  const backendBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api$/, '') || 'http://127.0.0.1:8000';
  const hasAiKey = Boolean(process.env.OPENAI_API_KEY || process.env.NVIDIA_API_KEY || process.env.GEMINI_API_KEY);

  let backendStatus = {
    connected: false,
    details: null as any,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${backendBaseUrl}/api/health`, {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      backendStatus = {
        connected: true,
        details: data,
      };
    }
  } catch (err: any) {
    backendStatus = {
      connected: false,
      details: err?.message || 'Backend unreachable',
    };
  }

  return NextResponse.json({
    status: 'healthy',
    service: 'RuralCred Advisor Frontend & API Gateway',
    aiProvider: hasAiKey ? 'Live Advisory Engine' : 'Grounded Local Engine',
    ragVectorStore: 'ChromaDB (ruralcred_knowledge via FastAPI)',
    hasAiKey,
    pipelineMode: backendStatus.connected
      ? (backendStatus.details?.gemini_configured ? 'FastAPI ChromaDB RAG + Live Advisory' : 'FastAPI ChromaDB Grounded Fallback')
      : (hasAiKey ? 'Direct Next.js Live Advisory + Bundled Grounding' : 'Standalone Grounded Fallback'),
    backendBridge: {
      targetUrl: backendBaseUrl,
      ...backendStatus,
    },
    timestamp: new Date().toISOString(),
  });
}
