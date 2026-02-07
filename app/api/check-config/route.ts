import { NextResponse } from 'next/server';

/**
 * Diagnostic endpoint to check API configuration
 * This helps debug production issues with missing/invalid env vars
 */
export async function GET() {
  const config = {
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    anthropicKeyPrefix: process.env.ANTHROPIC_API_KEY?.substring(0, 10) + '...',
    claudeModel: process.env.CLAUDE_MODEL || '(not set - using default)',
    nodeEnv: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL,
    timestamp: new Date().toISOString()
  };

  // Check if API key looks valid
  const apiKey = process.env.ANTHROPIC_API_KEY;
  let keyStatus = 'missing';
  if (apiKey) {
    if (apiKey.startsWith('sk-ant-')) {
      keyStatus = 'valid format';
    } else if (apiKey.includes('=')) {
      keyStatus = 'INVALID - contains = sign (malformed env var)';
    } else {
      keyStatus = 'unknown format';
    }
  }

  // Check if model name looks valid
  const model = process.env.CLAUDE_MODEL;
  let modelStatus = 'using default (claude-opus-4-6)';
  if (model) {
    if (model.includes('=')) {
      modelStatus = 'INVALID - contains = sign (malformed env var)';
    } else if (model.startsWith('claude-')) {
      modelStatus = 'valid format';
    } else {
      modelStatus = 'unknown format';
    }
  }

  return NextResponse.json({
    ...config,
    keyStatus,
    modelStatus,
    recommendation: !apiKey
      ? 'Set ANTHROPIC_API_KEY in Vercel environment variables'
      : keyStatus !== 'valid format'
      ? 'Check ANTHROPIC_API_KEY format - should start with sk-ant-'
      : modelStatus.includes('INVALID')
      ? 'Fix CLAUDE_MODEL - remove the variable name from the value'
      : 'Configuration looks OK - check Vercel function logs for detailed error'
  });
}
