/**
 * POU Orchestrator
 *
 * Coordinates the generation of multiple POUs for a complete PLC program.
 * Each POU is generated with a focused prompt for token efficiency.
 *
 * Benefits:
 * - 55-75% token reduction vs monolithic approach
 * - Parallel generation for faster results
 * - Better AI focus with specialized prompts
 * - Easier debugging (each POU separate)
 */

import Anthropic from '@anthropic-ai/sdk';
import { getPOUPrompt, DEFAULT_POU_NAMES } from './pou-prompts';
import { POUCategory, POUDefinition, MultiPOUSmbpConfig } from './smbp-templates';
import { fixSmbpXml } from './smbp-xml-fixer';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Configuration for multi-POU generation
 */
export interface MultiPOUGenerationConfig {
  userRequest: string;
  model: string;
  enabledPOUs: POUCategory[];
  context?: {
    sensorAddresses?: Record<string, string>;
    setpoints?: Record<string, number>;
    outputs?: Record<string, string>;
  };
}

/**
 * Result from generating a single POU
 */
export interface POUGenerationResult {
  pouType: POUCategory;
  pouName: string;
  rungs: string;
  symbolsJson?: {
    inputs?: Array<{ address: string; symbol: string }>;
    outputs?: Array<{ address: string; symbol: string }>;
    memoryBits?: Array<{ address: string; symbol: string; comment?: string }>;
    timers?: Array<{ address: string; preset: number }>;
  };
  tokensUsed: {
    input: number;
    output: number;
  };
  success: boolean;
  error?: string;
}

/**
 * Analyze user request to determine which POUs are needed
 */
export function analyzeRequest(userRequest: string): POUCategory[] {
  const requestLower = userRequest.toLowerCase();
  const neededPOUs: POUCategory[] = [];

  // Always include system_init for startup timer
  neededPOUs.push('system_init');

  // Check for analog/scaling needs
  if (
    requestLower.includes('analog') ||
    requestLower.includes('4-20ma') ||
    requestLower.includes('sensor') ||
    requestLower.includes('level') ||
    requestLower.includes('temperature') ||
    requestLower.includes('pressure') ||
    requestLower.includes('scale') ||
    requestLower.includes('scaling')
  ) {
    neededPOUs.push('io_mapping');
  }

  // Check for auto control needs
  if (
    requestLower.includes('auto') ||
    requestLower.includes('automatic') ||
    requestLower.includes('control') ||
    requestLower.includes('fill') ||
    requestLower.includes('drain') ||
    requestLower.includes('pump') ||
    requestLower.includes('valve') ||
    requestLower.includes('tank')
  ) {
    neededPOUs.push('auto_operation');
  }

  // Check for manual mode needs
  if (
    requestLower.includes('manual') ||
    requestLower.includes('hmi') ||
    requestLower.includes('override') ||
    requestLower.includes('operator') ||
    requestLower.includes('start') ||
    requestLower.includes('stop')
  ) {
    neededPOUs.push('manual_operation');
  }

  // Check for alarm needs
  if (
    requestLower.includes('alarm') ||
    requestLower.includes('fault') ||
    requestLower.includes('high') ||
    requestLower.includes('low') ||
    requestLower.includes('error') ||
    requestLower.includes('warning') ||
    requestLower.includes('protect')
  ) {
    neededPOUs.push('alarms_faults');
  }

  return neededPOUs;
}

/**
 * Generate a single POU with focused prompt
 */
