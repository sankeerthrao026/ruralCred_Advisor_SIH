/**
 * RuralCred Advisor — LLM Monitoring, Quota Transparency & Telemetry Test Suite
 * Validates 15 core invariants:
 * 1. Successful request increments total requests and success count
 * 2. Failed request increments failure count and updates error status
 * 3. Token usage is recorded when exposed by provider
 * 4. Token usage is reported as unavailable / zero when not provided
 * 5. Rate limit errors mark provider status as RATE_LIMITED and preserve diagnostics
 * 6. Authentication errors mark provider status as AUTH_ERROR / degraded
 * 7. Network timeouts mark provider as NETWORK_ERROR / degraded
 * 8. Provider fallback switches to secondary provider when primary fails
 * 9. Grounded local fallback is used when all LLM providers fail
 * 10. Fallback activation records reason audit
 * 11. Provider status returns clear active/degraded/offline state
 * 12. Sensitive API keys are never exposed in monitoring responses or error strings
 * 13. Sanitizer strips potential key patterns from error messages
 * 14. Warning threshold status triggers WARNING / CRITICAL states based on local thresholds without fabricating quota
 * 15. Quota message explicitly declares provider_not_available and does not invent numbers
 */

import { strict as assert } from 'node:assert';
import {
  llmMonitor,
  sanitizeErrorMessage,
  type LLMMonitoringSnapshot,
  type ProviderMetrics,
} from '../lib/ai/monitoring';

let totalTests = 0;
let passedTests = 0;

