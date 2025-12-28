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
    explanation: string;
    confidence: number; // 0-100
  }>;
  recommendations: string[];
  correctedCode?: string; // The fixed program code
  correctedFileName?: string; // Suggested filename for corrected file
}

const SYSTEM_PROMPT = `You are an expert PLC programming assistant specializing in error analysis, debugging, AND automatic code correction. You analyze error screenshots and messages from PLC programming software and GENERATE CORRECTED CODE.

## Your PRIMARY Tasks:

### 1. ANALYZE THE SCREENSHOT/ERROR
- Read the error message carefully from the uploaded screenshot
- Identify the EXACT error type (XML parsing error, variable undefined, timer format, expansion module issue, etc.)
- Note the specific line numbers or locations if visible

### 2. UNDERSTAND THE CONTEXT
- Platform: Schneider Electric Machine Expert Basic (.smbp XML files)
- The user has provided their current program code
- Identify what's wrong in the code based on the error

### 3. FIX THE CODE AND RETURN CORRECTED VERSION
You MUST generate the complete corrected program code - not just suggestions.

## Common Schneider M221 Errors and Fixes:

### Extension Module Errors
- Error: "Extension module not found" or "Invalid module configuration"
- Fix: Ensure <Extensions> section has correct Index (Slot 1 = Index 0, Slot 2 = Index 1)
- For TM3TI4/G at Index 0, use addresses %IW1.0 to %IW1.3

### Timer Errors
- Error: "Invalid timer format" or "Timer configuration error"
- Fix: Use <TimerTM> element with:
  - <Address>%TM0</Address>
  - <Preset>3</Preset> (integer seconds)
  - <Base>OneSecond</Base>

### Variable/Symbol Errors
- Error: "Variable not declared" or "Symbol not found"
- Fix: Add missing variable to <Symbols> section with correct address

### XML Parse Errors
- Error: "XML parsing error" or "Invalid element"
- Fix: Check for missing closing tags, invalid nesting, special characters

### Ladder Logic Errors
- Error: "Invalid rung" or "Connection error"
- Fix: Ensure columns 0-10 are properly connected with Line elements
- Timer/Comparison elements span 2 columns (start at col 1, next element at col 3)

## RESPONSE FORMAT (STRICT JSON):

{
  "errorType": "Brief error type (e.g., 'Timer Configuration Error')",
  "severity": "low|medium|high|critical",
  "affectedComponents": ["Timer blocks", "Rung 3"],
  "rootCause": "Detailed explanation of what caused the error",
  "solutions": [
    {
      "description": "Fixed timer format",
      "explanation": "Changed <Timer> to <TimerTM> with <Base>OneSecond</Base>",
      "confidence": 95
    }
  ],
  "recommendations": ["Always use TimerTM for M221 timers", "Validate XML before import"],
  "correctedCode": "FULL CORRECTED XML/PROGRAM CODE HERE"
}

## CRITICAL REQUIREMENTS:

1. ALWAYS include "correctedCode" with the COMPLETE fixed program
2. Do not truncate the corrected code - include the entire file
3. If no original code was provided, generate a minimal working program based on the error context
4. Apply ALL necessary fixes, not just the first error found
5. Ensure the output is valid XML that will open in Machine Expert Basic`;

