/**
 * M221 PLC Program Generator API
 *
 * HYBRID APPROACH:
 * 1. Claude AI analyzes requirements → outputs patterns
 * 2. Template engine → generates valid .smbp XML
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateM221Patterns, generateFallbackPatterns, AIPatternOutput, PatternDefinition } from '@/lib/claude';
import {
  generateMotorStartStopRung,
  generateSimpleRung,
  generateCompareBlockRung,
  generateHysteresisRung,
  generateTimerRung,
  generateCounterRung,
  generateBranchRung,
  generateFullSmbp,
  RungPattern,
  TimerDeclaration,
  CounterDeclaration,
  AnalogInputDeclaration,
} from '@/lib/smbp-templates';

// ============================================================
// PATTERN TO RUNG CONVERTER
// ============================================================

function patternToRung(pattern: PatternDefinition): RungPattern {
  const { type, params, rungName, rungComment } = pattern;

  switch (type) {
    case 'motorStartStop':
      return generateMotorStartStopRung({
        startInput: params.startInput as string,
        startSymbol: params.startSymbol as string,
        stopInput: params.stopInput as string,
        stopSymbol: params.stopSymbol as string,
        estopInput: params.estopInput as string | undefined,
        estopSymbol: params.estopSymbol as string | undefined,
        output: params.output as string,
        outputSymbol: params.outputSymbol as string,
        rungName,
        rungComment,
      });

    case 'simpleContact':
    case 'outputCopy':
      return generateSimpleRung({
        input: params.input as string,
        inputSymbol: params.inputSymbol as string,
        output: params.output as string,
        outputSymbol: params.outputSymbol as string,
        negated: params.negated as boolean | undefined,
        rungName,
        rungComment,
      });

    case 'compareBlock':
      return generateCompareBlockRung({
        analogInput: params.analogInput as string,
        operator: params.operator as '>' | '<' | '>=' | '<=' | '=' | '<>',
        value: params.value as number,
        output: params.output as string,
        outputSymbol: params.outputSymbol as string,
        rungName,
        rungComment,
      });

    case 'hysteresis':
      return generateHysteresisRung({
        lowFlag: params.lowFlag as string,
        lowSymbol: params.lowSymbol as string,
        highFlag: params.highFlag as string,
        highSymbol: params.highSymbol as string,
        estopInput: params.estopInput as string | undefined,
        estopSymbol: params.estopSymbol as string | undefined,
        output: params.output as string,
        outputSymbol: params.outputSymbol as string,
        rungName,
        rungComment,
      });

    case 'timer':
      return generateTimerRung({
        timerAddress: params.timerAddress as string,
        timerSymbol: params.timerSymbol as string | undefined,
        input: params.input as string,
        inputSymbol: params.inputSymbol as string,
        output: params.output as string,
        outputSymbol: params.outputSymbol as string,
        preset: params.preset as number,
        timeBase: params.timeBase as 'OneMs' | 'TenMs' | 'HundredMs' | 'OneSecond' | 'OneMinute',
        rungName,
        rungComment,
      });

    case 'counter':
      return generateCounterRung({
        counterAddress: params.counterAddress as string,
        counterSymbol: params.counterSymbol as string | undefined,
        countInput: params.countInput as string,
        countSymbol: params.countSymbol as string,
        resetInput: params.resetInput as string | undefined,
        resetSymbol: params.resetSymbol as string | undefined,
        output: params.output as string,
        outputSymbol: params.outputSymbol as string,
        preset: params.preset as number,
        rungName,
        rungComment,
      });

    case 'branch':
      return generateBranchRung({
        mainInput: params.mainInput as string,
        mainSymbol: params.mainSymbol as string,
        branchInput: params.branchInput as string,
        branchSymbol: params.branchSymbol as string,
        output: params.output as string,
        outputSymbol: params.outputSymbol as string,
        mainNegated: params.mainNegated as boolean | undefined,
        branchNegated: params.branchNegated as boolean | undefined,
        rungName,
        rungComment,
      });

    default:
      // Fallback to simple contact
      return generateSimpleRung({
        input: '%I0.0',
        inputSymbol: 'INPUT',
        output: '%Q0.0',
        outputSymbol: 'OUTPUT',
        rungName: rungName || 'Unknown Pattern',
        rungComment: rungComment || 'Fallback rung',
      });
  }
}

// ============================================================
// API ENDPOINT
// ============================================================

// Custom I/O type for API
interface CustomIO {
  address: string;
  symbol: string;
  comment: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      description,
      plcModel = 'TM221CE16T',
      projectName,
      customInputs,
      customOutputs,
      selectedSkills = ['motorStartStop'],
      promptType = 1
    } = body as {
      description: string;
      plcModel?: string;
      projectName?: string;
      customInputs?: CustomIO[];
      customOutputs?: CustomIO[];
      selectedSkills?: string[];
      promptType?: number;
    };

    if (!description) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    // Build enhanced description with custom I/O if provided
    let enhancedDescription = description;
    if (customInputs && customInputs.length > 0) {
      enhancedDescription += '\n\nPRE-DEFINED INPUTS (USE THESE ADDRESSES):';
      customInputs.forEach(io => {
        enhancedDescription += `\n- ${io.address} (${io.symbol}): ${io.comment || 'Input'}`;
      });
    }
    if (customOutputs && customOutputs.length > 0) {
      enhancedDescription += '\n\nPRE-DEFINED OUTPUTS (USE THESE ADDRESSES):';
      customOutputs.forEach(io => {
        enhancedDescription += `\n- ${io.address} (${io.symbol}): ${io.comment || 'Output'}`;
      });
    }

    let aiOutput: AIPatternOutput;

    // Try AI generation first
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        console.log('Using Claude AI for pattern generation...');
        console.log('Selected Skills:', selectedSkills);
        console.log('Prompt Type:', promptType);
        aiOutput = await generateM221Patterns(enhancedDescription, plcModel, selectedSkills, promptType);
        console.log('AI patterns:', JSON.stringify(aiOutput, null, 2));
      } catch (aiError) {
        console.error('AI generation failed, using fallback:', aiError);
        aiOutput = generateFallbackPatterns(enhancedDescription, projectName || 'AI_Generated');
      }
    } else {
      console.log('No API key, using fallback pattern generation...');
      aiOutput = generateFallbackPatterns(enhancedDescription, projectName || 'AI_Generated');
    }

    // Merge custom I/O with AI-generated I/O
    if (customInputs && customInputs.length > 0) {
      // Add custom inputs that aren't already in the AI output
      customInputs.forEach(customIO => {
        const exists = aiOutput.inputs.some(io => io.address === customIO.address);
        if (!exists) {
          aiOutput.inputs.push(customIO);
        }
      });
    }
    if (customOutputs && customOutputs.length > 0) {
      // Add custom outputs that aren't already in the AI output
      customOutputs.forEach(customIO => {
        const exists = aiOutput.outputs.some(io => io.address === customIO.address);
        if (!exists) {
          aiOutput.outputs.push(customIO);
        }
      });
    }

    // Convert patterns to rungs
    const rungs: RungPattern[] = aiOutput.patterns.map(patternToRung);

    // Extract timer declarations from timer patterns
    const timers: TimerDeclaration[] = aiOutput.patterns
      .filter(p => p.type === 'timer')
      .map((p, index) => ({
        address: p.params.timerAddress as string,
        index,
        preset: p.params.preset as number,
        base: p.params.timeBase as 'OneMs' | 'TenMs' | 'HundredMs' | 'OneSecond' | 'OneMinute',
      }));

    // Extract counter declarations from counter patterns
    const counters: CounterDeclaration[] = aiOutput.patterns
      .filter(p => p.type === 'counter')
      .map((p, index) => ({
        address: p.params.counterAddress as string,
        index,
        preset: p.params.preset as number,
      }));

    // Extract analog inputs from AI inputs (addresses starting with %IW)
    // Also extract from compareBlock patterns
    const analogInputs: AnalogInputDeclaration[] = [];

    // From inputs array
    aiOutput.inputs
      .filter(i => i.address.startsWith('%IW'))
      .forEach(i => {
        if (!analogInputs.some(ai => ai.address === i.address)) {
          analogInputs.push({
            address: i.address,
            symbol: i.symbol,
            comment: i.comment,
          });
        }
      });

    // From compareBlock patterns (extract analogInput param)
    aiOutput.patterns
      .filter(p => p.type === 'compareBlock')
      .forEach(p => {
        const addr = p.params.analogInput as string;
        if (addr && addr.startsWith('%IW') && !analogInputs.some(ai => ai.address === addr)) {
          analogInputs.push({
            address: addr,
            symbol: p.params.inputSymbol as string || '',
            comment: `Analog input for ${p.rungName || 'compare block'}`,
          });
        }
      });

    // Generate full .smbp file using templates
    const smbpContent = generateFullSmbp({
      projectName: projectName || aiOutput.projectName || 'AI_Generated',
      plcModel,
      rungs,
      inputs: aiOutput.inputs.filter(i => !i.address.startsWith('%IW')), // Only digital inputs
      outputs: aiOutput.outputs,
      memoryBits: aiOutput.memoryBits,
      timers,
      counters,
      analogInputs, // Add analog inputs for TM3AI4 extension
    });

    return NextResponse.json({
      success: true,
      content: smbpContent,
      filename: `${projectName || aiOutput.projectName || 'AI_Generated'}.smbp`,
      extension: '.smbp',
      model: plcModel,
      manufacturer: 'Schneider Electric',
      aiGenerated: !!process.env.ANTHROPIC_API_KEY,
      patternsUsed: aiOutput.patterns.map(p => p.type),
      selectedSkills: selectedSkills,
      promptType: promptType,
      programData: {
        projectName: aiOutput.projectName,
        description: aiOutput.description,
        inputs: aiOutput.inputs,
        outputs: aiOutput.outputs,
        memoryBits: aiOutput.memoryBits,
        rungCount: rungs.length,
        rungs: rungs.map(r => ({ name: r.name, comment: r.comment, il: r.ilCode })),
      },
    });

  } catch (error: unknown) {
    console.error('Generation Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: 'Failed to generate program',
        details: errorMessage,
        apiKeyConfigured: !!process.env.ANTHROPIC_API_KEY,
      },
      { status: 500 }
    );
  }
}
