/**
 * RuralCred Advisor — Next.js LLM Client.
 * Unifies AI advisory operations across:
 * 1. GPT (Primary Tier 1)
 * 2. NVIDIA NIM / Nemotron (Fallback Tier 2)
 * 3. Grounded Deterministic Engine (Final Safety Fallback Tier 3)
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

// Primary: GPT
const GPT_MODELS = [
  process.env.OPENAI_MODEL || 'gpt-4o-mini',
  'gpt-4o',
  'gpt-3.5-turbo',
];

// Fallback 1: NVIDIA NIM
const NVIDIA_MODELS = [
  process.env.NVIDIA_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
  'nvidia/nemotron-3.5-lightning-30b-a3b',
];

import { llmMonitor } from './monitoring';

/**
 * Executes a call to the active LLM provider hierarchy:
 * 1. GPT (Primary Tier 1)
 * 2. NVIDIA NIM / Nemotron (Fallback Tier 2)
 * 3. Deterministic Grounded Engine (Local Fallback Tier 3)
 * Automatically tracks request counts, token consumption, status, and latency.
 */
export async function callGeminiApi(params: GeminiCallParams): Promise<GeminiCallResult> {
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const nvidiaKey = process.env.NVIDIA_API_KEY?.trim();

  // 1. Try GPT Provider (Primary)
  if (openaiKey) {
    const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
    const chatUrl = `${baseUrl}/chat/completions`;

    // Deduplicate candidate models
    const candidateModels = Array.from(new Set(GPT_MODELS.filter(Boolean)));

    for (const model of candidateModels) {
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
            'Authorization': `Bearer ${openaiKey}`,
            'Accept': 'application/json',
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(3500),
        });

        const latencyMs = Date.now() - startTime;

        if (!res.ok) {
          const errorText = await res.text().catch(() => '');
          console.warn(`[AI Advisory] Primary request failed (HTTP ${res.status}) - ${errorText.slice(0, 100)}`);
          llmMonitor.recordRequestFailure('primary', model, `HTTP_${res.status}`, errorText, res.status);
          if (res.status === 401 || res.status === 402 || res.status === 403 || res.status === 404 || res.status === 429 || res.status === 503) {
            break; // Fast fail across candidate models on key, quota/balance, or capacity failure
          }
          continue;
        }

        const json = await res.json();
        const rawText = json?.choices?.[0]?.message?.content;

        if (!rawText) {
          console.warn(`[AI Advisory] Primary request returned empty content`);
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
        console.log(`[AI Advisory] Inference completed | Latency: ${latencyMs}ms | Status: SUCCESS`);

        return {
          text: rawText,
          model,
          success: true,
        };
      } catch (err: any) {
        const latencyMs = Date.now() - startTime;
        const errorMsg = err?.message || 'Network exception';
        console.warn(`[AI Advisory] Primary request timed out / exception (${errorMsg})`);
        llmMonitor.recordRequestFailure('primary', model, 'NETWORK_EXCEPTION', errorMsg);
        break;
      }
    }

    llmMonitor.recordFallbackActivation('GPT', 'secondary', 'All GPT candidate models failed or timed out');
  }

  // 2. Try NVIDIA NIM Provider (Nemotron Fallback)
  if (nvidiaKey) {
    const baseUrl = (process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '');
    const chatUrl = `${baseUrl}/chat/completions`;

    const candidateModels = Array.from(new Set(NVIDIA_MODELS.filter(Boolean)));

    for (const model of candidateModels) {
      const startTime = Date.now();
      llmMonitor.recordRequestStart('secondary', model);
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
          signal: AbortSignal.timeout(2500),
        });

        const latencyMs = Date.now() - startTime;

        if (!res.ok) {
          const errorText = await res.text().catch(() => '');
          console.warn(`[AI Advisory] Fallback request failed (HTTP ${res.status}) - ${errorText.slice(0, 100)}`);
          llmMonitor.recordRequestFailure('secondary', model, `HTTP_${res.status}`, errorText, res.status);
          if (res.status === 401 || res.status === 403 || res.status === 404 || res.status === 429 || res.status === 503) {
            break; // Fast fail across candidate models on auth or service exhaustion
          }
          continue;
        }

        const json = await res.json();
        const rawText = json?.choices?.[0]?.message?.content;

        if (!rawText) {
          console.warn(`[AI Advisory] Fallback request returned empty content`);
          llmMonitor.recordRequestFailure('secondary', model, 'EMPTY_CONTENT', 'Empty response content', res.status);
          continue;
        }

        const usage = json?.usage
          ? {
              inputTokens: json.usage.prompt_tokens,
              outputTokens: json.usage.completion_tokens,
              totalTokens: json.usage.total_tokens,
            }
          : undefined;

        llmMonitor.recordRequestSuccess('secondary', model, usage, latencyMs);
        console.log(`[AI Advisory] Fallback inference completed | Latency: ${latencyMs}ms | Status: SUCCESS`);

        return {
          text: rawText,
          model,
          success: true,
        };
      } catch (err: any) {
        const latencyMs = Date.now() - startTime;
        const errorMsg = err?.message || 'Network exception';
        console.warn(`[AI Advisory] Fallback request timed out / exception (${errorMsg})`);
        llmMonitor.recordRequestFailure('secondary', model, 'NETWORK_EXCEPTION', errorMsg);
        break;
      }
    }

    llmMonitor.recordFallbackActivation('NVIDIA NIM', 'local_fallback', 'All NVIDIA candidate models failed or timed out');
  }

  // 3. Final Safety Fallback: Deterministic Grounded Engine
  llmMonitor.recordRequestStart('local_fallback');
  llmMonitor.recordRequestSuccess('local_fallback', 'local-dataset-synthesizer', undefined, 0);
  console.log('[AI Advisory] Grounded deterministic fallback activated');

  return {
    text: '',
    model: '',
    success: false,
    error: 'Live advisory service currently unavailable. Using verified local dataset.',
  };
}
