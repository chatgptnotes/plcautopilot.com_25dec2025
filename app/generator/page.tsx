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

  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  // Skills state
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  // Prompts state (from Supabase)
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);

  // Combined context state
  const [combinedContext, setCombinedContext] = useState('');

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFile, setGeneratedFile] = useState<GeneratedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useReliableMode, setUseReliableMode] = useState(true); // Reliable mode by default

  // Generated files history
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);

  // Load prompts from API
  const loadPrompts = useCallback(async () => {
    try {
      const response = await fetch('/api/prompts');
      const data = await response.json();
      if (data.prompts && data.prompts.length > 0) {
        setPrompts(data.prompts);
      }
    } catch (err) {
      console.error('Failed to load prompts:', err);
    }
  }, []);

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

  // Initial load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([loadPrompts(), loadConfig(), loadGeneratedFiles()]);
      setIsLoading(false);
    };
    init();
  }, [loadPrompts, loadConfig, loadGeneratedFiles]);

  // Save config when selections change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isLoading) {
        saveConfig();
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [selectedTemplate, selectedSkills, selectedPromptId, combinedContext, isLoading]);

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
  const fetchData = () => {
    let context = '';

    if (selectedPLC.model) {
      context += `## PLC Model\n`;
      context += `Manufacturer: ${selectedPLC.manufacturer?.name}\n`;
      context += `Series: ${selectedPLC.series?.name}\n`;
      context += `Model: ${selectedPLC.model.name}\n`;
      if (selectedPLC.model.partNumber) {
        context += `Part Number: ${selectedPLC.model.partNumber}\n`;
      }
      context += '\n';
    }

    if (selectedTemplate) {
      const template = TEMPLATES.find(t => t.id === selectedTemplate);
      if (template) {
        context += `## Template\n`;
        context += `Name: ${template.name}\n`;
        context += `Path: ${template.path}\n`;
        context += `Description: ${template.description}\n\n`;
      }
    }

    if (selectedSkills.length > 0) {
      context += `## Skills to Apply\n`;
      selectedSkills.forEach(skillId => {
        const skill = SKILLS.find(s => s.id === skillId);
        if (skill) {
          context += `- ${skill.name}: ${skill.description}\n`;
        }
      });
      context += '\n';
    }

    if (selectedPromptId) {
      const prompt = prompts.find(p => p.id === selectedPromptId);
      if (prompt) {
        context += `## Requirements\n`;
        context += prompt.content + '\n';
      }
    }

    // Append existing user additions if any (preserve user edits)
    if (combinedContext.includes('## User Context')) {
      const userContextMatch = combinedContext.match(/## User Context[\s\S]*/);
      if (userContextMatch) {
        context += '\n' + userContextMatch[0];
      }
    }

    setCombinedContext(context);
    setSaveStatus('Data fetched!');
    setTimeout(() => setSaveStatus(null), 1500);
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

  // Save edited prompt to Supabase
  const savePrompt = async (promptId: string) => {
    const prompt = prompts.find(p => p.id === promptId);
    if (!prompt) return;

    setIsSaving(true);
    setSaveStatus('Saving...');

    try {
      const response = await fetch('/api/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: promptId,
          name: prompt.name,
          content: prompt.content,
        }),
      });

      if (response.ok) {
        setSaveStatus('Saved to cloud!');
        setTimeout(() => setSaveStatus(null), 2000);
      } else {
        setSaveStatus('Save failed');
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

  // Handle generation
  const handleGenerate = async () => {
    if (!selectedPLC.model || !combinedContext.trim()) {
      setError('Please select a PLC model and add context');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Use reliable endpoint for Schneider M221, otherwise use AI endpoint
      const isSchneider = selectedPLC.manufacturer?.name?.toLowerCase().includes('schneider');
      const endpoint = useReliableMode && isSchneider ? '/api/generate-plc-reliable' : '/api/generate-plc';

      console.log(`Using ${useReliableMode && isSchneider ? 'RELIABLE' : 'AI'} generation endpoint`);

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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
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
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full text-sm flex items-center justify-center mr-2">1</span>
                Model / Sub Model
              </h2>
              <PLCCascadingSelector onSelectionChange={setSelectedPLC} />
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

          {/* Middle Column - Prompts & Context */}
          <div className="lg:col-span-1 space-y-4">
            {/* Prompt Selection */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center justify-between">
                <span className="flex items-center">
                  <span className="w-6 h-6 bg-blue-600 text-white rounded-full text-sm flex items-center justify-center mr-2">4</span>
                  Prompt to be used
                </span>
                <button
                  onClick={addNewPrompt}
                  disabled={isSaving}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  + Add New
                </button>
              </h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {prompts.map((prompt, index) => (
                  <div key={prompt.id} className={`border rounded p-2 ${selectedPromptId === prompt.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center cursor-pointer flex-1">
                        <input
                          type="radio"
                          name="prompt"
                          checked={selectedPromptId === prompt.id}
                          onChange={() => setSelectedPromptId(prompt.id)}
                          className="mr-2"
                        />
                        <span className="font-medium text-sm">{index + 1}. {prompt.name}</span>
                        {prompt.is_default && (
                          <span className="ml-1 text-xs bg-gray-200 text-gray-600 px-1 rounded">default</span>
                        )}
                      </label>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            if (editingPromptId === prompt.id) {
                              savePrompt(prompt.id);
                            } else {
                              setEditingPromptId(prompt.id);
                            }
                          }}
                          disabled={isSaving}
                          className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-100 rounded"
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
                    </div>
                    {editingPromptId === prompt.id && (
                      <textarea
                        value={prompt.content}
                        onChange={(e) => updatePromptContent(prompt.id, e.target.value)}
                        className="mt-2 w-full h-32 text-xs p-2 border rounded resize-none"
                      />
                    )}
                    {selectedPromptId === prompt.id && editingPromptId !== prompt.id && (
                      <div className="mt-2 text-xs text-gray-600 whitespace-pre-wrap bg-gray-50 p-2 rounded max-h-32 overflow-y-auto">
                        {prompt.content}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Fetch Data Button */}
            <button
              onClick={fetchData}
              disabled={!selectedPLC.model && !selectedTemplate && selectedSkills.length === 0 && !selectedPromptId}
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
                <span className="w-6 h-6 bg-green-600 text-white rounded-full text-sm flex items-center justify-center mr-2">5</span>
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
          </div>
        </div>

        {/* Footer */}
        <footer className="text-xs text-gray-400 text-center py-4 mt-8">
          PLCAutoPilot v1.6 | Last Updated: 2025-12-27 | github.com/chatgptnotes/plcautopilot.com
        </footer>
      </div>
    </div>
  );
}
