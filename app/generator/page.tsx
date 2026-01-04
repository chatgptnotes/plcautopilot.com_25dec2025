'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import PLCCascadingSelector from '@/app/components/PLCCascadingSelector';
import type { PLCManufacturer, PLCSeries, PLCModel, ExpansionModule } from '@/lib/plc-models-database';
import { getExpansionModules } from '@/lib/plc-models-database';
import { downloadAIPDFDocument } from '@/lib/pdf-generator';
import TestProgramSection from '@/app/components/TestProgramSection';

// Template definitions - stored in /templates folder for cloud deployment
const TEMPLATES = [
  {
    id: 'TM221CE24T-base',
    name: 'M221 Base Template (Clean)',
    path: 'templates/TM221CE24T-base.smbp',
    description: 'Clean M221 template without expansion modules. Used for all M221 models (CE16T/R, CE24T/R, CE40T/R). Hardware model updated dynamically.'
  },
  {
    id: 'with-expansion',
    name: 'M221 with Expansion Modules',
    path: 'templates/TM221-with-expansion-modules.smbp',
    description: 'M221 template with TM3 expansion modules (TM3DI32K, TM3DQ32TK, TM3AI8/G, TM3TI4D/G). Use when expansion cards are required.'
  },
];

// Skills definitions
const SKILLS = [
  { id: 'schneider-m221', name: 'Schneider M221', description: 'Generate programs for Modicon M221 (.smbp format). Includes timer BLK pattern, 4-20mA scaling, retentive memory rules.', file: '.claude/skills/schneider.md' },
  { id: 'm221-complete', name: 'M221 Complete Reference', description: 'Complete M221 programming reference with all 21 controller models, element types, grid layout, timer patterns.', file: '.claude/skills/M221-COMPLETE-REFERENCE.md' },
  { id: 'siemens-s7', name: 'Siemens S7-1200/1500', description: 'Generate TIA Portal projects for S7-1200 and S7-1500 series PLCs.', file: '.claude/skills/siemens-s7.md' },
  { id: 'rockwell-ab', name: 'Rockwell Allen-Bradley', description: 'Generate Studio 5000 programs for ControlLogix and CompactLogix.', file: '.claude/skills/rockwell-allen-bradley.md' },
];

// ==========================================
// SECTION 1: RULES TO BE USED (Editable by user)
// ==========================================
const DEFAULT_RULES_TEXT = `You are an expert M221 PLC programmer. Analyze control requirements and output a structured JSON using the available PATTERNS.

AVAILABLE PATTERNS:
1. motorStartStop: Start/Stop with seal-in latch. (Params: startInput, stopInput, estopInput?, output)
2. simpleContact: Single contact to output. (Params: input, output, negated?)
3. compareBlock: Analog comparison. (Params: analogInput, operator [>, <, >=, <=, =, <>], value, output)
4. hysteresis: Latching control with high/low thresholds. (Params: lowFlag, highFlag, estopInput?, output)
5. outputCopy: Copy memory/input to output. (Params: input, output)
6. timerBlock: Timer controlled output. (Params: enableInput, timerAddress, preset, output)
7. analogScaling: Scale 4-20mA to engineering units. (Params: rawInput, scaledOutput, formula)

I/O ADDRESSES:
* Digital Inputs: %I0.0-%I0.8 (TM221CE16T), %I0.0-%I0.13 (TM221CE24T), %I0.0-%I0.23 (TM221CE40T)
* Digital Outputs: %Q0.0-%Q0.6 (TM221CE16T), %Q0.0-%Q0.9 (TM221CE24T), %Q0.0-%Q0.15 (TM221CE40T)
* Internal: Memory Bits %M0-%M511. Memory Words %MW0-%MW1999. Memory Floats %MF0-%MF1999.
* Analog Inputs: %IW0.0, %IW0.1 (built-in). Expansion: %IW1.0-%IW1.3 (4-20mA = 2000-10000 raw).
* Timers: %TM0-%TM254 (preset in seconds, Base=OneSecond)

CRITICAL RULES:
1. Always include ESTOP in safety-critical applications (Use NC contacts).
2. Use %M for internal flags, %Q for physical outputs.
3. NEVER use %IW directly in calculations - copy to %MW first, then calculate.
4. Use %MF100+ for HMI values (non-retentive). Use %MF0-99 for setpoints (retentive).
5. Timer/Comparison elements SPAN 2 COLUMNS in ladder grid.
6. First rung MUST be System Ready with startup delay timer.
7. Reset HMI floats on cold/warm start (%S0 OR %S1).

OUTPUT: Generate ladder logic rungs in valid Machine Expert Basic XML format.`;

// ==========================================
// SECTION 2: LOGIC TO BE USED (Standard templates + User custom)
// ==========================================
const STANDARD_LOGIC_TEMPLATES: Array<{ id: string; name: string; content: string; is_default: boolean }> = [
  {
    id: 'motor-control',
    name: 'Motor Start/Stop Control',
    content: `Create a motor start/stop control program with:
- START pushbutton (NO contact)
- STOP pushbutton (NC contact for safety)
- ESTOP emergency stop (NC contact)
- Overload protection input
- Motor running output with seal-in latch
- Running indicator light
- Fault indicator light

Include safety interlocks and proper shutdown sequence.`,
    is_default: true,
  },
  {
    id: 'tank-level',
    name: 'Tank Level Control',
    content: `Create a tank level control program with:
- 4-20mA level sensor input
- High level alarm threshold
- Low level alarm threshold
- Inlet valve control (fill when low)
- Outlet valve control (drain when high)
- HMI display values for tank level percentage and liters

Scale 4-20mA (2000-10000 raw) to 0-1000 liters.
Include hysteresis to prevent valve chattering.`,
    is_default: true,
  },
  {
    id: 'sequential-lights',
    name: 'Sequential Traffic Lights',
    content: `Create a sequential traffic light control program with:
- Green light ON for 30 seconds
- Yellow light ON for 5 seconds
- Red light ON for 30 seconds
- Continuous cycle when enabled
- Manual override for each light
- Emergency all-red mode

Use timers for timing and memory bits for state tracking.`,
    is_default: true,
  },
  {
    id: 'pump-control',
    name: 'Pump Pressure Control',
    content: `Create a pump pressure control program with:
- 4-20mA pressure sensor input
- Low pressure setpoint (turn pump ON)
- High pressure setpoint (turn pump OFF)
- Pump running output
- Low pressure alarm
- High pressure alarm
- HMI display for pressure in PSI

Include hysteresis and dry-run protection.`,
    is_default: true,
  },
];

// Chat message interface for AI conversation
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Default prompts - now separated into Rules and Logic
const DEFAULT_PROMPTS: Array<{ id: string; name: string; content: string; is_default: boolean }> = STANDARD_LOGIC_TEMPLATES;

interface Prompt {
  id: string;
  name: string;
  content: string;
  is_default?: boolean;
}

interface GeneratedFile {
  id?: string;
  content: string;
  filename: string;
  extension: string;
  aiGenerated?: boolean;
  tokensUsed?: number;
  manufacturer?: string;
  model?: string;
}