function runTest(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

console.log('\n======================================================');
console.log('  RURALCRED — LLM MONITORING & TELEMETRY TEST SUITE');
console.log('======================================================\n');

// Reset monitor before running tests
llmMonitor.reset();
llmMonitor.setConfigured('primary', true);
llmMonitor.setConfigured('secondary', true);

// ---------------- 1. SUCCESSFUL REQUEST COUNTS ----------------
console.log('--- 1. Request Counter & Success Tracking ---');

runTest('MON_01: Successful request increments total and success counters', () => {
  llmMonitor.reset();
  llmMonitor.recordRequestStart('primary', 'nvidia/nemotron-3-ultra-550b-a55b');
  
  llmMonitor.recordRequestSuccess(
    'primary',
    'nvidia/nemotron-3-ultra-550b-a55b',
    { inputTokens: 50, outputTokens: 100, totalTokens: 150 },
    120 // latency ms
  );

  const snap = llmMonitor.getSnapshot();
  assert.equal(snap.totalRequests, 1);
  assert.equal(snap.totalSuccessfulRequests, 1);
  assert.equal(snap.totalFailedRequests, 0);
  assert.equal(snap.primary.requestCount, 1);
  assert.equal(snap.primary.successfulRequestCount, 1);
  assert.equal(snap.primary.failedRequestCount, 0);
  assert.equal(snap.primary.status, 'ONLINE');
  assert.equal(snap.primary.totalTokens, 150);
});

// ---------------- 2. FAILED REQUEST COUNTS ----------------
console.log('--- 2. Error Tracking & Failure Counters ---');

runTest('MON_02: Failed request increments failure count and records sanitized error', () => {
  llmMonitor.recordRequestStart('secondary', 'gemini-2.5-flash');
  llmMonitor.recordRequestFailure('secondary', 'gemini-2.5-flash', 'HTTPError', 'Inference failed due to backend 500 error', 500);

  const snap = llmMonitor.getSnapshot();
  assert.equal(snap.totalRequests, 2);
  assert.equal(snap.totalSuccessfulRequests, 1);
  assert.equal(snap.totalFailedRequests, 1);
  assert.equal(snap.secondary.requestCount, 1);
  assert.equal(snap.secondary.failedRequestCount, 1);
  assert.equal(snap.secondary.status, 'PROVIDER_ERROR');
  assert(snap.secondary.lastErrorMessage?.includes('500 error'));
});

// ---------------- 3. TOKEN USAGE RECORDING ----------------
console.log('--- 3. Token Usage Metrics ---');

runTest('MON_03: Token usage is accurately accumulated across requests', () => {
  llmMonitor.recordRequestStart('primary', 'nvidia/nemotron-3-ultra-550b-a55b');
  llmMonitor.recordRequestSuccess('primary', 'nvidia/nemotron-3-ultra-550b-a55b', {
    inputTokens: 200,
    outputTokens: 300,
    totalTokens: 500,
  }, 100);

  const snap = llmMonitor.getSnapshot();
  assert.equal(snap.totalTokensConsumed, 650); // 150 from MON_01 + 500
  assert.equal(snap.primary.inputTokens, 250);
  assert.equal(snap.primary.outputTokens, 400);
  assert.equal(snap.primary.totalTokens, 650);
});

// ---------------- 4. MISSING TOKEN USAGE HANDLING ----------------
console.log('--- 4. Graceful Handling of Missing Token Usage ---');

runTest('MON_04: Token usage remains tracked and does not throw when provider omits usage', () => {
  llmMonitor.recordRequestStart('primary', 'nvidia/nemotron-3-ultra-550b-a55b');
  llmMonitor.recordRequestSuccess('primary', 'nvidia/nemotron-3-ultra-550b-a55b', undefined, 90);

  const snap = llmMonitor.getSnapshot();
  assert.equal(snap.totalRequests, 4);
  assert.equal(snap.totalTokensConsumed, 650); // Unchanged
  assert.equal(snap.primary.totalTokens, 650);
});

// ---------------- 5. RATE LIMIT ERROR CLASSIFICATION ----------------
console.log('--- 5. Rate Limit Handling ---');

runTest('MON_05: Rate limit error (429 / RESOURCE_EXHAUSTED) marks provider RATE_LIMITED', () => {
  llmMonitor.recordRequestStart('primary', 'nvidia/nemotron-3-ultra-550b-a55b');
  llmMonitor.recordRequestFailure(
    'primary',
    'nvidia/nemotron-3-ultra-550b-a55b',
    'RateLimitError',
    '429 Too Many Requests: Rate limit exceeded for quota group',
    429
  );

  const snap = llmMonitor.getSnapshot();
  assert.equal(snap.primary.status, 'RATE_LIMITED');
  assert.equal(snap.primary.lastErrorMessage, '429 Too Many Requests: Rate limit exceeded for quota group');
});

// ---------------- 6. AUTH ERROR CLASSIFICATION ----------------
console.log('--- 6. Authentication Error Handling ---');

runTest('MON_06: Auth error (401 / 403 / API_KEY_INVALID) marks provider AUTH_ERROR', () => {
  llmMonitor.recordRequestStart('secondary', 'gemini-2.5-flash');
  llmMonitor.recordRequestFailure(
    'secondary',
    'gemini-2.5-flash',
    'AuthError',
    'API key not valid. Please pass a valid API key (403)',
    403
  );

  const snap = llmMonitor.getSnapshot();
  assert.equal(snap.secondary.status, 'AUTH_ERROR');
});

// ---------------- 7. NETWORK TIMEOUT CLASSIFICATION ----------------
console.log('--- 7. Network Timeout Handling ---');

runTest('MON_07: Network timeout / connection refused marks provider NETWORK_ERROR', () => {
  llmMonitor.recordRequestStart('primary', 'nvidia/nemotron-3-ultra-550b-a55b');
  llmMonitor.recordRequestFailure(
    'primary',
    'nvidia/nemotron-3-ultra-550b-a55b',
    'TimeoutError',
    'ETIMEDOUT: Connection timed out to api.nvidia.com',
    undefined
  );

  const snap = llmMonitor.getSnapshot();
  assert.equal(snap.primary.status, 'NETWORK_ERROR');
});

// ---------------- 8. FALLBACK TELEMETRY RECORDING ----------------
console.log('--- 8. Fallback Hierarchy & Event Logging ---');

runTest('MON_08: Fallback from primary to secondary is logged with reason', () => {
  llmMonitor.recordFallbackActivation(
    'NVIDIA NIM',
    'secondary',
    '429 rate limit exceeded'
  );

  const snap = llmMonitor.getSnapshot();
  assert.equal(snap.fallbackActive, true);
  assert.equal(snap.activeTier, 'secondary');
  assert(snap.fallbackReason?.includes('NVIDIA NIM unavailable: 429 rate limit'));
  assert.equal(snap.overallStatus, 'FALLBACK_ACTIVE');
});

// ---------------- 9. GROUNDED LOCAL FALLBACK RECORDING ----------------
console.log('--- 9. Grounded Local Fallback Activation ---');

runTest('MON_09: Fallback to local grounded fallback is recorded correctly', () => {
  llmMonitor.recordFallbackActivation(
    'Google Gemini',
    'local_fallback',
    'All external LLM APIs unavailable'
  );

  const snap = llmMonitor.getSnapshot();
  assert.equal(snap.fallbackActive, true);
  assert.equal(snap.activeTier, 'local_fallback');
  assert.equal(snap.localFallback.status, 'ONLINE');
});

// ---------------- 10. RECOVERY AFTER SUCCESS ----------------
console.log('--- 10. Recovery State Reset on Primary Success ---');

runTest('MON_10: Primary provider success resets fallback active flag', () => {
  llmMonitor.recordRequestSuccess('primary', 'nvidia/nemotron-3-ultra-550b-a55b', { totalTokens: 50 }, 80);
  const snap = llmMonitor.getSnapshot();
  assert.equal(snap.fallbackActive, false);
  assert.equal(snap.activeTier, 'primary');
  assert.equal(snap.fallbackReason, null);
});

// ---------------- 11. AGGREGATE PROVIDER STATUS ----------------
console.log('--- 11. Aggregate Health Status ---');

runTest('MON_11: Snapshot exposes all registered provider tiers with valid status', () => {
  const snap = llmMonitor.getSnapshot();
  assert(snap.primary !== undefined);
  assert(snap.secondary !== undefined);
  assert(snap.localFallback !== undefined);
  assert(typeof snap.primary.status === 'string');
  assert(typeof snap.secondary.status === 'string');
  assert(typeof snap.localFallback.status === 'string');
});

// ---------------- 12. SECURITY & API KEY SCRUBBING ----------------
console.log('--- 12. Security & Redaction of API Keys ---');

runTest('MON_12: Sensitive Google & NVIDIA API keys are never stored in error logs', () => {
  const sampleGoogleKey = 'AIzaSyDx9876543210AbCdEfGhIjKlMnOpQrStU';
  const sampleNvidiaKey = 'nvapi-abcdef1234567890abcdef1234567890';
  const rawError = `Request failed: invalid key ${sampleGoogleKey} and header Bearer ${sampleNvidiaKey}`;

  llmMonitor.recordRequestFailure('primary', 'nvidia/nemotron-3-ultra-550b-a55b', 'SecurityTest', rawError);

  const snap = llmMonitor.getSnapshot();
  const lastErr = snap.primary.lastErrorMessage || '';
  
  assert(!lastErr.includes(sampleGoogleKey), 'Google API key leaked into lastError!');
  assert(!lastErr.includes(sampleNvidiaKey), 'NVIDIA API key leaked into lastError!');
  assert(lastErr.includes('[REDACTED_GOOGLE_API_KEY]'));
  assert(lastErr.includes('[REDACTED_NVIDIA_API_KEY]'));
});

// ---------------- 13. SANITIZER REGEX UNIT TESTS ----------------
console.log('--- 13. Error Sanitizer Unit Tests ---');

runTest('MON_13: sanitizeErrorMessage strips multiple key types and bearer tokens', () => {
  const textWithBearer = 'Authorization: Bearer mySecretToken1234567890';
  const sanitized = sanitizeErrorMessage(textWithBearer);
  assert.equal(sanitized, 'Authorization: Bearer [REDACTED_TOKEN]');

  const textWithApiKeyParam = 'https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyA1B2C3D4E5F6G7H8';
  const sanitizedParam = sanitizeErrorMessage(textWithApiKeyParam);
  assert(sanitizedParam.includes('[REDACTED_KEY]'));
  assert(!sanitizedParam.includes('AIzaSyA1B2C3D4E5F6G7H8'));
});

// ---------------- 14. LOCAL THRESHOLDS & QUOTA WARNINGS ----------------
console.log('--- 14. Local Warning Thresholds (No Quota Fabrication) ---');

runTest('MON_14: Usage status transitions to WARNING/CRITICAL based on configured local limits', () => {
  llmMonitor.reset();
  
  // Under normal limit
  let snap = llmMonitor.getSnapshot();
  assert.equal(snap.localUsageState, 'NORMAL');

  // Simulate requests crossing warning threshold (80)
  for (let i = 0; i < 85; i++) {
    llmMonitor.recordRequestStart('primary', 'nvidia/nemotron-3-ultra-550b-a55b');
    llmMonitor.recordRequestSuccess('primary', 'nvidia/nemotron-3-ultra-550b-a55b', {
      inputTokens: 10,
      outputTokens: 10,
      totalTokens: 20,
    }, 50);
  }

  snap = llmMonitor.getSnapshot();
  assert.equal(snap.totalRequests, 85);
  assert.equal(snap.localUsageState, 'WARNING');

  // Simulate requests crossing critical threshold (100)
  for (let i = 0; i < 20; i++) {
    llmMonitor.recordRequestStart('primary', 'nvidia/nemotron-3-ultra-550b-a55b');
    llmMonitor.recordRequestSuccess('primary', 'nvidia/nemotron-3-ultra-550b-a55b', {
      inputTokens: 10,
      outputTokens: 10,
      totalTokens: 20,
    }, 50);
  }

  snap = llmMonitor.getSnapshot();
  assert.equal(snap.totalRequests, 105);
  assert.equal(snap.localUsageState, 'CRITICAL');
});

// ---------------- 15. QUOTA TRANSPARENCY REQUIREMENT ----------------
console.log('--- 15. Quota Source Transparency Invariant ---');

runTest('MON_15: Quota message explicitly declares provider_not_available and does not invent numbers', () => {
  const snap = llmMonitor.getSnapshot();
  
  assert.equal(
    snap.quotaRemaining,
    'Quota remaining: Not available from provider',
    'Must not fabricate remaining quota numbers!'
  );
  assert.equal(
    snap.quotaSource,
    'provider_not_available',
    "quotaSource must be 'provider_not_available'"
  );
});

console.log('\n======================================================');
console.log(`  LLM MONITORING TESTS COMPLETE: ${passedTests}/${totalTests} PASSED`);
console.log('======================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
