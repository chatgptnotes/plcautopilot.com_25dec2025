'use client';

import { useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';

// All 21 TM221 Models
const TM221_MODELS = {
  'Compact with Ethernet (CE)': [
    { id: 'TM221CE16R', di: 9, do: 7, ai: 0, type: 'Relay' },
    { id: 'TM221CE16T', di: 9, do: 7, ai: 0, type: 'Transistor Sink' },
    { id: 'TM221CE16U', di: 9, do: 7, ai: 0, type: 'Transistor Source' },
    { id: 'TM221CE24R', di: 14, do: 10, ai: 0, type: 'Relay' },
    { id: 'TM221CE24T', di: 14, do: 10, ai: 0, type: 'Transistor Sink' },
    { id: 'TM221CE24U', di: 14, do: 10, ai: 0, type: 'Transistor Source' },
    { id: 'TM221CE40R', di: 24, do: 16, ai: 2, type: 'Relay' },
    { id: 'TM221CE40T', di: 24, do: 16, ai: 2, type: 'Transistor Sink' },
    { id: 'TM221CE40U', di: 24, do: 16, ai: 2, type: 'Transistor Source' },
  ],
  'Compact without Ethernet (C)': [
    { id: 'TM221C16R', di: 9, do: 7, ai: 0, type: 'Relay' },
    { id: 'TM221C16T', di: 9, do: 7, ai: 0, type: 'Transistor Sink' },
    { id: 'TM221C16U', di: 9, do: 7, ai: 0, type: 'Transistor Source' },
    { id: 'TM221C24R', di: 14, do: 10, ai: 0, type: 'Relay' },
    { id: 'TM221C24T', di: 14, do: 10, ai: 0, type: 'Transistor Sink' },
    { id: 'TM221C24U', di: 14, do: 10, ai: 0, type: 'Transistor Source' },
    { id: 'TM221C40R', di: 24, do: 16, ai: 2, type: 'Relay' },
    { id: 'TM221C40T', di: 24, do: 16, ai: 2, type: 'Transistor Sink' },
    { id: 'TM221C40U', di: 24, do: 16, ai: 2, type: 'Transistor Source' },
  ],
  'Book/Modular (M)': [
    { id: 'TM221M16R', di: 8, do: 8, ai: 0, type: 'Relay' },
    { id: 'TM221M16T', di: 8, do: 8, ai: 0, type: 'Transistor Sink' },
    { id: 'TM221M32TK', di: 16, do: 16, ai: 0, type: 'Transistor Sink + CANopen' },
  ],
};

// Templates
const TEMPLATES = [
  {
    id: 'motor',
    name: 'Motor Start/Stop',
    description: 'Motor control with START, STOP, E-Stop',
    logic: `Motor Start/Stop Control:
- START button (%I0.0) - Normally Open
- STOP button (%I0.1) - Normally Closed
- E-Stop (%I0.2) - Normally Closed
- Motor output (%Q0.0)
- Running indicator (%Q0.1)
Include seal-in circuit for latching operation.`,
  },
  {
    id: 'lights',
    name: 'Sequential Lights',
    description: '3 lights with time delays',
    logic: `Sequential Light Control:
- START button (%I0.0)
- STOP button (%I0.1)
- Light 1 (%Q0.0) - ON immediately
- Light 2 (%Q0.1) - ON after 3 seconds
- Light 3 (%Q0.2) - ON after 6 seconds
Use TON timers for delays.`,
  },
  {
    id: 'tank',
    name: 'Tank Level Control',
    description: 'Dual tank with pumps',
    logic: `Dual Tank Level Control:
- Tank 1 Low (%I0.0), Tank 1 High (%I0.1)
- Tank 2 Low (%I0.2), Tank 2 High (%I0.3)
- Pump 1 (%Q0.0) - Fills Tank 1
- Pump 2 (%Q0.1) - Transfers to Tank 2
Hysteresis control with dry-run protection.`,
  },
  {
    id: 'traffic',
    name: 'Traffic Light',
    description: 'Traffic sequence with pedestrian',
    logic: `Traffic Light Controller:
- Pedestrian button (%I0.0)
- RED (%Q0.0) - 30 seconds
- YELLOW (%Q0.1) - 5 seconds
- GREEN (%Q0.2) - 25 seconds
Normal: GREEN->YELLOW->RED cycle.`,
  },
  {
    id: 'conveyor',
    name: 'Conveyor Control',
    description: 'Conveyor with stations',
    logic: `Conveyor Belt Control:
- Start (%I0.0), Stop (%I0.1)
- Sensor 1 (%I0.2), Sensor 2 (%I0.3)
- Motor (%Q0.0)
- Station 1 LED (%Q0.1), Station 2 LED (%Q0.2)
Stop 5 seconds at each station.`,
  },
  {
    id: 'stardelta',
    name: 'Star-Delta Starter',
    description: 'Motor star-delta sequence',
    logic: `Star-Delta Motor Starter:
- START (%I0.0), STOP (%I0.1), Overload (%I0.2)
- Main contactor (%Q0.0)
- Star contactor (%Q0.1)
- Delta contactor (%Q0.2)
Start in STAR 5 sec, then DELTA. Interlock Star/Delta.`,
  },
];

// Skills/Patterns
const SKILLS = [
  { id: 'motorStartStop', name: 'Motor Start/Stop', desc: 'Latching motor control' },
  { id: 'timer', name: 'Timer', desc: 'On-delay timer (TON)' },
  { id: 'counter', name: 'Counter', desc: 'Up counter' },
  { id: 'branch', name: 'OR Branch', desc: 'Parallel contacts' },
  { id: 'compareBlock', name: 'Compare Block', desc: 'Analog comparison' },
  { id: 'hysteresis', name: 'Hysteresis', desc: 'Level control with deadband' },
  { id: 'simpleContact', name: 'Simple Contact', desc: 'Direct input to output' },
];

// Prompts
const PROMPTS = [
  { id: 1, name: 'Basic', desc: 'Simple pattern generation' },
  { id: 2, name: 'Detailed', desc: 'With specific I/O addresses' },
  { id: 3, name: 'Safety', desc: 'With E-Stop and interlocks' },
  { id: 4, name: 'Custom', desc: 'Write your own description' },
];

interface GeneratedProgram {
  content: string;
  filename: string;
  programData?: {
    inputs: Array<{ address: string; symbol: string; comment: string }>;
    outputs: Array<{ address: string; symbol: string; comment: string }>;
    memoryBits?: Array<{ address: string; symbol: string; comment: string }>;
    rungs: Array<{ name: string; comment: string; il: string[] }>;
  };
}

function getModelSpecs(modelId: string) {
  for (const category of Object.values(TM221_MODELS)) {
    const model = category.find(m => m.id === modelId);
    if (model) return model;
  }
  return null;
}

export default function M221GeneratorPage() {
  const { user, isAuthenticated } = useAuth();

  // State
  const [selectedModel, setSelectedModel] = useState('TM221CE16T');
  const [projectName, setProjectName] = useState('M221_Program');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(['motorStartStop']);
  const [selectedPrompt, setSelectedPrompt] = useState<number>(1);
  const [logic, setLogic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedProgram, setGeneratedProgram] = useState<GeneratedProgram | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'io' | 'ladder' | 'il' | 'xml'>('io');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const modelSpecs = getModelSpecs(selectedModel);

  // Save program to user's profile
  const saveProgram = async (program: GeneratedProgram) => {
    if (!isAuthenticated || !user?.email) return;

    try {
      setSaveStatus('saving');
      const response = await fetch('/api/generated-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: program.filename || `${projectName}.smbp`,
          content: program.content,
          extension: 'smbp',
          manufacturer: 'Schneider Electric',
          model: selectedModel,
          context_used: logic,
          ai_generated: true,
          tokens_used: 0,
          user_id: user.id,
          user_email: user.email,
        }),
      });

      if (response.ok) {
        setSaveStatus('saved');
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      console.error('Error saving program:', err);
      setSaveStatus('error');
    }
  };

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setLogic(template.logic);
      setProjectName(template.name.replace(/\s+/g, '_'));
    }
    setGeneratedProgram(null);
    setError(null);
  };

  // Handle skill toggle
  const handleSkillToggle = (skillId: string) => {
    setSelectedSkills(prev =>
      prev.includes(skillId)
        ? prev.filter(s => s !== skillId)
        : [...prev, skillId]
    );
  };

  // Generate program
  const handleGenerate = async () => {
    if (!logic.trim()) {
      setError('Please enter your control logic description');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedProgram(null);
    setSaveStatus('idle');

    try {
      const response = await fetch('/api/generate-plc-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: logic,
          plcModel: selectedModel,
          projectName: projectName,
          selectedSkills: selectedSkills,
          promptType: selectedPrompt,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Generation failed');
      }

      const data = await response.json();
      setGeneratedProgram(data);

      // Auto-save to user's profile if logged in
      if (isAuthenticated && user?.email) {
        await saveProgram(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate program');
    } finally {
      setIsGenerating(false);
    }
  };

  // Download file
  const handleDownload = () => {
    if (!generatedProgram) return;

    let content = generatedProgram.content.replace(/\r?\n/g, '\r\n');
    content = content.replace(/^\uFEFF/, '');

    const encoder = new TextEncoder();
    const contentBytes = encoder.encode(content);
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const fullContent = new Uint8Array(bom.length + contentBytes.length);
    fullContent.set(bom, 0);
    fullContent.set(contentBytes, bom.length);

    const blob = new Blob([fullContent], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = generatedProgram.filename || `${projectName}.smbp`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">M221 Program Generator</h1>
              <p className="text-sm text-gray-500">Schneider Electric Modicon M221 - All 21 Models Supported</p>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              AI Powered
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="space-y-6">

          {/* Row 1: Model Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">1. Select PLC Model</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">TM221 Model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(TM221_MODELS).map(([category, models]) => (
                    <optgroup key={category} label={category}>
                      {models.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.id} ({model.di} DI / {model.do} DO)
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value.replace(/\s+/g, '_'))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            {modelSpecs && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
                <span className="text-blue-800 mr-4"><strong>Inputs:</strong> %I0.0 - %I0.{modelSpecs.di - 1}</span>
                <span className="text-blue-800 mr-4"><strong>Outputs:</strong> %Q0.0 - %Q0.{modelSpecs.do - 1}</span>
                <span className="text-blue-800"><strong>Type:</strong> {modelSpecs.type}</span>
              </div>
            )}
          </div>

          {/* Row 2: Template Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">2. Use this Template</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template.id)}
                  className={`p-3 border-2 rounded-lg text-left transition ${
                    selectedTemplate === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="font-medium text-gray-900 text-sm">{template.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{template.description}</div>
                </button>
              ))}
            </div>
            {selectedTemplate && (
              <div className="mt-3 text-sm text-blue-600">
                Selected: <strong>{TEMPLATES.find(t => t.id === selectedTemplate)?.name}</strong>
              </div>
            )}
          </div>

          {/* Row 3: Skills Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">3. Skills to be used</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {SKILLS.map((skill) => (
                <label
                  key={skill.id}
                  className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition ${
                    selectedSkills.includes(skill.id)
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedSkills.includes(skill.id)}
                    onChange={() => handleSkillToggle(skill.id)}
                    className="mr-2"
                  />
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{skill.name}</div>
                    <div className="text-xs text-gray-500">{skill.desc}</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="mt-3 text-sm text-green-600">
              Selected: <strong>{selectedSkills.length}</strong> skills ({selectedSkills.join(', ')})
            </div>
          </div>

          {/* Row 4: Prompt Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">4. Prompt to be used</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {PROMPTS.map((prompt) => (
                <label
                  key={prompt.id}
                  className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition ${
                    selectedPrompt === prompt.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="prompt"
                    checked={selectedPrompt === prompt.id}
                    onChange={() => setSelectedPrompt(prompt.id)}
                    className="mr-2"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{prompt.id}. {prompt.name}</div>
                    <div className="text-xs text-gray-500">{prompt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="mt-3 text-sm text-purple-600">
              Selected Prompt: <strong>{selectedPrompt} - {PROMPTS.find(p => p.id === selectedPrompt)?.name}</strong>
            </div>
          </div>

          {/* Row 5: Description Textarea */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">5. Describe Your Control Logic</h2>
            <textarea
              value={logic}
              onChange={(e) => setLogic(e.target.value)}
              className="w-full h-48 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="Select a template above or write your own control logic description..."
            />
            <p className="mt-2 text-sm text-gray-500">
              Be specific about I/O addresses, timing, and logic conditions.
            </p>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !logic.trim()}
            className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Program...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate M221 Program
              </>
            )}
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Generated Program Output */}
          {generatedProgram && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-semibold text-gray-900">Generated Program</h2>
                  {/* Save Status Indicator */}
                  {isAuthenticated && (
                    <div className="flex items-center gap-2">
                      {saveStatus === 'saving' && (
                        <span className="flex items-center text-sm text-blue-600">
                          <svg className="animate-spin w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                          </svg>
                          Saving...
                        </span>
                      )}
                      {saveStatus === 'saved' && (
                        <span className="flex items-center text-sm text-green-600">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Saved to My Programs
                        </span>
                      )}
                      {saveStatus === 'error' && (
                        <span className="flex items-center text-sm text-red-600">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Save failed
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleDownload}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download .smbp
                </button>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200 mb-4">
                <nav className="flex space-x-4">
                  {(['io', 'ladder', 'il', 'xml'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`py-2 px-4 font-medium text-sm border-b-2 transition ${
                        activeTab === tab
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab === 'io' ? 'I/O Table' : tab === 'ladder' ? 'Ladder Logic' : tab === 'il' ? 'IL Code' : 'XML Code'}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-auto">
                {activeTab === 'io' && generatedProgram.programData && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Digital Inputs</h3>
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="text-left py-2 px-3">Address</th>
                            <th className="text-left py-2 px-3">Symbol</th>
                            <th className="text-left py-2 px-3">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {generatedProgram.programData.inputs?.map((input, i) => (
                            <tr key={i} className="border-t border-gray-200">
                              <td className="py-2 px-3 font-mono text-blue-600">{input.address}</td>
                              <td className="py-2 px-3 font-mono">{input.symbol}</td>
                              <td className="py-2 px-3 text-gray-600">{input.comment}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Digital Outputs</h3>
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="text-left py-2 px-3">Address</th>
                            <th className="text-left py-2 px-3">Symbol</th>
                            <th className="text-left py-2 px-3">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {generatedProgram.programData.outputs?.map((output, i) => (
                            <tr key={i} className="border-t border-gray-200">
                              <td className="py-2 px-3 font-mono text-orange-600">{output.address}</td>
                              <td className="py-2 px-3 font-mono">{output.symbol}</td>
                              <td className="py-2 px-3 text-gray-600">{output.comment}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === 'ladder' && generatedProgram.programData && (
                  <div className="space-y-4">
                    {generatedProgram.programData.rungs.map((rung, i) => (
                      <div key={i} className="border border-gray-200 rounded-lg p-4 bg-white">
                        <div className="font-medium text-gray-900 mb-1">Rung {i + 1}: {rung.name}</div>
                        <div className="text-sm text-gray-500 mb-3">{rung.comment}</div>
                        <div className="bg-gray-900 rounded p-3 font-mono text-xs">
                          {rung.il.map((line, j) => (
                            <div key={j} className="text-green-400">{line}</div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'il' && generatedProgram.programData && (
                  <div className="bg-gray-900 rounded p-4 font-mono text-sm">
                    {generatedProgram.programData.rungs.map((rung, i) => (
                      <div key={i} className="mb-4">
                        <div className="text-yellow-400">(* {rung.name} *)</div>
                        {rung.il.map((line, j) => (
                          <div key={j} className="text-green-400 pl-2">{line}</div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'xml' && (
                  <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">
                    {generatedProgram.content.substring(0, 5000)}
                    {generatedProgram.content.length > 5000 && '\n\n... (truncated)'}
                  </pre>
                )}
              </div>

              {/* Instructions */}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-medium text-blue-900 mb-2">How to Use</h3>
                <ol className="text-sm text-blue-800 list-decimal list-inside space-y-1">
                  <li>Click <strong>Download .smbp</strong></li>
                  <li>Open <strong>EcoStruxure Machine Expert - Basic</strong></li>
                  <li>File - Open - Select downloaded file</li>
                </ol>
              </div>
            </div>
          )}

          {/* Footer */}
          <footer className="text-center text-xs text-gray-400 py-4">
            PLCAutoPilot M221 Generator v1.0 | All 21 TM221 Models Supported | 2025-12-27
          </footer>
        </div>
      </main>
    </div>
  );
}