export default function GeneratorPage() {
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // PLC Selection state
  const [selectedPLC, setSelectedPLC] = useState<{
    manufacturer: PLCManufacturer | null;
    series: PLCSeries | null;
    model: PLCModel | null;
  }>({ manufacturer: null, series: null, model: null });

  // Saved PLC IDs for restoring selection after page load
  const [savedPLCIds, setSavedPLCIds] = useState<{
    manufacturerId: string | null;
    seriesId: string | null;
    modelId: string | null;
  }>({ manufacturerId: null, seriesId: null, modelId: null });

  // Expansion modules state
  const [availableModules, setAvailableModules] = useState<ExpansionModule[]>([]);
  const [selectedModules, setSelectedModules] = useState<ExpansionModule[]>([]);

  // Computed expansion module rule - shown in Rules section when modules are selected
  const expansionModuleRule = useMemo(() => {
    if (selectedModules.length === 0) return '';

    let rule = `=== EXPANSION MODULE CONFIGURATION (Auto-generated) ===\n\n`;
    rule += `IMPORTANT: The following expansion modules MUST be included in the generated program:\n\n`;

    selectedModules.forEach((module, index) => {
      const slotNum = index + 1;
      const addressBase = slotNum; // Slot 1 = %IW1.x, Slot 2 = %IW2.x, etc.

      rule += `SLOT ${slotNum}: ${module.name} (${module.partNumber})\n`;
      rule += `  - Category: ${module.category}\n`;

      // Add specifications
      Object.entries(module.specifications).forEach(([key, value]) => {
        rule += `  - ${key}: ${value}\n`;
      });

      // Add addressing rules based on module type
      if (module.category === 'analog-input' || module.category === 'temperature') {
        const channels = parseInt(module.specifications['Channels'] || '4');
        rule += `  - Addressing: %IW${addressBase}.0 to %IW${addressBase}.${channels - 1}\n`;
        rule += `  - Status: %IWS${addressBase}.0 to %IWS${addressBase}.${channels - 1}\n`;
      } else if (module.category === 'digital-input') {
        rule += `  - Addressing: %I${addressBase}.0 onwards\n`;
      } else if (module.category === 'digital-output' || module.category === 'relay') {
        rule += `  - Addressing: %Q${addressBase}.0 onwards\n`;
      } else if (module.category === 'digital-mixed') {
        rule += `  - Input Addressing: %I${addressBase}.0 onwards\n`;
        rule += `  - Output Addressing: %Q${addressBase}.0 onwards\n`;
      }
      rule += '\n';
    });

    rule += `HARDWARE XML REQUIREMENTS:\n`;
    rule += `- Add each module to <Extensions> section with correct Index (Slot 1 = Index 0)\n`;
    rule += `- Configure AnalogInputs/DigitalInputs with proper addresses\n`;
    rule += `- Include AnalogInputsStatus for analog modules\n`;
    rule += `- Reference the correct HardwareId for each module type\n\n`;
    rule += `=== END EXPANSION MODULE CONFIGURATION ===`;

    return rule;
  }, [selectedModules]);

  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  // Skills state
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  // Prompts state (from Supabase) - Now called "Logic Templates"
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);

  // RULES state (editable by user)
  const [rulesText, setRulesText] = useState(DEFAULT_RULES_TEXT);
  const [isEditingRules, setIsEditingRules] = useState(false);

  // LOGIC mode: 'template' = use standard templates, 'chat' = AI conversation
  const [logicMode, setLogicMode] = useState<'template' | 'chat'>('template');

  // Chat state for AI conversation (when user wants to describe custom logic)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [finalLogicFromChat, setFinalLogicFromChat] = useState<string>('');
  // Live conversation summary - updates as user chats with AI
  const [conversationSummary, setConversationSummary] = useState<string>('');
  // Uploaded diagrams/images for AI context
  const [chatImages, setChatImages] = useState<Array<{ id: string; base64: string; name: string; type: string }>>([]);

  // Combined context state
  const [combinedContext, setCombinedContext] = useState('');

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFile, setGeneratedFile] = useState<GeneratedFile | null>(null);

  // Error Rectification state
  const [errorScreenshot, setErrorScreenshot] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorProgramFile, setErrorProgramFile] = useState<{ content: string; name: string } | null>(null);
  const [isAnalyzingError, setIsAnalyzingError] = useState(false);
  const [errorAnalysis, setErrorAnalysis] = useState<{
    analysis: { errorType: string; severity: string; rootCause: string; affectedComponents: string[] };
    solutions: Array<{ description: string; explanation: string; confidence: number }>;
    recommendations: string[];
    correctedCode?: string;
    correctedFileName?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useReliableMode, setUseReliableMode] = useState(true); // Reliable mode by default

  // Generated files history
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);

  // Load prompts from API and merge with default prompts
  // Supabase versions override defaults (for user-edited prompts that are saved)
  // NOTE: No dependencies to prevent re-loading when other state changes
  const loadPrompts = useCallback(async () => {
    try {
      // Try to load prompts from Supabase
      const response = await fetch('/api/prompts');
      const data = await response.json();

      let allPrompts: Prompt[] = [];

      if (data.prompts && data.prompts.length > 0) {
        // Create a map of Supabase prompts by ID for quick lookup
        const supabaseMap = new Map<string, Prompt>();
        for (const p of data.prompts) {
          supabaseMap.set(p.id, p);
        }

        // For each default prompt, use Supabase version if exists (user edited), otherwise use default
        for (const defaultPrompt of DEFAULT_PROMPTS) {
          if (supabaseMap.has(defaultPrompt.id)) {
            // User has edited this prompt - use their version
            allPrompts.push(supabaseMap.get(defaultPrompt.id)!);
            supabaseMap.delete(defaultPrompt.id); // Remove from map
          } else {
            // No edits - use default version
            allPrompts.push(defaultPrompt);
          }
        }

        // Add any additional Supabase prompts (user-created custom prompts)
        for (const [, prompt] of supabaseMap) {
          allPrompts.push(prompt);
        }
      } else {
        // No prompts in Supabase - use defaults
        allPrompts = [...DEFAULT_PROMPTS];
      }

      setPrompts(allPrompts);

      // Return prompts for initial selection handling
      return allPrompts;
    } catch (err) {
      console.error('Failed to load prompts from API, using defaults:', err);
      setPrompts(DEFAULT_PROMPTS);
      return DEFAULT_PROMPTS;
    }
  }, []); // Empty dependencies - only load once on mount

  // Load config from API
  const loadConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/generator-config');
      const data = await response.json();
      if (data.config) {
        const config = data.config;
        if (config.selected_template) setSelectedTemplate(config.selected_template);
        if (config.selected_skills) setSelectedSkills(config.selected_skills);
        if (config.selected_prompt_id) setSelectedPromptId(config.selected_prompt_id);
        if (config.combined_context) setCombinedContext(config.combined_context);
        // Restore PLC selection IDs - PLCCascadingSelector will use these as defaults
        if (config.selected_manufacturer_id || config.selected_series_id || config.selected_model_id) {
          setSavedPLCIds({
            manufacturerId: config.selected_manufacturer_id || null,
            seriesId: config.selected_series_id || null,
            modelId: config.selected_model_id || null,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  }, []);

  // Load generated files history
  const loadGeneratedFiles = useCallback(async () => {
    try {
      const response = await fetch('/api/generated-files?limit=10');
      const data = await response.json();
      if (data.files) {
        setGeneratedFiles(data.files);
      }
    } catch (err) {
      console.error('Failed to load generated files:', err);
    }
  }, []);

  // Initial load - runs only once on mount
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const [loadedPrompts] = await Promise.all([loadPrompts(), loadConfig(), loadGeneratedFiles()]);
      // Auto-select first prompt if in template mode and none selected
      if (loadedPrompts && loadedPrompts.length > 0) {
        // Don't auto-select - let user choose
      }
      setIsLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount

  // Config save status
  const [configSaveStatus, setConfigSaveStatus] = useState<string | null>(null);

  // Auto-save config when selections change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isLoading) {
        // Auto-save silently in background
        fetch('/api/generator-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config_key: 'default',
            selected_manufacturer_id: selectedPLC.manufacturer?.id || null,
            selected_series_id: selectedPLC.series?.id || null,
            selected_model_id: selectedPLC.model?.id || null,
            selected_template: selectedTemplate || null,
            selected_skills: selectedSkills,
            selected_prompt_id: selectedPromptId,
            combined_context: combinedContext,
          }),
        }).catch(err => console.error('Auto-save failed:', err));
      }
    }, 2000); // 2 second debounce
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate, selectedSkills, selectedPromptId, combinedContext, selectedPLC, isLoading]);

  // Save config to API (called explicitly by Save button)
  const saveConfig = async () => {
    setConfigSaveStatus('Saving...');
    try {
      const response = await fetch('/api/generator-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config_key: 'default',
          selected_manufacturer_id: selectedPLC.manufacturer?.id || null,
          selected_series_id: selectedPLC.series?.id || null,
          selected_model_id: selectedPLC.model?.id || null,
          selected_template: selectedTemplate || null,
          selected_skills: selectedSkills,
          selected_prompt_id: selectedPromptId,
          combined_context: combinedContext,
        }),
      });

      if (response.ok) {
        setConfigSaveStatus('All selections saved!');
        setTimeout(() => setConfigSaveStatus(null), 3000);
      } else {
        setConfigSaveStatus('Failed to save');
        setTimeout(() => setConfigSaveStatus(null), 3000);
      }
    } catch (err) {
      console.error('Failed to save config:', err);
      setConfigSaveStatus('Failed to save');
      setTimeout(() => setConfigSaveStatus(null), 3000);
    }
  };

  // Clear all selections and reset to defaults
  const clearConfig = async () => {
    // Reset all selections to defaults
    setSelectedPLC({ manufacturer: null, series: null, model: null });
    setSavedPLCIds({ manufacturerId: null, seriesId: null, modelId: null });
    setSelectedTemplate('prompt-mode');
    setSelectedSkills([]);
    setSelectedPromptId(null);
    setCombinedContext('');
    setConversationSummary('');
    setChatMessages([]);

    // Clear from API/database
    try {
      await fetch('/api/generator-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config_key: 'default',
          selected_manufacturer_id: null,
          selected_series_id: null,
          selected_model_id: null,
          selected_template: 'prompt-mode',
          selected_skills: [],
          selected_prompt_id: null,
          combined_context: '',
        }),
      });
      setConfigSaveStatus('All selections cleared!');
      setTimeout(() => setConfigSaveStatus(null), 3000);
    } catch (err) {
      console.error('Failed to clear config:', err);
    }
  };

  // Fetch data function - manually combines all selections into context
  // Creates a COMPLETE prompt with all data + generation instructions
  const fetchData = () => {
    let context = '';

    // === HEADER: GENERATION TASK ===
    context += `# PLC PROGRAM GENERATION REQUEST\n\n`;
    context += `Generate a complete, valid PLC program based on the specifications below.\n`;
    context += `Follow all rules and patterns exactly. Output must be valid Machine Expert Basic XML (.smbp format).\n\n`;

    // === SECTION 1: TARGET PLC ===
    if (selectedPLC.model) {
      context += `## 1. Target PLC Model\n`;
      context += `- Manufacturer: ${selectedPLC.manufacturer?.name}\n`;
      context += `- Series: ${selectedPLC.series?.name}\n`;
      context += `- Model: ${selectedPLC.model.name}\n`;
      if (selectedPLC.model.partNumber) {
        context += `- Part Number: ${selectedPLC.model.partNumber}\n`;
      }
      // Include expansion modules if selected
      if (selectedModules.length > 0) {
        context += `\n### Expansion Modules:\n`;
        selectedModules.forEach((module, index) => {
          const specs = Object.entries(module.specifications).map(([k, v]) => `${k}: ${v}`).join(', ');
          context += `- Slot ${index + 1}: ${module.name} (${module.partNumber}) - ${specs}\n`;
        });
      }
      context += '\n';
    }

    // === SECTION 2: TEMPLATE ===
    if (selectedTemplate) {
      const template = TEMPLATES.find(t => t.id === selectedTemplate);
      if (template) {
        context += `## 2. Base Template\n`;
        context += `- Name: ${template.name}\n`;
        context += `- Path: ${template.path}\n`;
        context += `- Description: ${template.description}\n\n`;
      }
    }

    // === SECTION 3: SKILLS ===
    if (selectedSkills.length > 0) {
      context += `## 3. Skills to Apply\n`;
      selectedSkills.forEach(skillId => {
        const skill = SKILLS.find(s => s.id === skillId);
        if (skill) {
          context += `- ${skill.name}: ${skill.description}\n`;
        }
      });
      context += '\n';
    }

    // === SECTION 4: LOGIC REQUIREMENTS ===
    // IMPORTANT: Check logicMode FIRST - if user is in chat mode, use conversation summary
    if (logicMode === 'chat') {
      // User is describing with AI - use conversation summary
      if (conversationSummary) {
        context += `## 4. Logic Requirements\n`;
        context += `Source: AI Conversation Summary\n\n`;
        context += conversationSummary + '\n\n';
      } else if (chatMessages.length > 1) {
        // Fallback: summarize the chat messages if no summary available yet
        context += `## 4. Logic Requirements (In Progress)\n`;
        context += 'AI conversation in progress. Continue chatting to capture complete requirements.\n';
        context += '\nUser inputs so far:\n';
        chatMessages.forEach(msg => {
          if (msg.role === 'user') {
            context += `- ${msg.content}\n`;
          }
        });
        context += '\n';
      } else {
        context += `## 4. Logic Requirements\n`;
        context += 'No logic defined yet. Please describe your requirements in the chat.\n\n';
      }
    } else if (selectedPromptId) {
      // User is using standard templates
      const prompt = prompts.find(p => p.id === selectedPromptId);
      if (prompt) {
        context += `## 4. Logic Requirements\n`;
        context += `Source: Selected Template\n\n`;
        context += prompt.content + '\n\n';
      }
    } else {
      context += `## 4. Logic Requirements\n`;
      context += 'No template selected. Please select a template or describe with AI.\n\n';
    }

    // === SECTION 5: EXPERT RULES ===
    context += `## 5. Expert Rules (MUST FOLLOW)\n`;
    context += rulesText + '\n\n';

    // === SECTION 5.1: EXPANSION MODULE RULES (if any modules selected) ===
    if (expansionModuleRule) {
      context += `## 5.1. Expansion Module Configuration (CRITICAL)\n`;
      context += expansionModuleRule + '\n\n';
    }

    // === SECTION 6: GENERATION INSTRUCTIONS ===
    context += `## 6. GENERATION INSTRUCTIONS\n\n`;
    context += `Based on all the above specifications, generate a complete PLC program:\n\n`;
    context += `1. **Read the base template** from the specified path\n`;
    context += `2. **Apply the logic requirements** to create ladder rungs\n`;
    context += `3. **Follow all expert rules** exactly (patterns, addressing, element types)\n`;
    context += `4. **Generate valid XML** that opens in Machine Expert Basic without errors\n\n`;
    context += `### Output Requirements:\n`;
    context += `- Complete .smbp XML file structure\n`;
    context += `- All ladder rungs with proper connections (Left, Right, Up, Down)\n`;
    context += `- All symbols defined in SymbolTable\n`;
    context += `- All timers declared in Timers section with <TimerTM> format\n`;
    context += `- Instruction lines (IL) matching the ladder logic\n`;
    context += `- Hardware configuration matching the selected PLC model\n\n`;
    context += `### Critical Patterns:\n`;
    context += `- Timer elements span 2 columns (Column 1-2)\n`;
    context += `- Comparison elements span 2 columns\n`;
    context += `- Copy %IW to %MW before calculations\n`;
    context += `- Use INT_TO_REAL for float precision\n`;
    context += `- First rung must be System Ready with startup timer\n`;
    context += `- Reset HMI floats on %S0/%S1 cold/warm start\n\n`;

    // === SECTION 7: USER ADDITIONS (preserved) ===
    if (combinedContext.includes('## User Context') || combinedContext.includes('## Additional Context')) {
      const userContextMatch = combinedContext.match(/## (User|Additional) Context[\s\S]*/);
      if (userContextMatch) {
        context += userContextMatch[0] + '\n';
      }
    }

    // === FOOTER ===
    context += `---\n`;
    context += `Ready for generation. Click "Generate" to create the PLC program.\n`;

    setCombinedContext(context);
    setSaveStatus('Data fetched - Ready for generation!');
    setTimeout(() => setSaveStatus(null), 2000);
  };

  // Toggle skill selection
  const toggleSkill = (skillId: string) => {
    setSelectedSkills(prev =>
      prev.includes(skillId)
        ? prev.filter(id => id !== skillId)
        : [...prev, skillId]
    );
  };

  // Update prompt content and save to Supabase
  const updatePromptContent = async (promptId: string, newContent: string) => {
    // Update local state immediately
    setPrompts(prev => prev.map(p =>
      p.id === promptId ? { ...p, content: newContent } : p
    ));
  };

  // Save edited prompt to Supabase (creates new if doesn't exist, updates if exists)
  // This ensures edited prompts are available for ALL users in future sessions
  const savePrompt = async (promptId: string) => {
    const prompt = prompts.find(p => p.id === promptId);
    if (!prompt) return;

    setIsSaving(true);
    setSaveStatus('Saving to cloud for all users...');

    try {
      // First try PUT (update existing)
      let response = await fetch('/api/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: promptId,
          name: prompt.name,
          content: prompt.content,
          is_default: prompt.is_default || false,
        }),
      });

      // If PUT fails (prompt doesn't exist in Supabase), create it with POST
      if (!response.ok) {
        console.log('Prompt not in Supabase, creating new entry...');
        response = await fetch('/api/prompts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: promptId, // Keep the same ID for consistency
            name: prompt.name,
            content: prompt.content,
            is_default: prompt.is_default || false,
          }),
        });
      }

      if (response.ok) {
        setSaveStatus('Saved to cloud (available for all users)!');
        setTimeout(() => setSaveStatus(null), 2000);
      } else {
        const errorData = await response.json();
        console.error('Save failed:', errorData);
        if (response.status === 503) {
          setSaveStatus('Cloud save unavailable - using local prompts');
        } else {
          setSaveStatus('Save failed - check console');
        }
      }
    } catch (err) {
      console.error('Failed to save prompt:', err);
      setSaveStatus('Save failed');
    } finally {
      setIsSaving(false);
      setEditingPromptId(null);
    }
  };

  // Add new prompt
  const addNewPrompt = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Custom Prompt ${prompts.length + 1}`,
          content: 'Describe your PLC logic requirements here...',
          is_default: false,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.prompt) {
          setPrompts(prev => [...prev, data.prompt]);
          setSaveStatus('New prompt added!');
          setTimeout(() => setSaveStatus(null), 2000);
        }
      }
    } catch (err) {
      console.error('Failed to add prompt:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete prompt
  const deletePrompt = async (promptId: string) => {
    if (prompts.length <= 1) return;

    const prompt = prompts.find(p => p.id === promptId);
    if (prompt?.is_default) {
      setError('Cannot delete default prompts');
      return;
    }

    try {
      const response = await fetch(`/api/prompts?id=${promptId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPrompts(prev => prev.filter(p => p.id !== promptId));
        if (selectedPromptId === promptId) {
          setSelectedPromptId(null);
        }
        setSaveStatus('Prompt deleted');
        setTimeout(() => setSaveStatus(null), 2000);
      }
    } catch (err) {
      console.error('Failed to delete prompt:', err);
    }
  };

  // Save rules to Supabase
  const saveRules = async () => {
    setIsSaving(true);
    setSaveStatus('Saving rules...');

    try {
      const response = await fetch('/api/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'expert-rules',
          content: rulesText,
        }),
      });

      if (!response.ok) {
        // If PUT fails, try POST
        await fetch('/api/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: 'expert-rules',
            content: rulesText,
          }),
        });
      }

      setSaveStatus('Rules saved!');
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err) {
      console.error('Failed to save rules:', err);
      setSaveStatus('Save failed');
    } finally {
      setIsSaving(false);
      setIsEditingRules(false);
    }
  };

  // Load rules from Supabase
  const loadRules = useCallback(async () => {
    try {
      const response = await fetch('/api/rules');
      const data = await response.json();
      if (data.rules?.content) {
        setRulesText(data.rules.content);
      }
    } catch (err) {
      console.log('Using default rules (no saved rules found)');
    }
  }, []);

  // Send chat message to AI for logic description
  const sendChatMessage = async () => {
    if (!chatInput.trim() && chatImages.length === 0) return;

    const userMessage: ChatMessage = { role: 'user', content: chatInput || '(Attached diagrams for reference)' };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatting(true);

    try {
      const response = await fetch('/api/logic-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatMessages, userMessage],
          plcModel: selectedPLC.model?.name || 'TM221CE24T',
          rules: rulesText,
          // Include uploaded diagrams for AI context
          images: chatImages.map(img => ({
            base64: img.base64,
            name: img.name,
            type: img.type,
          })),
        }),
      });

      const data = await response.json();

      // Handle API errors
      if (!response.ok || data.error) {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: `Error: ${data.error || 'Failed to get AI response. Please check API configuration.'}`
        }]);
        setIsChatting(false);
        return;
      }

      if (data.message) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      }

      // Update running summary (live as conversation progresses)
      if (data.runningSummary) {
        setConversationSummary(data.runningSummary);
      }

      // If AI has gathered enough info, it returns the final logic
      if (data.finalLogic) {
        setFinalLogicFromChat(data.finalLogic);
        // Also update the summary with final logic
        setConversationSummary(data.finalLogic);
        setSaveStatus('Logic requirements captured!');
        setTimeout(() => setSaveStatus(null), 2000);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setIsChatting(false);
    }
  };

  // Handle chat image upload (diagrams, P&ID, control logic)
  const handleChatImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setChatImages(prev => [...prev, {
          id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          base64,
          name: file.name,
          type: file.type,
        }]);
      };
      reader.readAsDataURL(file);
    });
    // Reset input
    e.target.value = '';
  };

  // Remove uploaded chat image
  const removeChatImage = (id: string) => {
    setChatImages(prev => prev.filter(img => img.id !== id));
  };

  // Start new chat session
  const startNewChat = () => {
    setChatMessages([{
      role: 'assistant',
      content: `Hello! I'm here to help you describe your PLC program logic. Tell me what you want to automate, and I'll ask clarifying questions to make sure I understand your requirements completely.

You can also upload diagrams (hand-drawn, P&ID, control logic) using the upload button to help me understand your requirements better.

For example, you could say:
- "I need to control a pump based on tank level"
- "I want to create a motor start/stop circuit with safety interlocks"
- "I need a sequential process for filling and emptying a tank"

What would you like to create?`
    }]);
    setFinalLogicFromChat('');
    setConversationSummary(''); // Reset summary
    setChatImages([]); // Clear uploaded images
    setLogicMode('chat');
  };

  // Use chat logic for generation
  const useChatLogic = () => {
    if (finalLogicFromChat) {
      // Create a temporary prompt with the chat logic
      setPrompts(prev => {
        const customLogic = {
          id: 'custom-chat-logic',
          name: 'Custom Logic (from Chat)',
          content: finalLogicFromChat,
          is_default: false,
        };
        const filtered = prev.filter(p => p.id !== 'custom-chat-logic');
        return [customLogic, ...filtered];
      });
      setSelectedPromptId('custom-chat-logic');
      // Update the conversation summary with the final logic
      setConversationSummary(finalLogicFromChat);
      // DON'T switch to template mode - stay in chat mode so user can see the update
      // setLogicMode('template'); // REMOVED - user stays in current view
      setSaveStatus('Logic captured! Click "Fetch Data" to include in Combined Context.');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  // Load rules on mount
  useEffect(() => {
    loadRules();
  }, [loadRules]);

  // Update available expansion modules when series changes
  useEffect(() => {
    if (selectedPLC.series) {
      const modules = getExpansionModules(selectedPLC.series.id);
      setAvailableModules(modules);
    } else {
      setAvailableModules([]);
      setSelectedModules([]);
    }
  }, [selectedPLC.series]);

  // Toggle expansion module selection
  const toggleModule = (module: ExpansionModule) => {
    setSelectedModules(prev => {
      const exists = prev.find(m => m.id === module.id);
      if (exists) {
        return prev.filter(m => m.id !== module.id);
      } else {
        // Max 7 expansion modules for M221
        if (prev.length >= 7) {
          return prev;
        }
        return [...prev, module];
      }
    });
  };

  // Handle generation
  const handleGenerate = async () => {
    // Pre-validation on frontend
    if (!selectedPLC.model) {
      // Show popup asking user to select PLC
      setError('PLC Model Required: Please select a Schneider M221 controller from Step 1 before generating.');
      // Scroll to model selection
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!combinedContext.trim()) {
      setError('Please click "Fetch Data" to combine your selections, or add context manually');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Use reliable endpoint for Schneider M221, otherwise use AI endpoint
      const isSchneider = selectedPLC.manufacturer?.name?.toLowerCase().includes('schneider');
      const endpoint = useReliableMode && isSchneider ? '/api/generate-plc-reliable' : '/api/generate-plc';

      console.log(`Using ${useReliableMode && isSchneider ? 'RELIABLE' : 'AI'} generation endpoint`);

      // Get the selected prompt content to pass to the API
      const selectedPrompt = prompts.find(p => p.id === selectedPromptId);

      // DEBUG: Log the selected prompt details
      console.log('DEBUG - selectedPromptId:', selectedPromptId);
      console.log('DEBUG - selectedPrompt found:', selectedPrompt ? 'YES' : 'NO');
      if (selectedPrompt) {
        console.log('DEBUG - prompt name:', selectedPrompt.name);
        console.log('DEBUG - prompt content (first 200 chars):', selectedPrompt.content?.substring(0, 200));
      }
      console.log('DEBUG - all prompts count:', prompts.length);
      console.log('DEBUG - prompts IDs:', prompts.map(p => p.id).join(', '));

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: combinedContext,
          modelId: selectedPLC.model.id,
          manufacturer: selectedPLC.manufacturer?.name || '',
          series: selectedPLC.series?.name || '',
          modelName: selectedPLC.model.name,
          template: selectedTemplate,
          skills: selectedSkills,
          expansionModules: selectedModules.map(m => ({
            id: m.id,
            name: m.name,
            partNumber: m.partNumber,
            category: m.category,
            specifications: m.specifications,
          })),
          useAI: true, // Always use AI for hybrid mode (template + AI-generated rungs)
          userPrompt: selectedPrompt?.content || '', // Pass selected prompt content
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error for PLC not selected (popup trigger)
        if (data.error === 'PLC_NOT_SELECTED' && data.showPopup) {
          setError(`${data.message}\n\n${data.details}`);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        throw new Error(data.details || data.error || 'Generation failed');
      }

      setGeneratedFile(data);

      // Save generated file to Supabase
      try {
        await fetch('/api/generated-files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: data.filename,
            content: data.content,
            extension: data.extension,
            manufacturer: selectedPLC.manufacturer?.name || '',
            model: selectedPLC.model.name,
            context_used: combinedContext,
            ai_generated: data.aiGenerated || true,
            tokens_used: data.tokensUsed || 0,
          }),
        });
        // Reload files history
        loadGeneratedFiles();
      } catch (saveErr) {
        console.error('Failed to save generated file:', saveErr);
      }

    } catch (err) {
      console.error('Error generating PLC program:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate PLC program';
      setError(errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle download
  const handleDownload = () => {
    if (!generatedFile) return;

    // Clean up content and ensure proper XML start
    let content = generatedFile.content;
    // Strip existing BOM if present
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }
    // Strip any leading whitespace before <?xml
    content = content.replace(/^\s*(<\?xml)/, '$1');

    // Add UTF-8 BOM - Machine Expert Basic REQUIRES it
    const BOM = '\uFEFF';
    content = BOM + content;

    const blob = new Blob([content], { type: 'application/xml; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = generatedFile.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle PDF documentation download (M221 only) - Uses AI for comprehensive analysis
  const handleDownloadPDF = async () => {
    if (!generatedFile) return;

    // Only generate PDF for M221 .smbp files
    if (!generatedFile.filename.endsWith('.smbp')) return;

    setIsGeneratingPDF(true);
    setError(null);

    try {
      await downloadAIPDFDocument(generatedFile.content, generatedFile.filename);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate AI-powered PDF documentation';
      setError(errorMsg);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Handle error screenshot upload
  const handleErrorScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setErrorScreenshot(base64);
    };
    reader.readAsDataURL(file);
  };

  // Handle error program file (.smbp) upload for rectification
  const handleErrorProgramUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setErrorProgramFile({ content, name: file.name });
    };
    reader.readAsText(file);
  };

  // Analyze error with AI
  const analyzeError = async () => {
    if (!errorMessage && !errorScreenshot) {
      setError('Please provide an error message or upload a screenshot');
      return;
    }

    // Get program code from uploaded file or generated file
    const programCode = errorProgramFile?.content || generatedFile?.content || '';

    if (!programCode) {
      setError('Please upload the .smbp file that has the error, so AI can fix it and generate a corrected file.');
      return;
    }

    setIsAnalyzingError(true);
    setErrorAnalysis(null);

    try {
      const response = await fetch('/api/rectify-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programCode: programCode,
          platform: 'schneider',
          errorScreenshot: errorScreenshot,
          errorMessage: errorMessage,
          plcModel: selectedPLC.model?.name || 'TM221CE24T',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze error');
      }

      const data = await response.json();
      setErrorAnalysis(data);
    } catch (err) {
      setError('Failed to analyze error. Please try again.');
      console.error(err);
    } finally {
      setIsAnalyzingError(false);
    }
  };

  // Clear error analysis
  const clearErrorAnalysis = () => {
    setErrorScreenshot(null);
    setErrorMessage('');
    setErrorProgramFile(null);
    setErrorAnalysis(null);
  };

  // Download corrected file from error rectification
  const downloadCorrectedFile = () => {
    if (!errorAnalysis?.correctedCode) return;

    // Clean up content
    let content = errorAnalysis.correctedCode;
    // Strip existing BOM if present
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }
    // Strip any leading whitespace before <?xml
    content = content.replace(/^\s*(<\?xml)/, '$1');

    // Add UTF-8 BOM - Machine Expert Basic REQUIRES it
    const BOM = '\uFEFF';
    content = BOM + content;

    const blob = new Blob([content], { type: 'application/xml; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = errorAnalysis.correctedFileName || `corrected_${Date.now()}.smbp`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="py-8 px-4 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading generator...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 px-4 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            PLC Program Generator
          </h1>
          <p className="text-gray-600">
            Configure, customize, and generate production-ready PLC programs
          </p>
          {saveStatus && (
            <div className="mt-2 text-sm text-green-600 bg-green-50 inline-block px-3 py-1 rounded">
              {saveStatus}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Selection */}
          <div className="lg:col-span-1 space-y-4">
            {/* Model Selection */}
            <div className={`bg-white rounded-lg shadow p-4 ${!selectedPLC.model ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`}>
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <span className={`w-6 h-6 text-white rounded-full text-sm flex items-center justify-center mr-2 ${selectedPLC.model ? 'bg-green-600' : 'bg-amber-500'}`}>1</span>
                Model / Sub Model
                {!selectedPLC.model && (
                  <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Required</span>
                )}
                {selectedPLC.model && (
                  <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Selected</span>
                )}
              </h2>
              <PLCCascadingSelector
                onSelectionChange={setSelectedPLC}
                defaultManufacturerId={savedPLCIds.manufacturerId || undefined}
                defaultSeriesId={savedPLCIds.seriesId || undefined}
                defaultModelId={savedPLCIds.modelId || undefined}
              />
              {!selectedPLC.model && (
                <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                  Please select a PLC model to enable generation.
                </div>
              )}
              {selectedPLC.model && (
                <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                  <strong>Selected:</strong> {selectedPLC.manufacturer?.name} {selectedPLC.series?.name} - {selectedPLC.model.name}
                </div>
              )}
            </div>

            {/* Expansion Modules Selection - Only show for Schneider M221/M241/M251 */}
            {selectedPLC.series && ['m221', 'm241', 'm251'].includes(selectedPLC.series.id) && (
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="w-6 h-6 bg-teal-600 text-white rounded-full text-sm flex items-center justify-center mr-2">+</span>
                  TM3 Expansion Modules
                  {selectedModules.length > 0 && (
                    <span className="ml-2 text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">
                      {selectedModules.length} selected
                    </span>
                  )}
                </h2>
                <p className="text-xs text-gray-500 mb-3">
                  Optional: Add expansion modules for additional I/O (max 7 modules)
                </p>

                {/* Module Categories */}
                <div className="space-y-3">
                  {/* Analog Input */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-700 mb-1">Analog Input</h4>
                    <div className="flex flex-wrap gap-1">
                      {availableModules.filter(m => m.category === 'analog-input').map(module => (
                        <button
                          key={module.id}
                          onClick={() => toggleModule(module)}
                          className={`text-xs px-2 py-1 rounded border transition-colors ${
                            selectedModules.find(m => m.id === module.id)
                              ? 'bg-teal-500 text-white border-teal-500'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-teal-400'
                          }`}
                          title={Object.entries(module.specifications).map(([k, v]) => `${k}: ${v}`).join(', ')}
                        >
                          {module.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Temperature Input (RTD/TC) */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-700 mb-1">Temperature (RTD/Thermocouple)</h4>
                    <div className="flex flex-wrap gap-1">
                      {availableModules.filter(m => m.category === 'temperature').map(module => (
                        <button
                          key={module.id}
                          onClick={() => toggleModule(module)}
                          className={`text-xs px-2 py-1 rounded border transition-colors ${
                            selectedModules.find(m => m.id === module.id)
                              ? 'bg-teal-500 text-white border-teal-500'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-teal-400'
                          }`}
                          title={Object.entries(module.specifications).map(([k, v]) => `${k}: ${v}`).join(', ')}
                        >
                          {module.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Digital I/O */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-700 mb-1">Digital I/O</h4>
                    <div className="flex flex-wrap gap-1">
                      {availableModules.filter(m => ['digital-input', 'digital-output', 'digital-mixed', 'relay'].includes(m.category)).map(module => (
                        <button
                          key={module.id}
                          onClick={() => toggleModule(module)}
                          className={`text-xs px-2 py-1 rounded border transition-colors ${
                            selectedModules.find(m => m.id === module.id)
                              ? 'bg-teal-500 text-white border-teal-500'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-teal-400'
                          }`}
                          title={Object.entries(module.specifications).map(([k, v]) => `${k}: ${v}`).join(', ')}
                        >
                          {module.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Analog Output/Mixed */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-700 mb-1">Analog Output / Mixed</h4>
                    <div className="flex flex-wrap gap-1">
                      {availableModules.filter(m => ['analog-output', 'analog-mixed'].includes(m.category)).map(module => (
                        <button
                          key={module.id}
                          onClick={() => toggleModule(module)}
                          className={`text-xs px-2 py-1 rounded border transition-colors ${
                            selectedModules.find(m => m.id === module.id)
                              ? 'bg-teal-500 text-white border-teal-500'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-teal-400'
                          }`}
                          title={Object.entries(module.specifications).map(([k, v]) => `${k}: ${v}`).join(', ')}
                        >
                          {module.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Selected Modules Summary */}
                {selectedModules.length > 0 && (
                  <div className="mt-3 p-2 bg-teal-50 border border-teal-200 rounded">
                    <div className="text-xs font-medium text-teal-800 mb-1">Selected Modules:</div>
                    <div className="flex flex-wrap gap-1">
                      {selectedModules.map((module, index) => (
                        <span
                          key={module.id}
                          className="inline-flex items-center text-xs bg-teal-100 text-teal-800 px-2 py-0.5 rounded"
                        >
                          Slot {index + 1}: {module.name}
                          <button
                            onClick={() => toggleModule(module)}
                            className="ml-1 text-teal-600 hover:text-teal-800"
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Template Selection */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full text-sm flex items-center justify-center mr-2">2</span>
                Use this Template
              </h2>
              <div className="space-y-2">
                {TEMPLATES.map(template => (
                  <label key={template.id} className="flex items-start p-2 rounded hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="template"
                      value={template.id}
                      checked={selectedTemplate === template.id}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{template.name}</div>
                      <div className="text-xs text-gray-500 truncate">{template.path}</div>
                    </div>
                  </label>
                ))}
              </div>
              {selectedTemplate && (
                <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-800">
                  <strong>Path:</strong> {TEMPLATES.find(t => t.id === selectedTemplate)?.path}
                </div>
              )}
            </div>

            {/* Skills Selection */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full text-sm flex items-center justify-center mr-2">3</span>
                Skills to be used
              </h2>
              <div className="space-y-2">
                {SKILLS.map(skill => (
                  <label key={skill.id} className="flex items-start p-2 rounded hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSkills.includes(skill.id)}
                      onChange={() => toggleSkill(skill.id)}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{skill.name}</div>
                      <div className="text-xs text-gray-500">{skill.file}</div>
                    </div>
                  </label>
                ))}
              </div>
              {selectedSkills.length > 0 && (
                <div className="mt-3 p-2 bg-green-50 rounded text-xs text-green-800">
                  <strong>Selected:</strong> {selectedSkills.map(id => SKILLS.find(s => s.id === id)?.name).join(', ')}
                </div>
              )}
            </div>
          </div>

          {/* Middle Column - Rules, Logic & Context */}
          <div className="lg:col-span-1 space-y-4">
            {/* RULES SECTION - Hidden from UI but still included in combined context */}
            <div className="hidden">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center justify-between">
                <span className="flex items-center">
                  <span className="w-6 h-6 bg-orange-600 text-white rounded-full text-sm flex items-center justify-center mr-2">4</span>
                  Rules to be Used
                </span>
                <button
                  onClick={() => {
                    if (isEditingRules) {
                      saveRules();
                    } else {
                      setIsEditingRules(true);
                    }
                  }}
                  disabled={isSaving}
                  className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
                >
                  {isEditingRules ? 'Save Rules' : 'Edit Rules'}
                </button>
              </h2>
              <p className="text-xs text-gray-500 mb-2">
                Expert rules for PLC generation. These rules guide the AI in creating valid programs.
              </p>

              {/* Expansion Module Rule - Auto-generated when modules are selected */}
              {expansionModuleRule && (
                <div className="mb-3 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-teal-800 flex items-center">
                      <span className="material-icons text-sm mr-1">memory</span>
                      Expansion Module Rule (Auto-generated)
                    </h3>
                    <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded">
                      {selectedModules.length} module{selectedModules.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="text-xs text-teal-700 whitespace-pre-wrap font-mono max-h-40 overflow-y-auto bg-white p-2 rounded border border-teal-100">
                    {expansionModuleRule}
                  </div>
                  <p className="text-xs text-teal-600 mt-2 italic">
                    This rule is automatically generated based on your selected expansion modules and will be included in the program generation.
                  </p>
                </div>
              )}

              {isEditingRules ? (
                <textarea
                  value={rulesText}
                  onChange={(e) => setRulesText(e.target.value)}
                  className="w-full h-48 text-xs p-2 border rounded resize-none font-mono"
                  placeholder="Enter expert rules..."
                />
              ) : (
                <div className="text-xs text-gray-600 whitespace-pre-wrap bg-orange-50 p-2 rounded max-h-48 overflow-y-auto font-mono">
                  {rulesText.substring(0, 500)}...
                  <button
                    onClick={() => setIsEditingRules(true)}
                    className="block mt-2 text-orange-600 hover:underline"
                  >
                    View/Edit Full Rules
                  </button>
                </div>
              )}
            </div>

            {/* LOGIC SECTION - Standard templates OR Custom Chat */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center justify-between">
                <span className="flex items-center">
                  <span className="w-6 h-6 bg-purple-600 text-white rounded-full text-sm flex items-center justify-center mr-2">4</span>
                  Logic to be Used
                </span>
              </h2>

              {/* Mode Toggle */}
              <div className="flex mb-3 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setLogicMode('template')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    logicMode === 'template'
                      ? 'bg-white text-purple-700 shadow'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Standard Templates
                </button>
                <button
                  onClick={() => {
                    if (chatMessages.length === 0) startNewChat();
                    setLogicMode('chat');
                    // Clear template selection when switching to AI mode
                    setSelectedPromptId(null);
                  }}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    logicMode === 'chat'
                      ? 'bg-white text-purple-700 shadow'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Describe with AI
                </button>
              </div>

              {/* Standard Templates - Always visible but disabled when in chat mode */}
              <div className={`${logicMode === 'chat' ? 'opacity-50 pointer-events-none' : ''}`}>
                {logicMode === 'template' && (
                  <div className="flex justify-between mb-2">
                    <button
                      onClick={() => setSelectedPromptId(null)}
                      disabled={!selectedPromptId}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50"
                    >
                      Clear Selection
                    </button>
                    <button
                      onClick={addNewPrompt}
                      disabled={isSaving}
                      className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                    >
                      + Add New
                    </button>
                  </div>
                )}
                {logicMode === 'chat' && (
                  <div className="mb-2 p-2 bg-gray-100 border border-gray-300 rounded text-xs text-gray-500">
                    Templates disabled. Using AI conversation for logic description.
                  </div>
                )}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {prompts.map((prompt, index) => (
                    <div
                      key={prompt.id}
                      className={`border rounded p-2 cursor-pointer transition-colors ${
                        selectedPromptId === prompt.id && logicMode === 'template'
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${logicMode === 'chat' ? 'cursor-not-allowed bg-gray-50' : ''}`}
                      onClick={() => {
                        if (logicMode === 'template') {
                          // Toggle selection - click same to unselect
                          setSelectedPromptId(selectedPromptId === prompt.id ? null : prompt.id);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center flex-1">
                          <div className={`w-4 h-4 mr-2 rounded-full border-2 flex items-center justify-center ${
                            selectedPromptId === prompt.id && logicMode === 'template'
                              ? 'border-purple-500 bg-purple-500'
                              : 'border-gray-300'
                          }`}>
                            {selectedPromptId === prompt.id && logicMode === 'template' && (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            )}
                          </div>
                          <span className="font-medium text-sm">{index + 1}. {prompt.name}</span>
                          {prompt.is_default && (
                            <span className="ml-1 text-xs bg-gray-200 text-gray-600 px-1 rounded">default</span>
                          )}
                        </div>
                        {logicMode === 'template' && (
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                if (editingPromptId === prompt.id) {
                                  savePrompt(prompt.id);
                                } else {
                                  setEditingPromptId(prompt.id);
                                }
                              }}
                              disabled={isSaving}
                              className="text-xs px-2 py-1 text-purple-600 hover:bg-purple-100 rounded"
                            >
                              {editingPromptId === prompt.id ? 'Save' : 'Edit'}
                            </button>
                            {!prompt.is_default && (
                              <button
                                onClick={() => deletePrompt(prompt.id)}
                                className="text-xs px-2 py-1 text-red-600 hover:bg-red-100 rounded"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      {editingPromptId === prompt.id && logicMode === 'template' && (
                        <textarea
                          value={prompt.content}
                          onChange={(e) => updatePromptContent(prompt.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-2 w-full h-32 text-xs p-2 border rounded resize-none"
                        />
                      )}
                      {selectedPromptId === prompt.id && editingPromptId !== prompt.id && logicMode === 'template' && (
                        <div className="mt-2 text-xs text-gray-600 whitespace-pre-wrap bg-gray-50 p-2 rounded max-h-32 overflow-y-auto">
                          {prompt.content}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Chat for Custom Logic - shown when in chat mode */}
              {logicMode === 'chat' && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">
                    Describe what you want to automate. The AI will ask clarifying questions to understand your requirements.
                  </p>

                  {/* Chat Messages - Large area for AI conversation */}
                  <div className="h-96 overflow-y-auto border rounded-lg p-3 bg-gray-50 space-y-3">
                    {chatMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded-lg text-sm ${
                          msg.role === 'user'
                            ? 'bg-purple-100 text-purple-900 ml-4'
                            : 'bg-white text-gray-800 mr-4 shadow-sm'
                        }`}
                      >
                        <div className="text-xs text-gray-500 mb-1">
                          {msg.role === 'user' ? 'You' : 'AI Assistant'}
                        </div>
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    ))}
                    {isChatting && (
                      <div className="p-2 bg-white rounded-lg shadow-sm mr-4">
                        <div className="flex items-center space-x-2">
                          <div className="animate-pulse w-2 h-2 bg-purple-500 rounded-full"></div>
                          <div className="animate-pulse w-2 h-2 bg-purple-500 rounded-full delay-100"></div>
                          <div className="animate-pulse w-2 h-2 bg-purple-500 rounded-full delay-200"></div>
                          <span className="text-xs text-gray-500">AI is thinking...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Uploaded Images Preview */}
                  {chatImages.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                      {chatImages.map(img => (
                        <div key={img.id} className="relative group">
                          <img
                            src={img.base64}
                            alt={img.name}
                            className="h-16 w-16 object-cover rounded border border-gray-300"
                          />
                          <button
                            onClick={() => removeChatImage(img.id)}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            x
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-[8px] px-1 truncate rounded-b">
                            {img.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Chat Input with Upload Button */}
                  <div className="flex gap-2">
                    {/* Upload Button */}
                    <label className="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg cursor-pointer transition-colors" title="Upload diagrams (P&ID, hand-drawn, control logic)">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleChatImageUpload}
                        className="hidden"
                        disabled={isChatting}
                      />
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </label>
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                      placeholder="Describe your automation needs..."
                      className="flex-1 px-3 py-2 border rounded-lg text-sm"
                      disabled={isChatting}
                    />
                    <button
                      onClick={sendChatMessage}
                      disabled={isChatting || (!chatInput.trim() && chatImages.length === 0)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Upload P&ID diagrams, hand-drawn plans, or control logic images for better context.
                  </p>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={startNewChat}
                      className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
                    >
                      Start Over
                    </button>
                    {finalLogicFromChat && (
                      <button
                        onClick={useChatLogic}
                        className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                      >
                        Use This Logic
                      </button>
                    )}
                  </div>

                  {/* Live Conversation Summary - Updates as user chats */}
                  <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-medium text-blue-800">Live Logic Summary (Editable)</div>
                      {conversationSummary && (
                        <span className="text-xs text-blue-600 px-1 py-0.5 bg-blue-100 rounded">Auto-updated</span>
                      )}
                    </div>
                    <textarea
                      value={conversationSummary}
                      onChange={(e) => setConversationSummary(e.target.value)}
                      className="w-full h-32 text-xs p-2 border border-blue-200 rounded resize-none bg-white"
                      placeholder="As you chat with AI, a summary of your requirements will appear here. You can edit this summary before clicking Fetch Data."
                    />
                    <p className="text-xs text-blue-600 mt-1">
                      This summary will be included in Combined Context when you click Fetch Data (if no template is selected).
                    </p>
                  </div>

                  {/* Show captured logic */}
                  {finalLogicFromChat && (
                    <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
                      <div className="text-xs font-medium text-green-800 mb-1">Final Captured Logic:</div>
                      <div className="text-xs text-green-700 whitespace-pre-wrap max-h-24 overflow-y-auto">
                        {finalLogicFromChat}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Fetch Data Button */}
            <button
              onClick={fetchData}
              disabled={!selectedPLC.model && !selectedTemplate && selectedSkills.length === 0 && !selectedPromptId && !conversationSummary}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-lg font-semibold hover:from-indigo-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Fetch Data
            </button>

            {/* Combined Context (Editable) */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <span className="w-6 h-6 bg-green-600 text-white rounded-full text-sm flex items-center justify-center mr-2">6</span>
                Combined Context (Editable)
              </h2>
              <p className="text-xs text-gray-500 mb-2">Click &quot;Fetch Data&quot; to combine selections. Edit to add more context.</p>
              <textarea
                value={combinedContext}
                onChange={(e) => setCombinedContext(e.target.value)}
                className="w-full h-64 text-sm p-3 border border-gray-300 rounded-lg resize-none font-mono"
                placeholder="Click 'Fetch Data' button above to combine your selections here. You can then edit to add more context..."
              />
            </div>

            {/* Generation Mode Toggle */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-gray-900">Reliable Mode</label>
                  <p className="text-xs text-gray-500">Uses deterministic generator (no AI errors)</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useReliableMode}
                    onChange={(e) => setUseReliableMode(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
              {useReliableMode && (
                <div className="mt-2 text-xs text-green-700 bg-green-50 p-2 rounded">
                  Reliable mode uses pre-tested XML patterns. Files are guaranteed to open in Machine Expert Basic.
                </div>
              )}
              {!useReliableMode && (
                <div className="mt-2 text-xs text-amber-700 bg-amber-50 p-2 rounded">
                  AI mode may produce invalid files. Use for custom/complex logic only.
                </div>
              )}
            </div>

            {/* Warning when Generate is disabled */}
            {(!selectedPLC.model || !combinedContext.trim()) && (
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 mb-2">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-amber-800">Cannot Generate Yet</p>
                    <ul className="text-xs text-amber-700 mt-1 space-y-1">
                      {!selectedPLC.model && (
                        <li className="flex items-center">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-2"></span>
                          Select a PLC Model in Step 1 (scroll up)
                        </li>
                      )}
                      {!combinedContext.trim() && (
                        <li className="flex items-center">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-2"></span>
                          Click &quot;Fetch Data&quot; to build the context
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Run Button */}
            <button
              onClick={handleGenerate}
              disabled={!selectedPLC.model || !combinedContext.trim() || isGenerating}
              className={`w-full py-4 rounded-lg font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center ${
                useReliableMode
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
              }`}
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Running AI...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {useReliableMode ? 'Generate (Reliable)' : 'Run AI'}
                </>
              )}
            </button>
          </div>

          {/* Right Column - Output */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-lg shadow p-4 min-h-[400px]">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <span className="w-6 h-6 bg-purple-600 text-white rounded-full text-sm flex items-center justify-center mr-2">6</span>
                Output File
              </h2>

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <h3 className="font-semibold text-red-900 text-sm">Error</h3>
                  <p className="text-xs text-red-700 mt-1">{error}</p>
                  <button onClick={() => setError(null)} className="mt-2 text-xs text-red-600 underline">
                    Dismiss
                  </button>
                </div>
              )}

              {generatedFile ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <h3 className="font-semibold text-green-900 text-sm flex items-center">
                      {generatedFile.aiGenerated ? (
                        <>
                          <svg className="w-4 h-4 mr-1 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          AI Generated!
                        </>
                      ) : 'Program Generated!'}
                    </h3>
                    <p className="text-xs text-green-700 mt-1"><strong>File:</strong> {generatedFile.filename}</p>
                    <p className="text-xs text-green-700"><strong>Format:</strong> {generatedFile.extension}</p>
                    {generatedFile.tokensUsed && (
                      <p className="text-xs text-green-600 mt-1"><strong>Tokens:</strong> {generatedFile.tokensUsed}</p>
                    )}
                  </div>

                  <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <h4 className="font-semibold text-gray-900 text-sm mb-2">Preview</h4>
                    <pre className="text-xs text-gray-700 overflow-x-auto max-h-60 overflow-y-auto whitespace-pre-wrap font-mono bg-white p-2 rounded border">
                      {generatedFile.content.substring(0, 2000)}
                      {generatedFile.content.length > 2000 && '\n\n... (truncated)'}
                    </pre>
                  </div>

                  <button onClick={handleDownload} className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-md flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download {generatedFile.extension}
                  </button>

                  {/* PDF Documentation Download - M221 only (AI-Powered) */}
                  {generatedFile.filename.endsWith('.smbp') && (
                    <button
                      onClick={handleDownloadPDF}
                      disabled={isGeneratingPDF}
                      className={`w-full py-3 rounded-lg font-semibold transition-colors shadow-md flex items-center justify-center ${
                        isGeneratingPDF
                          ? 'bg-blue-400 text-white cursor-wait'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {isGeneratingPDF ? (
                        <>
                          <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Generating AI Documentation...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Download PDF Documentation (AI)
                        </>
                      )}
                    </button>
                  )}

                  {/* Test Program Logic Section */}
                  {generatedFile.filename.endsWith('.smbp') && (
                    <TestProgramSection smbpContent={generatedFile.content} />
                  )}

                  <button onClick={() => setGeneratedFile(null)} className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-300 transition-colors">
                    Generate Another
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500">Output file will appear here</p>
                </div>
              )}
            </div>

            {/* Generated Files History */}
            {generatedFiles.length > 0 && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold text-gray-900 text-sm mb-3">Recent Files (Cloud)</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {generatedFiles.map((file, idx) => (
                    <div key={file.id || idx} className="text-xs p-2 bg-gray-50 rounded border border-gray-200 flex justify-between items-center">
                      <div>
                        <div className="font-medium text-gray-900">{file.filename}</div>
                        <div className="text-gray-500">{file.manufacturer} - {file.model}</div>
                      </div>
                      <button
                        onClick={() => setGeneratedFile(file)}
                        className="text-blue-600 hover:underline"
                      >
                        View
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Save/Clear Selections */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <span className="w-6 h-6 bg-purple-600 text-white rounded-full text-sm flex items-center justify-center mr-2">6</span>
                Save Selections
              </h2>
              <p className="text-xs text-gray-500 mb-3">
                Your selections are automatically saved. Use Save to confirm, or Clear to reset all choices.
              </p>

              {/* Status message */}
              {configSaveStatus && (
                <div className={`mb-3 p-2 rounded text-sm text-center ${
                  configSaveStatus.includes('saved') || configSaveStatus.includes('cleared')
                    ? 'bg-green-100 text-green-800'
                    : configSaveStatus.includes('Failed')
                    ? 'bg-red-100 text-red-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {configSaveStatus}
                </div>
              )}

              {/* Auto-save indicator */}
              <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Auto-save enabled - your selections are automatically saved
              </div>

              <div className="flex gap-2">
                <button
                  onClick={saveConfig}
                  className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition-colors flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Save All Selections
                </button>
                <button
                  onClick={clearConfig}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-300 transition-colors flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear All
                </button>
              </div>

              <p className="text-xs text-gray-400 mt-2 text-center">
                Saved selections persist after page reload until you click Clear
              </p>
            </div>

            {/* Quick Tips */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 text-sm mb-2">Quick Tips</h3>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>1. Click "Save All Selections" to keep your choices</li>
                <li>2. Selections persist after page reload</li>
                <li>3. Use "Clear All" to reset to defaults</li>
                <li>4. Generated files are stored in history</li>
              </ul>
            </div>

            {/* Error Rectification Section */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <span className="w-6 h-6 bg-red-600 text-white rounded-full text-sm flex items-center justify-center mr-2">7</span>
                Error Rectification
              </h2>
              <p className="text-xs text-gray-500 mb-3">
                Upload the .smbp file with the error and a screenshot. AI will fix it and generate a corrected file.
              </p>

              {/* Error Program File Upload - REQUIRED */}
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <label className="block text-xs font-semibold text-amber-800 mb-1">
                    Upload .smbp File to Fix (Required)
                  </label>
                  <input
                    type="file"
                    accept=".smbp,.xml"
                    onChange={handleErrorProgramUpload}
                    className="w-full text-xs border border-amber-300 rounded-lg p-2 bg-white"
                  />
                  {errorProgramFile && (
                    <div className="mt-2 flex items-center justify-between bg-amber-100 p-2 rounded">
                      <span className="text-xs text-amber-900 font-medium">{errorProgramFile.name}</span>
                      <button
                        onClick={() => setErrorProgramFile(null)}
                        className="text-amber-700 hover:text-amber-900 text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-amber-600 mt-1">
                    Upload the program file that has errors so AI can fix it.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Upload Error Screenshot (Optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleErrorScreenshotUpload}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2"
                  />
                  {errorScreenshot && (
                    <div className="mt-2 relative">
                      <img
                        src={errorScreenshot}
                        alt="Error screenshot"
                        className="max-h-40 rounded border border-gray-200"
                      />
                      <button
                        onClick={() => setErrorScreenshot(null)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        X
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Error Message (Optional)
                  </label>
                  <textarea
                    value={errorMessage}
                    onChange={(e) => setErrorMessage(e.target.value)}
                    placeholder="Describe the error or paste the error message here..."
                    className="w-full h-20 text-xs p-2 border border-gray-300 rounded-lg resize-none"
                  />
                </div>

                <button
                  onClick={analyzeError}
                  disabled={isAnalyzingError || !errorProgramFile || (!errorMessage && !errorScreenshot)}
                  className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isAnalyzingError ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Analyzing and Fixing...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                      </svg>
                      Fix Error and Generate Corrected File
                    </>
                  )}
                </button>
              </div>

              {/* Error Analysis Results */}
              {errorAnalysis && (
                <div className="mt-4 space-y-3">
                  <div className="border-t pt-3">
                    <h4 className="font-semibold text-gray-900 text-sm mb-2">Analysis Result</h4>

                    {/* Error Type and Severity */}
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-red-900 text-sm">{errorAnalysis.analysis.errorType}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          errorAnalysis.analysis.severity === 'critical' ? 'bg-red-600 text-white' :
                          errorAnalysis.analysis.severity === 'high' ? 'bg-red-500 text-white' :
                          errorAnalysis.analysis.severity === 'medium' ? 'bg-yellow-500 text-white' :
                          'bg-green-500 text-white'
                        }`}>
                          {errorAnalysis.analysis.severity.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-red-700">{errorAnalysis.analysis.rootCause}</p>
                      <div className="mt-2">
                        <span className="text-xs text-red-600">Affected: </span>
                        <span className="text-xs text-red-700">{errorAnalysis.analysis.affectedComponents.join(', ')}</span>
                      </div>
                    </div>

                    {/* Download Corrected File - Main Action */}
                    {errorAnalysis.correctedCode ? (
                      <div className="mb-4 p-4 bg-green-100 border-2 border-green-500 rounded-lg">
                        <div className="flex items-center mb-2">
                          <svg className="w-6 h-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <h5 className="font-bold text-green-900">Corrected File Ready!</h5>
                        </div>
                        <p className="text-sm text-green-800 mb-3">
                          AI has automatically fixed the errors. Download the corrected program file below.
                        </p>
                        <button
                          onClick={downloadCorrectedFile}
                          className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-colors flex items-center justify-center"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download Corrected File (.smbp)
                        </button>
                      </div>
                    ) : (
                      <div className="mb-4 p-4 bg-amber-100 border-2 border-amber-400 rounded-lg">
                        <div className="flex items-center mb-2">
                          <svg className="w-6 h-6 text-amber-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <h5 className="font-bold text-amber-900">Corrected File Not Generated</h5>
                        </div>
                        <p className="text-sm text-amber-800 mb-2">
                          AI analyzed the error but could not generate a corrected file. This may happen when:
                        </p>
                        <ul className="text-xs text-amber-700 list-disc list-inside space-y-1">
                          <li>No .smbp file was uploaded for fixing</li>
                          <li>The error screenshot was not clear enough</li>
                          <li>The error requires manual intervention</li>
                        </ul>
                        <p className="text-xs text-amber-800 mt-2 font-medium">
                          Try uploading the .smbp file that has the error along with a clearer screenshot.
                        </p>
                      </div>
                    )}

                    {/* Solutions */}
                    <div className="mb-3">
                      <h5 className="font-medium text-gray-900 text-sm mb-2">Applied Fixes</h5>
                      <div className="space-y-2">
                        {errorAnalysis.solutions.map((solution, idx) => (
                          <div key={idx} className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-green-900 text-xs">{solution.description}</span>
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                {solution.confidence}% confident
                              </span>
                            </div>
                            <p className="text-xs text-green-700">{solution.explanation}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div>
                      <h5 className="font-medium text-gray-900 text-sm mb-2">Recommendations</h5>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {errorAnalysis.recommendations.slice(0, 5).map((rec, idx) => (
                          <li key={idx} className="flex items-start">
                            <span className="text-blue-500 mr-2">*</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      onClick={clearErrorAnalysis}
                      className="mt-3 w-full bg-gray-200 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                    >
                      Clear Analysis
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-xs text-gray-400 text-center py-4 mt-8">
          PLCAutoPilot v1.7 | Last Updated: 2025-12-28 | github.com/chatgptnotes/plcautopilot.com
        </footer>
      </div>
    </div>
  );
}
