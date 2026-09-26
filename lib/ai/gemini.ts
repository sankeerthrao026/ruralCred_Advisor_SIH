/**
 * RuralCred Advisor — Google Gemini API Client for Next.js.
 * Unifies all frontend AI operations directly on Google Gemini models (e.g. gemini-2.5-flash).
 * Eliminates all external dependencies on Anthropic or OpenAI.
 */

export interface GeminiCallParams {
  systemInstruction?: string;
  userPrompt: string;
  responseMimeType?: 'application/json' | 'text/plain';
  temperature?: number;
  audioInline?: {
    mimeType: string;
    dataBase64: string;
  };
}

export interface GeminiCallResult {
  text: string;
  model: string;
  success: boolean;
  error?: string;
}

// Primary: NVIDIA NIM (Nemotron-3 Ultra 550B)
const NVIDIA_MODELS = [
  process.env.NVIDIA_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
  'nvidia/nemotron-3.5-lightning-30b-a3b',
];

// Secondary fallback: Google Gemini
const GEMINI_CANDIDATE_MODELS = [
  'gemini-1.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
];

import { llmMonitor } from './monitoring';

/**
 * Executes a call to the active LLM provider (NVIDIA NIM or Google Gemini).
 * Prioritizes NVIDIA NIM when NVIDIA_API_KEY is configured.
 * Automatically tracks request counts, token consumption, status, and latency.
 */
export async function callGeminiApi(params: GeminiCallParams): Promise<GeminiCallResult> {
  const nvidiaKey = process.env.NVIDIA_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  // 1. Try NVIDIA NIM Provider (Nemotron-3 Ultra)
  if (nvidiaKey) {
    const baseUrl = (process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '');
    const chatUrl = `${baseUrl}/chat/completions`;

    for (const model of NVIDIA_MODELS) {
      const startTime = Date.now();
      llmMonitor.recordRequestStart('primary', model);
      try {
        const messages: { role: string; content: string }[] = [];
        if (params.systemInstruction) {
          messages.push({ role: 'system', content: params.systemInstruction });
        }
        messages.push({ role: 'user', content: params.userPrompt });

        const body: Record<string, any> = {
          model,
          messages,
          temperature: params.temperature ?? 0.2,
          max_tokens: 2048,
        };

        if (params.responseMimeType === 'application/json') {
          body.response_format = { type: 'json_object' };
        }

        const res = await fetch(chatUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${nvidiaKey}`,
            'Accept': 'application/json',
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(35000),
        });

        const latencyMs = Date.now() - startTime;

        if (!res.ok) {
          const errorText = await res.text().catch(() => '');
          console.warn(`[NVIDIA NIM] Model ${model} responded with ${res.status}: ${errorText.slice(0, 150)}`);
          llmMonitor.recordRequestFailure('primary', model, `HTTP_${res.status}`, errorText, res.status);
          continue;
        }

        const json = await res.json();
        const rawText = json?.choices?.[0]?.message?.content;

        if (!rawText) {
          console.warn(`[NVIDIA NIM] Model ${model} returned empty content`);
          llmMonitor.recordRequestFailure('primary', model, 'EMPTY_CONTENT', 'Empty response content', res.status);
          continue;
        }

        const usage = json?.usage
          ? {
              inputTokens: json.usage.prompt_tokens,
              outputTokens: json.usage.completion_tokens,
              totalTokens: json.usage.total_tokens,
            }
          : undefined;

        llmMonitor.recordRequestSuccess('primary', model, usage, latencyMs);

        return {
          text: rawText,
          model,
          success: true,
        };
      } catch (err: any) {
        const errorMsg = err?.message || 'Network exception';
        console.warn(`[NVIDIA NIM] Network error calling model ${model}:`, errorMsg);
        llmMonitor.recordRequestFailure('primary', model, 'NETWORK_EXCEPTION', errorMsg);
      }
    }

    llmMonitor.recordFallbackActivation('NVIDIA NIM', 'secondary', 'All NVIDIA candidate models failed or timed out');
  }

  // 2. Secondary Fallback: Google Gemini
  if (geminiKey) {
    for (const model of GEMINI_CANDIDATE_MODELS) {
      const startTime = Date.now();
      llmMonitor.recordRequestStart('secondary', model);
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

        const parts: any[] = [];
        if (params.audioInline) {
          let cleanB64 = params.audioInline.dataBase64;
          if (cleanB64.includes(',')) {
            cleanB64 = cleanB64.split(',')[1];
          }
          parts.push({
            inlineData: {
              mimeType: params.audioInline.mimeType || 'audio/webm',
              data: cleanB64,
            },
          });
        }
        parts.push({ text: params.userPrompt });

        const body: Record<string, any> = {
          contents: [
            {
              role: 'user',
              parts,
            },
          ],
          generationConfig: {
            temperature: params.temperature ?? 0.2,
            maxOutputTokens: 2048,
          },
        };

        if (params.systemInstruction) {
          body.systemInstruction = {
            parts: [{ text: params.systemInstruction }],
          };
        }

        if (params.responseMimeType === 'application/json') {
          body.generationConfig.responseMimeType = 'application/json';
        }

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': geminiKey,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(10000),
        });

        const latencyMs = Date.now() - startTime;

        if (!res.ok) {
          const errorText = await res.text().catch(() => '');
          console.warn(`[Gemini] Model ${model} responded with ${res.status}: ${errorText.slice(0, 150)}`);
          llmMonitor.recordRequestFailure('secondary', model, `HTTP_${res.status}`, errorText, res.status);
          continue;
        }

        const json = await res.json();
        const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawText) {
          console.warn(`[Gemini] Model ${model} returned empty content`);
          llmMonitor.recordRequestFailure('secondary', model, 'EMPTY_CONTENT', 'Empty response content', res.status);
          continue;
        }

        const usage = json?.usageMetadata
          ? {
              inputTokens: json.usageMetadata.promptTokenCount,
              outputTokens: json.usageMetadata.candidatesTokenCount,
              totalTokens: json.usageMetadata.totalTokenCount,
            }
          : undefined;

        llmMonitor.recordRequestSuccess('secondary', model, usage, latencyMs);

        return {
          text: rawText,
          model,
          success: true,
        };
      } catch (err: any) {
        const errorMsg = err?.message || 'Network exception';
        console.warn(`[Gemini] Network error calling model ${model}:`, errorMsg);
        llmMonitor.recordRequestFailure('secondary', model, 'NETWORK_EXCEPTION', errorMsg);
      }
    }

    llmMonitor.recordFallbackActivation('Google Gemini', 'local_fallback', 'All Gemini candidate models failed or timed out');
  }

  // Record deterministic fallback execution
  llmMonitor.recordRequestStart('local_fallback');
  llmMonitor.recordRequestSuccess('local_fallback', 'local-dataset-synthesizer', undefined, 0);

  return {
    text: '',
    model: '',
    success: false,
    error: 'All LLM candidates (NVIDIA NIM and Gemini) failed or timed out.',
  };
}
