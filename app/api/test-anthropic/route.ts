import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Test endpoint to verify Anthropic API connectivity
 * Makes a minimal API call to check if the key works
 */
export async function GET() {
  const startTime = Date.now();

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'ANTHROPIC_API_KEY not set',
        duration: Date.now() - startTime
      });
    }

    const client = new Anthropic({ apiKey });

    // Make a minimal test request
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 50,
      messages: [
        { role: 'user', content: 'Say "API working" in exactly 2 words.' }
      ]
    });

    const textContent = response.content.find(block => block.type === 'text');

    return NextResponse.json({
      success: true,
      model: 'claude-3-haiku-20240307',
      response: textContent?.type === 'text' ? textContent.text : 'No text response',
      tokensUsed: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
      duration: Date.now() - startTime
    });

  } catch (error: unknown) {
    const err = error as Error & { status?: number; error?: { type?: string; message?: string } };

    return NextResponse.json({
      success: false,
      error: err.message,
      errorType: err.error?.type || 'unknown',
      errorDetails: err.error?.message || String(error),
      status: err.status,
      duration: Date.now() - startTime
    }, { status: 500 });
  }
}
