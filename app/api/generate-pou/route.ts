/**
 * POU-Specific Generation API
 *
 * This endpoint generates rungs for a single POU type using focused prompts.
 * Token efficient: ~800-2000 tokens per call vs ~22000 for monolithic approach.
 *
 * Usage:
 * POST /api/generate-pou
 * {
 *   "pouType": "io_mapping",
 *   "requirements": "Scale 4-20mA ultrasonic sensor to 0-3000mm",
 *   "model": "TM221CE24T",
 *   "context": { "sensorAddress": "%IW1.0", "minValue": 0, "maxValue": 3000 }
 * }
 */

export const maxDuration = 60; // 1 minute max for single POU

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getPOUPrompt, DEFAULT_POU_NAMES } from '@/lib/pou-prompts';
import { POUCategory } from '@/lib/smbp-templates';
import { fixSmbpXml } from '@/lib/smbp-xml-fixer';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface GeneratePOURequest {
  pouType: POUCategory;
  requirements: string;
  model: string;
  context?: {
    sensorAddress?: string;
    minValue?: number;
    maxValue?: number;
    existingMemoryBits?: string[];
    existingTimers?: string[];
  };
}

interface GeneratePOUResponse {
  success: boolean;
  pouType: POUCategory;
  pouName: string;
  rungs: string;
  symbolsJson?: object;
  tokensUsed?: {
    input: number;
    output: number;
  };
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<GeneratePOUResponse>> {
  try {
    const body: GeneratePOURequest = await request.json();
    const { pouType, requirements, model, context } = body;

    // Validate POU type
    const validPOUTypes: POUCategory[] = [
      'system_init',
      'io_mapping',
      'auto_operation',
      'manual_operation',
      'alarms_faults',
      'custom',
    ];

    if (!validPOUTypes.includes(pouType)) {
      return NextResponse.json({
        success: false,
        pouType,
        pouName: '',
        rungs: '',
        error: `Invalid POU type: ${pouType}. Valid types: ${validPOUTypes.join(', ')}`,
      }, { status: 400 });
    }

    // Get the focused prompt for this POU type
    const pouPrompt = getPOUPrompt(pouType);
    const pouName = DEFAULT_POU_NAMES[pouType];

    // Build context-aware user message
    let userMessage = `Generate ${pouName} rungs for ${model} PLC.\n\nRequirements:\n${requirements}`;

    if (context) {
      if (context.sensorAddress) {
        userMessage += `\n\nSensor Address: ${context.sensorAddress}`;
      }
      if (context.minValue !== undefined && context.maxValue !== undefined) {
        userMessage += `\nScale Range: ${context.minValue} to ${context.maxValue}`;
      }
      if (context.existingMemoryBits?.length) {
        userMessage += `\n\nAlready used %M bits: ${context.existingMemoryBits.join(', ')}`;
      }
      if (context.existingTimers?.length) {
        userMessage += `\nAlready used timers: ${context.existingTimers.join(', ')}`;
      }
    }

    // Generate with focused prompt (much smaller context!)
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000, // Increased for ~40 rungs per POU (~200 total)
      system: pouPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    // Collect streamed response
    let responseText = '';
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        responseText += event.delta.text;
      }
    }

    const finalMessage = await stream.finalMessage();

    // Extract rungs XML and symbols JSON
    const { rungs, symbolsJson } = parseResponse(responseText);

    // Apply XML fixer to ensure valid structure
    const fixedRungs = fixSmbpXml(rungs);

    return NextResponse.json({
      success: true,
      pouType,
      pouName,
      rungs: fixedRungs,
      symbolsJson,
      tokensUsed: {
        input: finalMessage.usage.input_tokens,
        output: finalMessage.usage.output_tokens,
      },
    });

  } catch (error) {
    console.error('POU generation error:', error);
    return NextResponse.json({
      success: false,
      pouType: 'custom',
      pouName: '',
      rungs: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }, { status: 500 });
  }
}

/**
 * Parse AI response to extract rungs and symbols
 */
function parseResponse(response: string): { rungs: string; symbolsJson?: object } {
  // Extract SYMBOLS_JSON block
  const symbolsMatch = response.match(/<!--SYMBOLS_JSON\s*([\s\S]*?)\s*SYMBOLS_JSON-->/);
  let symbolsJson: object | undefined;

  if (symbolsMatch) {
    try {
      symbolsJson = JSON.parse(symbolsMatch[1].trim());
    } catch {
      console.warn('Failed to parse SYMBOLS_JSON');
    }
  }

  // Extract XML rungs (everything that looks like RungEntity)
  const rungs = response
    .replace(/<!--SYMBOLS_JSON[\s\S]*?SYMBOLS_JSON-->/g, '')
    .replace(/```xml/g, '')
    .replace(/```/g, '')
    .trim();

  return { rungs, symbolsJson };
}

/**
 * GET handler for API info
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    name: 'POU Generator API',
    version: '1.0.0',
    description: 'Token-efficient POU-specific rung generation',
    endpoints: {
      POST: {
        description: 'Generate rungs for a specific POU type',
        body: {
          pouType: 'system_init | io_mapping | auto_operation | manual_operation | alarms_faults | custom',
          requirements: 'Description of what to generate',
          model: 'TM221CE24T (or other M221 model)',
          context: '(optional) Additional context like sensor addresses',
        },
      },
    },
    tokenEfficiency: {
      monolithic: '~22,000 tokens per request',
      modular: '~800-2,000 tokens per POU',
      savings: '55-75%',
    },
  });
}
