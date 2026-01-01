/**
 * Logic Chat API - AI chatbot for gathering PLC program requirements
 *
 * This endpoint:
 * 1. Receives user messages describing their automation needs
 * 2. Asks clarifying questions to gather complete requirements
 * 3. Returns a structured logic description when complete
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Lazy initialization to avoid errors during build
let anthropic: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    anthropic = new Anthropic({ apiKey });
  }
  return anthropic;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface UploadedImage {
  base64: string;
  name: string;
  type: string;
}

const SYSTEM_PROMPT = `You are an expert PLC automation engineer helping users describe their control logic requirements.

IMPORTANT: If the user uploads diagrams (P&ID, hand-drawn, control logic), carefully analyze them to understand:
- Equipment and instrumentation symbols
- Process flow and connections
- Control loops and logic
- I/O points and signal types
- Safety interlocks and trips

When diagrams are provided, describe what you see and confirm your understanding before proceeding.

Your job is to:

1. LISTEN to what the user wants to automate
2. ASK CLARIFYING QUESTIONS to understand:
   - What sensors/inputs are involved (pushbuttons, level sensors, pressure sensors, etc.)
   - What outputs need to be controlled (motors, valves, lights, etc.)
   - What logic/sequence is needed (start/stop, level control, timing, etc.)
   - What safety features are required (ESTOP, overloads, interlocks)
   - What setpoints or thresholds are needed

3. CONFIRM you have enough information before generating the final logic

4. ALWAYS include a RUNNING SUMMARY after your response using this format:
---SUMMARY---
[Current understanding of the requirements gathered so far]
Inputs identified: [list or "none yet"]
Outputs identified: [list or "none yet"]
Logic/Sequence: [description or "not defined yet"]
Safety features: [list or "not discussed yet"]
Setpoints: [list or "not specified yet"]
---END_SUMMARY---

5. When you have gathered ALL necessary information, ALSO add:
---FINAL_LOGIC---
Create a [program type] program with:
- [Input 1]: [description]
- [Input 2]: [description]
- [Output 1]: [description]
- [Output 2]: [description]

Logic requirements:
- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

Setpoints:
- [Setpoint 1]: [value]
- [Setpoint 2]: [value]

Safety features:
- [Safety 1]
- [Safety 2]
---END_LOGIC---

IMPORTANT GUIDELINES:
- Ask ONE or TWO questions at a time, not a long list
- Be conversational and helpful
- Use the user's terminology when possible
- If the user provides incomplete info, ask specifically what's missing
- Consider the PLC model's capabilities when asking questions
- Always include safety considerations in your questions
- ALWAYS include the ---SUMMARY--- block in EVERY response to show running progress

NEVER generate the final logic until you have:
1. At least 2-3 inputs identified
2. At least 1-2 outputs identified
3. Clear logic/sequence understood
4. Safety requirements discussed`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, plcModel, rules, images } = body as {
      messages: ChatMessage[];
      plcModel: string;
      rules: string;
      images?: UploadedImage[];
    };

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages provided' },
        { status: 400 }
      );
    }

    // Build context with PLC model info
    const contextPrompt = `
PLC Model: ${plcModel || 'TM221CE24T'}
${plcModel?.includes('CE16') ? 'Digital I/O: 9 inputs, 7 outputs' : ''}
${plcModel?.includes('CE24') ? 'Digital I/O: 14 inputs, 10 outputs' : ''}
${plcModel?.includes('CE40') ? 'Digital I/O: 24 inputs, 16 outputs' : ''}
Analog Inputs: 2 built-in (4-20mA)
Expansion possible: Yes

${rules ? `\nRules context:\n${rules.substring(0, 500)}...` : ''}
`;

    // Build messages with images if provided
    type MessageContent = { type: 'text'; text: string } | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };

    const formattedMessages = messages.map((m, index) => {
      // For the last user message, include any uploaded images
      if (m.role === 'user' && index === messages.length - 1 && images && images.length > 0) {
        const content: MessageContent[] = [];

        // Add images first
        images.forEach(img => {
          // Extract base64 data (remove data:image/...;base64, prefix)
          const base64Data = img.base64.split(',')[1] || img.base64;
          const mediaType = img.type || 'image/png';

          content.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Data,
            },
          });
        });

        // Add text message
        content.push({
          type: 'text',
          text: m.content + `\n\n[${images.length} diagram(s) attached: ${images.map(i => i.name).join(', ')}]`,
        });

        return { role: m.role as 'user' | 'assistant', content };
      }

      return { role: m.role as 'user' | 'assistant', content: m.content };
    });

    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-3-haiku-20240307',
      max_tokens: 2000,
      system: SYSTEM_PROMPT + '\n\n' + contextPrompt,
      messages: formattedMessages,
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response format');
    }

    let responseText = content.text;
    let finalLogic: string | null = null;
    let runningSummary: string | null = null;

    // Extract running summary (always present)
    const summaryMatch = responseText.match(/---SUMMARY---([\s\S]*?)---END_SUMMARY---/);
    if (summaryMatch) {
      runningSummary = summaryMatch[1].trim();
      // Remove the summary markers from the visible message
      responseText = responseText.replace(/---SUMMARY---[\s\S]*?---END_SUMMARY---/, '').trim();
    }

    // Check if AI has provided final logic
    const finalLogicMatch = responseText.match(/---FINAL_LOGIC---([\s\S]*?)---END_LOGIC---/);
    if (finalLogicMatch) {
      finalLogic = finalLogicMatch[1].trim();
      // Remove the final logic markers from the visible message
      responseText = responseText.replace(/---FINAL_LOGIC---[\s\S]*?---END_LOGIC---/, '').trim();

      // Add a note that logic is ready
      if (!responseText.includes('ready to generate')) {
        responseText += '\n\nI have captured your requirements. Click "Use This Logic" to apply it to the generator.';
      }
    }

    return NextResponse.json({
      message: responseText,
      finalLogic,
      runningSummary, // Live summary of conversation so far
    });

  } catch (error: unknown) {
    console.error('Logic chat error:', error);

    // Always show the actual error for debugging
    let errorMessage = 'Unknown error occurred';

    if (error instanceof Error) {
      errorMessage = error.message;

      // Add context for common errors
      if (error.message.includes('API key') || error.message.includes('apiKey')) {
        errorMessage = `API Key Error: ${error.message}`;
      } else if (error.message.includes('401') || error.message.includes('authentication')) {
        errorMessage = `Authentication Error: ${error.message}`;
      } else if (error.message.includes('429')) {
        errorMessage = `Rate Limit: ${error.message}`;
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      errorMessage = JSON.stringify(error);
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