// Limit for how much program code to send to Claude
// Full .smbp files can be 50KB+, we send more context now
const MAX_PROGRAM_CODE_LENGTH = 50000;

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
  // Build the message content using Anthropic SDK types
  const content: Array<
    | { type: 'image'; source: { type: 'base64'; media_type: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp'; data: string } }
    | { type: 'text'; text: string }
  > = [];

  // Add image if provided
  if (errorScreenshot) {
    console.log('Processing screenshot upload...');
    console.log(`- Screenshot data length: ${errorScreenshot.length} characters`);

    // Extract base64 data (remove data:image/...;base64, prefix if present)
    const base64Data = errorScreenshot.includes(',')
      ? errorScreenshot.split(',')[1]
      : errorScreenshot;

    // Detect media type from prefix or default to png
    let mediaType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp' = 'image/png';
    if (errorScreenshot.includes('data:')) {
      const match = errorScreenshot.match(/data:([^;]+);/);
      if (match) {
        const detected = match[1];
        if (detected === 'image/jpeg' || detected === 'image/jpg') {
          mediaType = 'image/jpeg';
        } else if (detected === 'image/gif') {
          mediaType = 'image/gif';
        } else if (detected === 'image/webp') {
          mediaType = 'image/webp';
        } else {
          mediaType = 'image/png';
        }
      }
    }

    console.log(`- Media type detected: ${mediaType}`);
    console.log(`- Base64 data length: ${base64Data.length} characters`);

    // Validate the base64 data
    if (!base64Data || base64Data.length < 100) {
      console.error('ERROR: Screenshot data is too short or empty!');
      console.error('This may indicate the image was not properly uploaded.');
    } else {
      // Validate it's actual base64
      const base64Regex = /^[A-Za-z0-9+/]+=*$/;
      const isValidBase64 = base64Regex.test(base64Data.substring(0, 1000));
      console.log(`- Valid base64 format: ${isValidBase64}`);

      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: base64Data,
        },
      });
      console.log('Screenshot added to Claude request');
    }
  } else {
    console.log('No screenshot provided - analyzing from error message only');
  }

  // Add text description
  let textPrompt = `Analyze this PLC programming error and FIX IT:

Platform: ${platform}
PLC Model: ${plcModel}

Error Message from User: ${errorMessage || 'No error message provided'}

${errorScreenshot ? 'I have uploaded a screenshot of the error from the PLC programming software. Please analyze the screenshot carefully to identify the exact error shown in the image.' : ''}

${programCode ? `
=== FULL PROGRAM CODE TO FIX (${programCode.length} characters) ===
${programCode}
=== END OF PROGRAM CODE ===
` : 'WARNING: No program code provided. Cannot generate corrected file.'}

CRITICAL INSTRUCTIONS:
1. Analyze the error from the screenshot and/or error message
2. Identify the exact issue in the program code
3. FIX THE ISSUE and generate the COMPLETE corrected program code
4. The correctedCode field MUST contain the ENTIRE fixed program, not just the changed parts
5. Make sure the XML structure is valid and will import correctly into Machine Expert Basic

Please analyze this error and provide your response in JSON format as specified.`;

  content.push({
    type: 'text',
    text: textPrompt,
  });

  console.log('Sending request to Claude Vision...');
  console.log(`- Image attached: ${errorScreenshot ? 'Yes' : 'No'}`);
  console.log(`- Program code length: ${programCode?.length || 0} characters`);
  console.log(`- Error message: ${errorMessage?.substring(0, 100) || 'None'}`);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 64000, // Increased significantly for full program code generation
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content,
      },
    ],
  });

  console.log(`Claude response received. Stop reason: ${response.stop_reason}`);
  console.log(`Output tokens used: ${response.usage?.output_tokens || 'unknown'}`);

  // Extract the text response
  const textContent = response.content.find(c => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  console.log(`Response text length: ${textContent.text.length} characters`);

  // Parse JSON from response
  let jsonResponse: {
    errorType: string;
    severity: string;
    affectedComponents: string[];
    rootCause: string;
    solutions: Array<{ description: string; explanation: string; confidence: number }>;
    recommendations: string[];
    correctedCode?: string;
  };

  try {
    // Try to extract JSON from the response - handle large XML in correctedCode
    // Find the outermost JSON object
    const firstBrace = textContent.text.indexOf('{');
    const lastBrace = textContent.text.lastIndexOf('}');

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const jsonStr = textContent.text.substring(firstBrace, lastBrace + 1);
      jsonResponse = JSON.parse(jsonStr);
      console.log(`JSON parsed successfully. correctedCode length: ${jsonResponse.correctedCode?.length || 0}`);
    } else {
      throw new Error('No JSON braces found in response');
    }
  } catch (parseError) {
    console.error('JSON parsing failed:', parseError);

    // Try to extract correctedCode separately if JSON failed
    // Sometimes Claude returns the XML outside the JSON
    let extractedCode: string | undefined;
    const xmlMatch = textContent.text.match(/<\?xml[\s\S]*<\/ProjectData>/);
    if (xmlMatch) {
      extractedCode = xmlMatch[0];
      console.log('Extracted XML directly from response');
    }

    // If JSON parsing fails, create a structured response from the text
    jsonResponse = {
      errorType: 'Analysis Complete',
      severity: 'medium',
      affectedComponents: ['See analysis'],
      rootCause: 'Error analysis completed. See the solutions below.',
      solutions: [{
        description: 'AI Analysis',
        explanation: textContent.text.substring(0, 2000),
        confidence: 75,
      }],
      recommendations: ['Review the AI analysis above for specific guidance'],
      correctedCode: extractedCode,
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
    correctedCode: jsonResponse.correctedCode,
    correctedFileName: `corrected_${Date.now()}.smbp`,
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

  let detectedError: {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    components: string[];
    cause: string;
  } = {
    type: 'Unknown Error',
    severity: 'medium',
    components: ['General'],
    cause: 'Unable to determine specific error cause from the provided message. Please upload a screenshot of the error for better analysis.',
  };

  const platformErrors = errorPatterns[platform.toLowerCase() as keyof typeof errorPatterns] || errorPatterns.schneider;

  for (const [pattern, errorInfo] of Object.entries(platformErrors)) {
    if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
      detectedError = {
        type: errorInfo.type,
        severity: errorInfo.severity,
        components: errorInfo.components,
        cause: errorInfo.cause,
      };
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
