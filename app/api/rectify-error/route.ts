import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ErrorRectificationRequest {
  programCode: string;
  platform: string;
  errorScreenshot?: string; // Base64 encoded image
  errorMessage: string;
  plcModel: string;
}

interface RectificationResponse {
  success: boolean;
  analysis: {
    errorType: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    affectedComponents: string[];
    rootCause: string;
  };
  solutions: Array<{
    description: string;
    correctedCode?: string;
    explanation: string;
    confidence: number; // 0-100
  }>;
  recommendations: string[];
}

const SYSTEM_PROMPT = `You are an expert PLC programming assistant specializing in error analysis and debugging. You analyze error screenshots and messages from PLC programming software.

When analyzing errors, you should:
1. Identify the exact error type from the screenshot or message
2. Determine the severity (low, medium, high, critical)
3. Identify affected components (timers, variables, I/O, etc.)
4. Explain the root cause clearly
5. Provide specific, actionable solutions

For Schneider Electric Machine Expert Basic (.smbp files):
- Common errors include XML format issues, timer configuration, variable declarations
- Extension module errors often relate to Index/Address mismatch
- Analog scaling issues with %IW/%MW addresses

For Siemens TIA Portal:
- Data block errors, symbol definition issues
- Data type mismatches, instruction compatibility

For Rockwell Studio 5000:
- Tag definition errors, routine organization issues
- Instruction compatibility with controller type

ALWAYS respond in valid JSON format with this structure:
{
  "errorType": "string describing the error type",
  "severity": "low|medium|high|critical",
  "affectedComponents": ["array", "of", "components"],
  "rootCause": "detailed explanation of what caused the error",
  "solutions": [
    {
      "description": "brief solution title",
      "explanation": "detailed step-by-step fix",
      "confidence": 85
    }
  ],
  "recommendations": ["array", "of", "preventive", "tips"]
}`;

export async function POST(req: NextRequest) {
  try {
    const body: ErrorRectificationRequest = await req.json();
    const { programCode, platform, errorScreenshot, errorMessage, plcModel } = body;

    // If we have a screenshot, use Claude Vision to analyze it
    if (errorScreenshot || errorMessage) {
      try {
        const analysis = await analyzeWithClaude(
          errorScreenshot,
          errorMessage,
          platform,
          plcModel,
          programCode
        );

        return NextResponse.json({
          success: true,
          ...analysis,
        });
      } catch (claudeError) {
        console.error('Claude analysis failed, falling back to pattern matching:', claudeError);
        // Fall back to pattern matching if Claude fails
      }
    }

    // Fallback: Analyze the error with pattern matching
    const analysis = analyzeErrorFallback(errorMessage, platform);
    const solutions = generateSolutionsFallback(programCode, analysis, platform, plcModel);
    const recommendations = generateRecommendationsFallback(analysis, platform);

    const response: RectificationResponse = {
      success: true,
      analysis,
      solutions,
      recommendations,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error processing rectification request:', error);
    return NextResponse.json(
      { error: 'Failed to process error rectification request' },
      { status: 500 }
    );
  }
}

async function analyzeWithClaude(
  errorScreenshot: string | undefined,
  errorMessage: string,
  platform: string,
  plcModel: string,
  programCode: string
): Promise<Omit<RectificationResponse, 'success'>> {
  // Build the message content
  type ContentBlock =
    | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
    | { type: 'text'; text: string };

  const content: ContentBlock[] = [];

  // Add image if provided
  if (errorScreenshot) {
    // Extract base64 data (remove data:image/...;base64, prefix if present)
    const base64Data = errorScreenshot.includes(',')
      ? errorScreenshot.split(',')[1]
      : errorScreenshot;

    // Detect media type from prefix or default to png
    let mediaType = 'image/png';
    if (errorScreenshot.includes('data:')) {
      const match = errorScreenshot.match(/data:([^;]+);/);
      if (match) mediaType = match[1];
    }

    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaType,
        data: base64Data,
      },
    });
  }

  // Add text description
  let textPrompt = `Analyze this PLC programming error:

Platform: ${platform}
PLC Model: ${plcModel}

Error Message from User: ${errorMessage || 'No error message provided'}

${errorScreenshot ? 'I have uploaded a screenshot of the error from the PLC programming software. Please analyze the screenshot carefully to identify the exact error.' : ''}

${programCode ? `\nRelevant Program Code:\n${programCode.substring(0, 2000)}` : ''}

Please analyze this error and provide your response in JSON format as specified.`;

  content.push({
    type: 'text',
    text: textPrompt,
  });

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content,
      },
    ],
  });

  // Extract the text response
  const textContent = response.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  // Parse JSON from response
  let jsonResponse: {
    errorType: string;
    severity: string;
    affectedComponents: string[];
    rootCause: string;
    solutions: Array<{ description: string; explanation: string; confidence: number }>;
    recommendations: string[];
  };

  try {
    // Try to extract JSON from the response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonResponse = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No JSON found in response');
    }
  } catch {
    // If JSON parsing fails, create a structured response from the text
    jsonResponse = {
      errorType: 'Analysis Complete',
      severity: 'medium',
      affectedComponents: ['See analysis'],
      rootCause: textContent.text,
      solutions: [{
        description: 'AI Analysis',
        explanation: textContent.text,
        confidence: 75,
      }],
      recommendations: ['Review the AI analysis above for specific guidance'],
    };
  }

  return {
    analysis: {
      errorType: jsonResponse.errorType || 'Unknown Error',
      severity: (jsonResponse.severity as 'low' | 'medium' | 'high' | 'critical') || 'medium',
      affectedComponents: jsonResponse.affectedComponents || [],
      rootCause: jsonResponse.rootCause || 'Unable to determine',
    },
    solutions: jsonResponse.solutions?.map(s => ({
      description: s.description,
      explanation: s.explanation,
      confidence: s.confidence || 70,
    })) || [],
    recommendations: jsonResponse.recommendations || [],
  };
}

