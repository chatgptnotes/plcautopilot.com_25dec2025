import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

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

    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 12000, // Increased for comprehensive documentation of complex programs
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
      // Extract JSON from the response (handle markdown code blocks)
      let jsonText = textContent.text;
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
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
    return NextResponse.json(
      { error: 'Failed to generate documentation', details: String(error) },
      { status: 500 }
    );
  }
}
