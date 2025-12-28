'use client';

import { useState, useEffect, useCallback } from 'react';
import PLCCascadingSelector from '@/app/components/PLCCascadingSelector';
import type { PLCManufacturer, PLCSeries, PLCModel } from '@/lib/plc-models-database';

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
}

export default function GeneratorPage() {
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

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
  const [isAnalyzingError, setIsAnalyzingError] = useState(false);
  const [errorAnalysis, setErrorAnalysis] = useState<{
    analysis: { errorType: string; severity: string; rootCause: string; affectedComponents: string[] };
    solutions: Array<{ description: string; explanation: string; confidence: number }>;
    recommendations: string[];
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

  // Save config when selections change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isLoading) {
        saveConfig();
      }
    }, 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate, selectedSkills, selectedPromptId, combinedContext, selectedPLC, isLoading]);

  // Save config to API
  const saveConfig = async () => {
    try {
      await fetch('/api/generator-config', {
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
    } catch (err) {
      console.error('Failed to save config:', err);
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
        setSaveStatus('Save failed - check console');
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
      setLogicMode('template');
      setSaveStatus('Chat logic applied!');
      setTimeout(() => setSaveStatus(null), 2000);
    }
  };

  // Load rules on mount
  useEffect(() => {
    loadRules();
  }, [loadRules]);

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

    const blob = new Blob([generatedFile.content], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = generatedFile.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  // Analyze error with AI
  const analyzeError = async () => {
    if (!errorMessage && !errorScreenshot) {
      setError('Please provide an error message or upload a screenshot');
      return;
    }

    setIsAnalyzingError(true);
    setErrorAnalysis(null);

    try {
      const response = await fetch('/api/rectify-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programCode: generatedFile?.content || '',
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
    setErrorAnalysis(null);
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
            {/* RULES SECTION - Editable expert rules */}
            <div className="bg-white rounded-lg shadow p-4">
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
                  <span className="w-6 h-6 bg-purple-600 text-white rounded-full text-sm flex items-center justify-center mr-2">5</span>
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

                  {/* Chat Messages */}
                  <div className="h-48 overflow-y-auto border rounded-lg p-2 bg-gray-50 space-y-2">
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

            {/* Quick Tips */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 text-sm mb-2">Quick Tips</h3>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>1. Your settings are auto-saved to cloud</li>
                <li>2. Edited prompts are saved for all users</li>
                <li>3. Generated files are stored in history</li>
                <li>4. Configuration persists after page reload</li>
              </ul>
            </div>

            {/* Error Rectification Section */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <span className="w-6 h-6 bg-red-600 text-white rounded-full text-sm flex items-center justify-center mr-2">7</span>
                Error Rectification
              </h2>
              <p className="text-xs text-gray-500 mb-3">
                Upload a screenshot of the error from Machine Expert Basic and AI will suggest fixes.
              </p>

              {/* Error Screenshot Upload */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Upload Error Screenshot
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
                    placeholder="Paste the error message here..."
                    className="w-full h-20 text-xs p-2 border border-gray-300 rounded-lg resize-none"
                  />
                </div>

                <button
                  onClick={analyzeError}
                  disabled={isAnalyzingError || (!errorMessage && !errorScreenshot)}
                  className="w-full bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isAnalyzingError ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Analyze Error
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

                    {/* Solutions */}
                    <div className="mb-3">
                      <h5 className="font-medium text-gray-900 text-sm mb-2">Suggested Solutions</h5>
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