// Fallback functions when Claude is unavailable
function analyzeErrorFallback(
  errorMessage: string,
  platform: string
): RectificationResponse['analysis'] {
  const errorPatterns = {
    schneider: {
      'expansion module': {
        type: 'Expansion Module Configuration Error',
        severity: 'high' as const,
        components: ['Extension modules', 'Hardware configuration', 'I/O addressing'],
        cause: 'Expansion module not properly configured in hardware tree. Check module Index matches slot position and I/O addresses are correct.',
      },
      'timer format': {
        type: 'Timer Configuration Error',
        severity: 'medium' as const,
        components: ['Timer blocks', 'Time base settings'],
        cause: 'Machine Expert Basic requires timer preset in seconds. Check <Base> element uses OneSecond, HundredMillisecond, etc.',
      },
      'variable not declared': {
        type: 'Variable Declaration Error',
        severity: 'high' as const,
        components: ['Variable declarations', 'Symbol table'],
        cause: 'Variable used in program but not declared in Symbols section',
      },
      'invalid address': {
        type: 'I/O Address Error',
        severity: 'high' as const,
        components: ['I/O configuration', 'Address mapping'],
        cause: 'I/O address does not match PLC hardware configuration',
      },
      'xml': {
        type: 'XML Format Error',
        severity: 'high' as const,
        components: ['XML structure', 'Element nesting'],
        cause: 'Invalid XML structure in .smbp file. Check for missing closing tags or invalid element names.',
      },
    },
    siemens: {
      'data type mismatch': {
        type: 'Type Conversion Error',
        severity: 'high' as const,
        components: ['Data types', 'Type conversions'],
        cause: 'Incompatible data types used in operations',
      },
    },
    rockwell: {
      'tag not defined': {
        type: 'Tag Definition Error',
        severity: 'high' as const,
        components: ['Tag database', 'Controller tags'],
        cause: 'Tag referenced in logic but not created in controller',
      },
    },
  };

  let detectedError = {
    type: 'Unknown Error',
    severity: 'medium' as const,
    components: ['General'],
    cause: 'Unable to determine specific error cause from the provided message. Please upload a screenshot of the error for better analysis.',
  };

  const platformErrors = errorPatterns[platform.toLowerCase() as keyof typeof errorPatterns] || errorPatterns.schneider;

  for (const [pattern, errorInfo] of Object.entries(platformErrors)) {
    if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
      detectedError = errorInfo;
      break;
    }
  }

  return {
    errorType: detectedError.type,
    severity: detectedError.severity,
    affectedComponents: detectedError.components,
    rootCause: detectedError.cause,
  };
}

function generateSolutionsFallback(
  programCode: string,
  analysis: RectificationResponse['analysis'],
  platform: string,
  plcModel: string
): RectificationResponse['solutions'] {
  const solutions: RectificationResponse['solutions'] = [];

  if (analysis.errorType.includes('Expansion Module')) {
    solutions.push({
      description: 'Fix expansion module configuration',
      explanation: `1. Open Hardware Configuration in Machine Expert Basic
2. Verify the expansion module is added in correct slot
3. Check that Index in XML matches slot position (Slot 1 = Index 0)
4. Verify I/O addresses: Slot 1 uses %IW1.x, Slot 2 uses %IW2.x
5. For TM3TI4/G temperature module at Index 0, use %IW1.0 to %IW1.3`,
      confidence: 90,
    });
  }

  if (analysis.errorType.includes('Timer')) {
    solutions.push({
      description: 'Correct timer configuration',
      explanation: `1. Use <TimerTM> element (not <Timer>)
2. Set <Base> to: OneSecond, HundredMillisecond, TenMillisecond, or OneMillisecond
3. <Preset> should be an integer (number of time units)
4. Example: 3 seconds = <Preset>3</Preset> with <Base>OneSecond</Base>`,
      confidence: 95,
    });
  }

  if (analysis.errorType.includes('XML')) {
    solutions.push({
      description: 'Fix XML structure',
      explanation: `1. Validate all opening tags have matching closing tags
2. Check element nesting is correct
3. Ensure special characters are properly escaped
4. Use XML validator tool to identify specific issues`,
      confidence: 85,
    });
  }

  if (solutions.length === 0) {
    solutions.push({
      description: 'General troubleshooting steps',
      explanation: `1. Upload a screenshot of the exact error message for better analysis
2. Check the error message in Machine Expert Basic for specific details
3. Verify hardware configuration matches your physical setup
4. Review variable declarations and I/O addresses
5. Compare with a working .smbp file structure`,
      confidence: 50,
    });
  }

  return solutions;
}

function generateRecommendationsFallback(
  analysis: RectificationResponse['analysis'],
  platform: string
): string[] {
  const recommendations: string[] = [];

  recommendations.push('Upload a screenshot of the error for more accurate AI-powered analysis');
  recommendations.push('Always validate XML structure before importing into Machine Expert Basic');

  if (analysis.errorType.includes('Expansion Module')) {
    recommendations.push('Create a hardware mapping document listing all module slots and addresses');
    recommendations.push('Verify physical module installation matches software configuration');
  }

  if (platform.toLowerCase().includes('schneider')) {
    recommendations.push('Use Machine Expert Basic built-in hardware configuration wizard');
    recommendations.push('Check extension module Index: Slot 1 = Index 0, Slot 2 = Index 1, etc.');
  }

  return recommendations;
}
