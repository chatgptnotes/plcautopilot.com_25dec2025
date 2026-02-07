import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Lazy initialization
let anthropic: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured. Please set the environment variable in Vercel.');
    }
    anthropic = new Anthropic({ apiKey });
  }
  return anthropic;
}

/**
 * Get valid Claude model name, handling malformed env vars
 */
function getModelName(): string {
  const envModel = process.env.CLAUDE_MODEL;

  // Default to haiku if not set
  if (!envModel) {
    return 'claude-opus-4-6';
  }

  // Handle malformed values like "CLAUDE_MODEL=claude-sonnet-4-20250514"
  if (envModel.includes('=')) {
    const parts = envModel.split('=');
    const actualModel = parts[parts.length - 1];
    console.warn(`Malformed CLAUDE_MODEL env var detected. Using: ${actualModel}`);
    return actualModel;
  }

  return envModel;
}

// Vercel timeout config - increase for Pro plan
export const maxDuration = 60; // seconds

export async function POST(request: Request) {
  const startTime = Date.now();
  console.log('[PDF-DOC] Starting PDF documentation generation...');

  try {
    const { smbpContent, projectName } = await request.json();
    console.log(`[PDF-DOC] Project: ${projectName}, Content length: ${smbpContent?.length || 0}`);

    if (!smbpContent) {
      return NextResponse.json({ error: 'No SMBP content provided' }, { status: 400 });
    }

    const systemPrompt = `You are a PLC documentation expert. Analyze the provided M221 SMBP (Machine Expert Basic) XML file and generate ONLY rung explanations in JSON format.

IMPORTANT: Focus ONLY on explaining each rung. Do NOT include I/O tables, memory tables, or other sections.

Return a JSON object with ONLY this structure:
{
  "projectName": "string",
  "plcModel": "string (e.g., TM221CE24T)",
  "rungs": [
    {
      "number": 1,
      "name": "Rung name from XML",
      "explanation": "Clear explanation of what this rung does in plain English. Example: When the emergency stop is released (NC contact closed) and 3 seconds have passed, the SYSTEM_READY flag is set, allowing the rest of the program to operate."
    },
    {
      "number": 2,
      "name": "Cold_Warm_Start_Reset",
      "explanation": "On power-up (cold start) or controller restart (warm start), this rung resets all HMI display values to zero to ensure clean startup."
    }
  ]
}

RULES:
1. Extract EVERY rung from the <RungEntity> elements
2. Use the <Name> element for the rung name
3. Write a clear, simple explanation that a technician can understand
4. Explain what inputs/conditions activate the rung and what outputs/actions result
5. Include specific addresses and symbols in the explanation (e.g., "%I0.0 (START_PB)")
6. Keep explanations concise but complete (2-4 sentences each)
7. Do NOT include I/O tables, memory tables, timers tables, or any other sections
8. ONLY return the rungs array with explanations`;

    const client = getAnthropicClient();
    const modelName = getModelName();
    console.log(`[PDF-DOC] Using model: ${modelName}`);
    console.log(`[PDF-DOC] Making API call at ${Date.now() - startTime}ms...`);

    const response = await client.messages.create({
      model: modelName,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `Analyze this M221 SMBP file and generate comprehensive documentation JSON.

Project Name: ${projectName || 'Unknown'}

SMBP Content:
${smbpContent.substring(0, 50000)}` // Limit content size for API
        }
      ],
      system: systemPrompt,
    });

    console.log(`[PDF-DOC] API call completed at ${Date.now() - startTime}ms`);

    // Extract the text content from the response
    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI');
    }
    console.log(`[PDF-DOC] Response text length: ${textContent.text.length}`);

    // Parse the JSON from the AI response
    let documentation;
    try {
      // Extract JSON from the response (handle markdown code blocks or raw JSON with intro text)
      let jsonText = textContent.text;

      // Try markdown code block first
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      } else {
        // Try to find JSON object starting with { after any intro text
        const jsonStartIndex = jsonText.indexOf('{');
        const jsonEndIndex = jsonText.lastIndexOf('}');
        if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
          jsonText = jsonText.substring(jsonStartIndex, jsonEndIndex + 1);
        }
      }
      documentation = JSON.parse(jsonText.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', textContent.text);
      // Return a basic structure if parsing fails
      documentation = {
        projectName: projectName || 'Unknown',
        plcModel: 'M221',
        rungs: [
          {
            number: 1,
            name: 'Parse_Error',
            explanation: 'AI documentation generation failed. Manual review of the program is required.'
          }
        ],
        rawAiResponse: textContent.text
      };
    }

    console.log(`[PDF-DOC] Success! Total time: ${Date.now() - startTime}ms`);

    return NextResponse.json({
      success: true,
      documentation,
      tokensUsed: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
      duration: Date.now() - startTime
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[PDF-DOC] Error after ${duration}ms:`, error);

    // Provide more specific error messages
    let errorMessage = 'Failed to generate documentation';
    const errorStr = String(error);

    if (errorStr.includes('ANTHROPIC_API_KEY')) {
      errorMessage = 'API key not configured. Please set ANTHROPIC_API_KEY in Vercel environment variables.';
    } else if (errorStr.includes('401') || errorStr.includes('authentication')) {
      errorMessage = 'Invalid API key. Please check your ANTHROPIC_API_KEY in Vercel.';
    } else if (errorStr.includes('429') || errorStr.includes('rate')) {
      errorMessage = 'Rate limit exceeded. Please try again in a few seconds.';
    } else if (errorStr.includes('model')) {
      errorMessage = 'Invalid model name. Please check CLAUDE_MODEL environment variable.';
    } else if (errorStr.includes('timeout') || errorStr.includes('ETIMEDOUT') || duration > 55000) {
      errorMessage = 'Request timed out. The SMBP file may be too large. Try with a smaller file.';
    } else if (errorStr.includes('fetch') || errorStr.includes('network')) {
      errorMessage = 'Network error connecting to AI service. Please try again.';
    }

    return NextResponse.json(
      { error: errorMessage, details: errorStr, duration },
      { status: 500 }
    );
  }
}
