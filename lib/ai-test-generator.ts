/**
 * AI-Powered Test Generator for PLC Programs
 * Uses Claude API to analyze ladder logic and generate appropriate test cases
 * Version: 1.0
 */

import Anthropic from '@anthropic-ai/sdk';
import type { TestCase } from './test-generator';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface AITestAnalysis {
  programType: string;
  description: string;
  phases: string[];
  ioMapping: Record<string, string>;
  testCases: TestCase[];
}

export interface AIAnalysisError {
  error: true;
  message: string;
  fallbackRequired: true;
}

// ============================================================================
// SYSTEM PROMPT FOR AI ANALYSIS
// ============================================================================

const ANALYSIS_SYSTEM_PROMPT = `You are an expert PLC test engineer specializing in Schneider Electric M221 PLCs.

Your task is to analyze a ladder logic program (in .smbp XML format) and generate appropriate test cases.

## M221 PLC Specifications:
- Digital Inputs: %I0.0 to %I0.23
- Digital Outputs: %Q0.0 to %Q0.15
- Memory Bits: %M0 to %M255
- Timers: %TM0 to %TM127 (preset in timer base units)
- System Bits: %S0 (cold start), %S1 (warm start)

## Understanding Ladder Logic:
- NormalContact: Passes power when TRUE
- NegatedContact: Passes power when FALSE
- Coil: Sets output based on input power
- SetCoil (S): Latches ON
- ResetCoil (R): Latches OFF
- Timer: Delays output by preset time
- CompareBlock: Compares values (e.g., %MF100 > 500.0)
- Operation: Performs calculations (e.g., %MW100 := %IW0.0)

## Test Case Format:
Each test case must include:
- id: Unique identifier (TC1, TC2, etc.)
- title: Short descriptive title
- description: What the test verifies
- category: One of 'startup', 'safety', 'operation', 'transition', 'fault', 'manual'
- initialConditions: Array of human-readable conditions
- steps: Array of {step, action, expected}
- passCriteria: Array of pass conditions
- expectedInputs: Object mapping input addresses to boolean/number values
- expectedOutputs: Object mapping output/memory addresses to expected values
- timerWaitMs: (optional) Milliseconds to wait for timer-based tests
- expectedOutputsAfterTimer: (optional) Expected values after timer expires

## Important Rules:
1. Use EXACT addresses from the program (e.g., %I0.0, %M0, %Q0.0)
2. For NC (normally closed) emergency stops: TRUE = released, FALSE = pressed
3. Timer presets are in the timer's base unit (OneSecond, TenMillisecond, etc.)
4. Convert timer preset to milliseconds for timerWaitMs
5. Test each phase/state transition in the program
6. Always include emergency stop test if ESTOP/EMERGENCY exists`;

// ============================================================================
// AI ANALYSIS FUNCTION
// ============================================================================

/**
 * Analyze a PLC program using Claude AI
 */
