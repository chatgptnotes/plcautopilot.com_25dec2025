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
    return 'claude-3-haiku-20240307';
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

export async function POST(request: Request) {
  try {
    const { smbpContent, projectName } = await request.json();

    if (!smbpContent) {
      return NextResponse.json({ error: 'No SMBP content provided' }, { status: 400 });
    }

    const systemPrompt = `You are a PLC documentation expert. Analyze the provided M221 SMBP (Machine Expert Basic) XML file and generate comprehensive documentation in JSON format.

IMPORTANT: Extract ALL information from the XML file. Be thorough and complete.

Return a JSON object with the following structure:
{
  "projectInfo": {
    "projectName": "string",
    "plcModel": "string (e.g., TM221CE16T, TM221CE24T)",
    "description": "Brief description of what the program does",
    "author": "string or 'PLCAutoPilot'",
    "createdDate": "YYYY-MM-DD"
  },
  "writtenLogic": {
    "overview": "A 2-3 sentence summary of what this PLC program does and its purpose.",
    "operationSequence": [
      "Step 1: System Initialization - When power is applied and emergency stop is released, a 3-second startup timer begins...",
      "Step 2: Normal Operation - Once SYSTEM_READY is set, the main control logic becomes active...",
      "Step 3: Output Control - Based on input conditions, the outputs are energized..."
    ],
    "controlLogic": [
      {
        "condition": "START_PB pressed AND STOP_PB not pressed AND SYSTEM_READY",
        "action": "Motor contactor K1 energizes, motor runs",
        "rungReference": "Rung 3"
      }
    ],
    "safetyInterlocks": [
      {
        "interlock": "Emergency Stop Circuit",
        "description": "NC contact opens when E-STOP is pressed, immediately de-energizing all outputs",
        "failsafeMode": "All outputs OFF on wire break or E-STOP activation"
      }
    ],
    "timingSequence": "Describe any timing relationships, delays, or sequences in the program",
    "alarmConditions": [
      {
        "alarm": "OVERLOAD_ALARM",
        "trigger": "Motor thermal overload contact opens",
        "response": "Motor stops, alarm indicator activates, manual reset required"
      }
    ]
  },
  "digitalInputs": [
    {"address": "%I0.0", "symbol": "START_PB", "comment": "Start pushbutton", "used": true}
  ],
  "digitalOutputs": [
    {"address": "%Q0.0", "symbol": "MOTOR", "comment": "Motor contactor", "used": true}
  ],
  "analogInputs": [
    {"address": "%IW0.0", "symbol": "LEVEL_SENSOR", "comment": "4-20mA level sensor", "range": "0-10000", "used": true}
  ],
  "analogOutputs": [
    {"address": "%QW0.0", "symbol": "VALVE_OUTPUT", "comment": "Valve control", "used": true}
  ],
  "memoryBits": [
    {"address": "%M0", "symbol": "SYSTEM_READY", "comment": "System ready flag", "used": true}
  ],
  "memoryWords": [
    {"address": "%MW0", "symbol": "SETPOINT", "comment": "Level setpoint", "used": true}
  ],
  "memoryFloats": [
    {"address": "%MF0", "symbol": "TANK_LEVEL", "comment": "Scaled tank level in liters", "used": true}
  ],
  "timers": [
    {"address": "%TM0", "symbol": "STARTUP_DELAY", "preset": "3", "timeBase": "1s", "comment": "3 second startup delay"}
  ],
  "counters": [
    {"address": "%C0", "symbol": "CYCLE_COUNT", "preset": "100", "comment": "Cycle counter"}
  ],
  "rungs": [
    {
      "number": 1,
      "name": "System_Ready",
      "comment": "Initialize system ready flag after 3 second delay",
      "logic": "ESTOP contact enables TM0 timer, output sets M0 SYSTEM_READY",
      "safetyNotes": "NC contact for fail-safe operation"
    }
  ],
  "safetyFeatures": [
    "Emergency stop with NC contact",
    "Startup delay timer",
    "Overload protection"
  ],
  "operationalNotes": [
    "System requires 3 seconds to initialize",
    "All outputs are disabled until SYSTEM_READY is set"
  ]
}

RULES:
1. Only include I/O that have symbols defined (are actually used in the program)
2. For unused I/O addresses without symbols, set "used": false and skip them
3. Parse ALL DiscretInput, DiscretOutput, AnalogIO, MemoryBit, MemoryWord, TimerTM elements
4. Extract logic from LadderElements and InstructionLines for each rung
5. Identify safety-critical elements (ESTOP, overload, alarms)
6. Be comprehensive - include ALL defined variables with symbols
7. CRITICAL: The writtenLogic section must explain the program in plain English that a technician can understand
8. Include specific I/O addresses and symbols when describing the logic
9. Explain cause-and-effect relationships (IF this THEN that)
10. Describe the complete operation sequence from power-on to normal running`;

    const client = getAnthropicClient();
    const modelName = getModelName();
    console.log(`Using model: ${modelName}`);

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

    // Extract the text content from the response
    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI');
    }

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
        projectInfo: {
          projectName: projectName || 'Unknown',
          plcModel: 'M221',
          description: 'PLC Program Documentation',
          author: 'PLCAutoPilot',
          createdDate: new Date().toISOString().split('T')[0]
        },
        writtenLogic: {
          overview: 'AI documentation generation failed. Manual review required.',
          operationSequence: [],
          controlLogic: [],
          safetyInterlocks: [],
          timingSequence: '',
          alarmConditions: []
        },
        digitalInputs: [],
        digitalOutputs: [],
        analogInputs: [],
        analogOutputs: [],
        memoryBits: [],
        memoryWords: [],
        memoryFloats: [],
        timers: [],
        counters: [],
        rungs: [],
        safetyFeatures: [],
        operationalNotes: ['AI documentation generation failed. Manual review required.'],
        rawAiResponse: textContent.text
      };
    }

    return NextResponse.json({
      success: true,
      documentation,
      tokensUsed: response.usage?.input_tokens + response.usage?.output_tokens
    });

  } catch (error) {
    console.error('PDF documentation generation error:', error);

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
    }

    return NextResponse.json(
      { error: errorMessage, details: errorStr },
      { status: 500 }
    );
  }
}
