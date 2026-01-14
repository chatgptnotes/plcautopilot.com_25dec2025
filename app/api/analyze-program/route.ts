/**
 * API Route: Analyze PLC Program
 * Uses AI to analyze ladder logic and generate appropriate test cases
 */

import { NextResponse } from 'next/server';
import { analyzeProgram, isAIAvailable } from '@/lib/ai-test-generator';

export async function POST(request: Request) {
  try {
    // Check if AI is available
    if (!isAIAvailable()) {
      return NextResponse.json(
        { error: 'AI analysis not available - ANTHROPIC_API_KEY not configured' },
        { status: 503 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { smbpContent } = body;

    if (!smbpContent) {
      return NextResponse.json(
        { error: 'Missing smbpContent in request body' },
        { status: 400 }
      );
    }

    // Analyze the program
    const result = await analyzeProgram(smbpContent);

    // Check for errors
    if ('error' in result && result.error) {
      return NextResponse.json(
        {
          error: result.message,
          fallbackRequired: true
        },
        { status: 500 }
      );
    }

    // Return successful analysis
    return NextResponse.json(result);

  } catch (error) {
    console.error('Analyze program API error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        fallbackRequired: true
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check if AI analysis is available
export async function GET() {
  return NextResponse.json({
    available: isAIAvailable(),
    message: isAIAvailable()
      ? 'AI analysis is available'
      : 'AI analysis not available - configure ANTHROPIC_API_KEY'
  });
}