export async function analyzeProgram(smbpXml: string): Promise<AITestAnalysis | AIAnalysisError> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return {
      error: true,
      message: 'ANTHROPIC_API_KEY not configured',
      fallbackRequired: true
    };
  }

  const anthropic = new Anthropic({ apiKey });

  // Extract relevant sections from XML to reduce token count
  const rungsMatch = smbpXml.match(/<Rungs>([\s\S]*?)<\/Rungs>/);
  const timersMatch = smbpXml.match(/<Timers>([\s\S]*?)<\/Timers>/);
  const memoryBitsMatch = smbpXml.match(/<MemoryBits>([\s\S]*?)<\/MemoryBits>/);

  const relevantXml = `
<ProgramSections>
  <Rungs>
    ${rungsMatch ? rungsMatch[1] : 'No rungs found'}
  </Rungs>
  ${timersMatch ? `<Timers>${timersMatch[1]}</Timers>` : ''}
  ${memoryBitsMatch ? `<MemoryBits>${memoryBitsMatch[1]}</MemoryBits>` : ''}
</ProgramSections>`;

  const userPrompt = `Analyze this M221 PLC ladder logic program and generate test cases.

## Program XML:
${relevantXml}

## Your Task:
1. Identify what this program controls (be SPECIFIC: "traffic_light_controller", "tank_level_controller", "motor_start_stop", etc.)
2. List all operational phases/states in execution order
3. Map each I/O address to its real-world function based on symbols
4. Generate comprehensive test cases that verify the program logic

## Output Format (JSON only, no markdown):
{
  "programType": "specific_program_type",
  "description": "Human-readable description of what the program does",
  "phases": ["PHASE1", "PHASE2", "PHASE3"],
  "ioMapping": {
    "%I0.0": "Emergency Stop Button",
    "%Q0.0": "Output description"
  },
  "testCases": [
    {
      "id": "TC1",
      "title": "System Startup Sequence",
      "description": "Verify system becomes ready after startup timer",
      "category": "startup",
      "initialConditions": ["PLC just powered on", "Emergency stop released"],
      "steps": [
        {"step": 1, "action": "Power on PLC", "expected": "System not ready initially"},
        {"step": 2, "action": "Wait for startup timer", "expected": "System becomes ready"}
      ],
      "passCriteria": ["System ready bit activates after timer"],
      "expectedInputs": {"%I0.0": true},
      "expectedOutputs": {"%M0": false},
      "timerWaitMs": 3500,
      "expectedOutputsAfterTimer": {"%M0": true}
    }
  ]
}

IMPORTANT:
- Output ONLY valid JSON, no markdown code blocks
- Use exact addresses from the program
- Include at least one test per phase/state
- Include timer wait times based on actual timer presets (convert to milliseconds)
- For timers with Base "OneSecond" and Preset 3, timerWaitMs = 3000 + 500 buffer = 3500
- ONLY include "System Startup Sequence" test if the program has a startup timer pattern (timer -> SYSTEM_READY memory bit)
- Do NOT assume every program has a startup timer - many programs (like motor start/stop) don't have one
- The example TC1 above is just an example - only include it if such a pattern actually exists in THIS program`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: ANALYSIS_SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: userPrompt }
      ]
    });

    // Extract text content from response
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return {
        error: true,
        message: 'No text response from AI',
        fallbackRequired: true
      };
    }

    // Parse JSON response
    let jsonText = textContent.text.trim();

    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    const analysis: AITestAnalysis = JSON.parse(jsonText);

    // Validate required fields
    if (!analysis.programType || !analysis.testCases || !Array.isArray(analysis.testCases)) {
      return {
        error: true,
        message: 'Invalid AI response structure',
        fallbackRequired: true
      };
    }

    // Ensure all test cases have required fields
    analysis.testCases = analysis.testCases.map((tc, index) => ({
      id: tc.id || `TC${index + 1}`,
      title: tc.title || `Test Case ${index + 1}`,
      description: tc.description || '',
      category: tc.category || 'operation',
      initialConditions: tc.initialConditions || [],
      steps: tc.steps || [],
      passCriteria: tc.passCriteria || [],
      expectedInputs: tc.expectedInputs,
      expectedOutputs: tc.expectedOutputs,
      timerWaitMs: tc.timerWaitMs,
      expectedOutputsAfterTimer: tc.expectedOutputsAfterTimer
    }));

    return analysis;

  } catch (error) {
    console.error('AI analysis error:', error);
    return {
      error: true,
      message: error instanceof Error ? error.message : 'Unknown AI error',
      fallbackRequired: true
    };
  }
}

/**
 * Generate test cases using AI analysis
 * Returns just the test cases array for compatibility with existing runner
 */
export async function generateAITests(smbpXml: string): Promise<TestCase[] | null> {
  const result = await analyzeProgram(smbpXml);

  if ('error' in result && result.error) {
    console.warn('AI analysis failed:', result.message);
    return null;
  }

  // Type assertion after checking for error
  const analysis = result as AITestAnalysis;
  return analysis.testCases;
}

/**
 * Check if AI analysis is available (API key configured)
 */
export function isAIAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}