async function generateSinglePOU(
  pouType: POUCategory,
  userRequest: string,
  model: string,
  context?: MultiPOUGenerationConfig['context']
): Promise<POUGenerationResult> {
  const pouPrompt = getPOUPrompt(pouType);
  const pouName = DEFAULT_POU_NAMES[pouType];

  // Build context-aware user message
  let userMessage = `Generate ${pouName} rungs for ${model} PLC.\n\nRequirements:\n${userRequest}`;

  if (context) {
    if (context.sensorAddresses) {
      userMessage += '\n\nSensor Addresses:';
      for (const [name, addr] of Object.entries(context.sensorAddresses)) {
        userMessage += `\n- ${name}: ${addr}`;
      }
    }
    if (context.setpoints) {
      userMessage += '\n\nSetpoints:';
      for (const [name, value] of Object.entries(context.setpoints)) {
        userMessage += `\n- ${name}: ${value}`;
      }
    }
    if (context.outputs) {
      userMessage += '\n\nOutputs:';
      for (const [name, addr] of Object.entries(context.outputs)) {
        userMessage += `\n- ${name}: ${addr}`;
      }
    }
  }

  try {
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000, // ~40 rungs per POU
      system: pouPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    let responseText = '';
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        responseText += event.delta.text;
      }
    }

    const finalMessage = await stream.finalMessage();

    // Parse response
    const { rungs, symbolsJson } = parseAIResponse(responseText);
    const fixedRungs = fixSmbpXml(rungs);

    return {
      pouType,
      pouName,
      rungs: fixedRungs,
      symbolsJson,
      tokensUsed: {
        input: finalMessage.usage.input_tokens,
        output: finalMessage.usage.output_tokens,
      },
      success: true,
    };
  } catch (error) {
    return {
      pouType,
      pouName,
      rungs: '',
      tokensUsed: { input: 0, output: 0 },
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Parse AI response to extract rungs and symbols
 */
function parseAIResponse(response: string): {
  rungs: string;
  symbolsJson?: POUGenerationResult['symbolsJson'];
} {
  // Extract SYMBOLS_JSON block
  const symbolsMatch = response.match(/<!--SYMBOLS_JSON\s*([\s\S]*?)\s*SYMBOLS_JSON-->/);
  let symbolsJson: POUGenerationResult['symbolsJson'] | undefined;

  if (symbolsMatch) {
    try {
      symbolsJson = JSON.parse(symbolsMatch[1].trim());
    } catch {
      console.warn('Failed to parse SYMBOLS_JSON');
    }
  }

  // Extract XML rungs
  const rungs = response
    .replace(/<!--SYMBOLS_JSON[\s\S]*?SYMBOLS_JSON-->/g, '')
    .replace(/```xml/g, '')
    .replace(/```/g, '')
    .trim();

  return { rungs, symbolsJson };
}

/**
 * Generate multiple POUs in parallel for a complete program
 */
export async function generateMultiPOUProgram(
  config: MultiPOUGenerationConfig
): Promise<{
  success: boolean;
  results: POUGenerationResult[];
  totalTokens: { input: number; output: number };
  pouDefinitions: POUDefinition[];
}> {
  const { userRequest, model, enabledPOUs, context } = config;

  // Generate all POUs in parallel (faster!)
  const results = await Promise.all(
    enabledPOUs.map((pouType) => generateSinglePOU(pouType, userRequest, model, context))
  );

  // Calculate total tokens
  const totalTokens = results.reduce(
    (acc, r) => ({
      input: acc.input + r.tokensUsed.input,
      output: acc.output + r.tokensUsed.output,
    }),
    { input: 0, output: 0 }
  );

  // Convert to POUDefinition format for smbp-templates
  const pouDefinitions: POUDefinition[] = results
    .filter((r) => r.success)
    .map((r, index) => ({
      name: r.pouName,
      sectionNumber: index,
      category: r.pouType,
      rungs: [], // Will be filled by XML parsing
    }));

  const allSuccess = results.every((r) => r.success);

  return {
    success: allSuccess,
    results,
    totalTokens,
    pouDefinitions,
  };
}

/**
 * Combine POU results into a single XML rungs section
 */
export function combinePOURungsXml(results: POUGenerationResult[]): string {
  const successfulResults = results.filter((r) => r.success && r.rungs);

  if (successfulResults.length === 0) {
    return '';
  }

  // For single-POU output (Machine Expert Basic compatibility)
  // Combine all rungs into one Rungs section
  const allRungs = successfulResults
    .map((r) => {
      // Add comment to identify POU source
      const pouComment = `<!-- ${r.pouName} Rungs -->`;
      return `${pouComment}\n${r.rungs}`;
    })
    .join('\n\n');

  return allRungs;
}

/**
 * Merge symbols from all POUs
 */
export function mergeSymbols(
  results: POUGenerationResult[]
): POUGenerationResult['symbolsJson'] {
  const merged: Required<NonNullable<POUGenerationResult['symbolsJson']>> = {
    inputs: [],
    outputs: [],
    memoryBits: [],
    timers: [],
  };

  for (const result of results) {
    if (result.symbolsJson) {
      if (result.symbolsJson.inputs) {
        merged.inputs.push(...result.symbolsJson.inputs);
      }
      if (result.symbolsJson.outputs) {
        merged.outputs.push(...result.symbolsJson.outputs);
      }
      if (result.symbolsJson.memoryBits) {
        merged.memoryBits.push(...result.symbolsJson.memoryBits);
      }
      if (result.symbolsJson.timers) {
        merged.timers.push(...result.symbolsJson.timers);
      }
    }
  }

  // Remove duplicates by address
  merged.inputs = deduplicateByAddress(merged.inputs);
  merged.outputs = deduplicateByAddress(merged.outputs);
  merged.memoryBits = deduplicateByAddress(merged.memoryBits);
  merged.timers = deduplicateByAddress(merged.timers);

  return merged;
}

/**
 * Remove duplicate entries by address field
 */
function deduplicateByAddress<T extends { address: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.address)) {
      return false;
    }
    seen.add(item.address);
    return true;
  });
}

/**
 * Get token efficiency stats for a multi-POU generation
 */
export function getEfficiencyStats(results: POUGenerationResult[]): {
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedMonolithicTokens: number;
  tokensSaved: number;
  percentageSaved: number;
} {
  const totalInputTokens = results.reduce((sum, r) => sum + r.tokensUsed.input, 0);
  const totalOutputTokens = results.reduce((sum, r) => sum + r.tokensUsed.output, 0);

  // Monolithic approach would use ~22,000 input tokens
  const estimatedMonolithicTokens = 22000;
  const tokensSaved = estimatedMonolithicTokens - totalInputTokens;
  const percentageSaved = Math.round((tokensSaved / estimatedMonolithicTokens) * 100);

  return {
    totalInputTokens,
    totalOutputTokens,
    estimatedMonolithicTokens,
    tokensSaved,
    percentageSaved,
  };
}
