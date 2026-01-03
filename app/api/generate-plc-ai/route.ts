/**
 * M221 PLC Program Generator API
 *
 * HYBRID APPROACH:
 * 1. Claude AI analyzes requirements → outputs patterns
 * 2. Template engine → generates valid .smbp XML
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateM221Patterns, generateFallbackPatterns, AIPatternOutput, PatternDefinition, POUCategory } from '@/lib/claude';
import {
  generateMotorStartStopRung,
  generateSimpleRung,
  generateCompareBlockRung,
  generateHysteresisRung,
  generateTimerRung,
  generateCounterRung,
  generateBranchRung,
  generateFullSmbp,
  generateFullSmbpMultiPOU,
  RungPattern,
  TimerDeclaration,
  CounterDeclaration,
  AnalogInputDeclaration,
  POUDefinition,
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

// POU organization configuration
interface POUOrganization {
  system_init: boolean;
  io_mapping: boolean;
  auto_operation: boolean;
  manual_operation: boolean;
  alarms_faults: boolean;
}

// Custom POU names configuration
interface POUNames {
  system_init?: string;
  io_mapping?: string;
  auto_operation?: string;
  manual_operation?: string;
  alarms_faults?: string;
}

// Default POU names
const DEFAULT_POU_NAMES: Record<POUCategory, string> = {
  system_init: 'System_Init',
  io_mapping: 'IO_Mapping',
  auto_operation: 'Auto_Control',
  manual_operation: 'Manual_Control',
  alarms_faults: 'Alarm_Handler',
  custom: 'Custom_Logic'
};

// Classify pattern into POU category based on its type and purpose
function classifyPatternToPOU(pattern: PatternDefinition): POUCategory {
  // If pattern already has a category assigned by AI, use it
  if (pattern.pouCategory) {
    return pattern.pouCategory;
  }

  // Auto-classify based on pattern type and name
  const { type, rungName, params } = pattern;
  const nameLower = (rungName || '').toLowerCase();

  // System init patterns
  if (nameLower.includes('system') || nameLower.includes('ready') || nameLower.includes('startup')) {
    return 'system_init';
  }

  // I/O mapping patterns
  if (nameLower.includes('copy') || nameLower.includes('scale') || nameLower.includes('mapping')) {
    return 'io_mapping';
  }
  if (type === 'simpleContact' && params.input && String(params.input).startsWith('%IW')) {
    return 'io_mapping';
  }

  // Alarm patterns
  if (nameLower.includes('alarm') || nameLower.includes('fault') || nameLower.includes('limit')) {
    return 'alarms_faults';
  }
  if (type === 'compareBlock' && (nameLower.includes('high') || nameLower.includes('low'))) {
    return 'alarms_faults';
  }

  // Manual patterns
  if (nameLower.includes('manual') || nameLower.includes('hmi') || nameLower.includes('jog')) {
    return 'manual_operation';
  }

  // Default to auto operation for control logic
  return 'auto_operation';
}

// Group patterns into POUs
function classifyPatternsIntoPOUs(
  patterns: PatternDefinition[],
  organization: POUOrganization,
  customNames?: POUNames
): POUDefinition[] {
  const pous: POUDefinition[] = [];
  let sectionNumber = 0;

  // Group patterns by category
  const grouped: Record<POUCategory, PatternDefinition[]> = {
    system_init: [],
    io_mapping: [],
    auto_operation: [],
    manual_operation: [],
    alarms_faults: [],
    custom: []
  };

  patterns.forEach(pattern => {
    const category = classifyPatternToPOU(pattern);
    grouped[category].push(pattern);
  });

  // Create POUs for enabled categories with patterns
  const categoryOrder: POUCategory[] = ['system_init', 'io_mapping', 'auto_operation', 'manual_operation', 'alarms_faults'];

  categoryOrder.forEach(category => {
    const isEnabled = organization[category as keyof POUOrganization];
    if (isEnabled && grouped[category].length > 0) {
      const pouName = customNames?.[category as keyof POUNames] || DEFAULT_POU_NAMES[category];
      pous.push({
        name: pouName,
        sectionNumber: sectionNumber++,
        category,
        rungs: grouped[category].map(patternToRung)
      });
    }
  });

  // If no POUs were created but we have patterns, put them all in auto_operation
  if (pous.length === 0 && patterns.length > 0) {
    pous.push({
      name: customNames?.auto_operation || 'Main_Program',
      sectionNumber: 0,
      category: 'auto_operation',
      rungs: patterns.map(patternToRung)
    });
  }

  return pous;
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
      promptType = 1,
      usePOUs = false,
      pouOrganization = {
        system_init: true,
        io_mapping: true,
        auto_operation: true,
        manual_operation: false,
        alarms_faults: true
      },
      pouNames
    } = body as {
      description: string;
      plcModel?: string;
      projectName?: string;
      customInputs?: CustomIO[];
      customOutputs?: CustomIO[];
      selectedSkills?: string[];
      promptType?: number;
      usePOUs?: boolean;
      pouOrganization?: POUOrganization;
      pouNames?: POUNames;
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
    let smbpContent: string;
    let pous: POUDefinition[] | undefined;

    if (usePOUs) {
      // Multi-POU mode: classify patterns into POUs
      pous = classifyPatternsIntoPOUs(aiOutput.patterns, pouOrganization, pouNames);
      smbpContent = generateFullSmbpMultiPOU({
        projectName: projectName || aiOutput.projectName || 'AI_Generated',
        plcModel,
        pous,
        inputs: aiOutput.inputs.filter(i => !i.address.startsWith('%IW')), // Only digital inputs
        outputs: aiOutput.outputs,
        memoryBits: aiOutput.memoryBits,
        timers,
        counters,
        analogInputs, // Add analog inputs for TM3AI4 extension
      });
    } else {
      // Single-POU mode: all rungs in one POU
      smbpContent = generateFullSmbp({
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
    }

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
      usePOUs,
      programData: {
        projectName: aiOutput.projectName,
        description: aiOutput.description,
        inputs: aiOutput.inputs,
        outputs: aiOutput.outputs,
        memoryBits: aiOutput.memoryBits,
        rungCount: usePOUs ? pous?.reduce((sum, p) => sum + p.rungs.length, 0) || 0 : rungs.length,
        rungs: rungs.map(r => ({ name: r.name, comment: r.comment, il: r.ilCode })),
        pous: usePOUs ? pous?.map(p => ({
          name: p.name,
          category: p.category,
          sectionNumber: p.sectionNumber,
          rungCount: p.rungs.length,
          rungs: p.rungs.map(r => ({ name: r.name, comment: r.comment }))
        })) : undefined,
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
