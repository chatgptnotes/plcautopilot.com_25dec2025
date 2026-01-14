'use client';

import { useState, useMemo, useCallback } from 'react';
import { generateTests, type TestCase, type TestGeneratorResult } from '@/lib/test-generator';
import { runTests, type TestRunResult, type TestResult } from '@/lib/test-runner';

interface TestProgramSectionProps {
  smbpContent: string;
}

interface AIAnalysisResult {
  programType: string;
  description: string;
  phases: string[];
  ioMapping: Record<string, string>;
  testCases: TestCase[];
}

export default function TestProgramSection({ smbpContent }: TestProgramSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, 'pass' | 'fail' | 'pending'>>({});
  const [autoTestResults, setAutoTestResults] = useState<TestRunResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiProgramType, setAiProgramType] = useState<string | null>(null);
  const [aiDescription, setAiDescription] = useState<string | null>(null);
  const [usingAI, setUsingAI] = useState(false);
  const [aiTestCases, setAiTestCases] = useState<TestCase[] | null>(null);

  // Extract rungs from SMBP content and generate fallback tests
  const testData = useMemo<TestGeneratorResult | null>(() => {
    if (!smbpContent) return null;

    // Extract rungs section from SMBP XML
    const rungsMatch = smbpContent.match(/<Rungs>([\s\S]*?)<\/Rungs>/);
    if (!rungsMatch) return null;

    const rungsXml = rungsMatch[1];
    // Pass full SMBP content for symbol extraction from dedicated sections
    return generateTests(rungsXml, smbpContent);
  }, [smbpContent]);

  if (!testData || testData.testCases.length === 0) {
    return null;
  }

  const handleMarkTest = (testId: string, result: 'pass' | 'fail') => {
    setTestResults(prev => ({ ...prev, [testId]: result }));
  };

  // Run automated tests with AI analysis
  const handleRunTests = useCallback(async () => {
    if (!testData || !smbpContent) return;

    setIsRunning(true);
    setIsAnalyzing(true);
    setAutoTestResults(null);
    setUsingAI(false);

    try {
      // Step 1: Try AI analysis first
      let testCasesToRun: TestCase[] = testData.testCases;

      try {
        const response = await fetch('/api/analyze-program', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ smbpContent })
        });

        if (response.ok) {
          const aiResult: AIAnalysisResult = await response.json();

          if (aiResult.testCases && aiResult.testCases.length > 0) {
            // Use AI-generated tests
            testCasesToRun = aiResult.testCases;
            setAiProgramType(aiResult.programType);
            setAiDescription(aiResult.description);
            setAiTestCases(aiResult.testCases);
            setUsingAI(true);
            console.log('Using AI-generated tests for:', aiResult.programType);
          }
        } else {
          console.warn('AI analysis failed, using fallback pattern detection');
        }
      } catch (aiError) {
        console.warn('AI analysis unavailable, using fallback:', aiError);
      }

      setIsAnalyzing(false);

      // Step 2: Run tests (AI-generated or fallback)
      const results = runTests(smbpContent, testCasesToRun);
      setAutoTestResults(results);

      // Update manual test results based on auto results
      const newResults: Record<string, 'pass' | 'fail' | 'pending'> = {};
      for (const result of results.results) {
        newResults[result.testId] = result.status === 'error' ? 'fail' : result.status;
      }
      setTestResults(prev => ({ ...prev, ...newResults }));

    } catch (error) {
      console.error('Test execution error:', error);
      setIsAnalyzing(false);
    } finally {
      setIsRunning(false);
    }
  }, [testData, smbpContent]);

  // Calculate counts from auto results or manual results
  const passedCount = autoTestResults
    ? autoTestResults.passed
    : Object.values(testResults).filter(r => r === 'pass').length;
  const failedCount = autoTestResults
    ? autoTestResults.failed + autoTestResults.errors
    : Object.values(testResults).filter(r => r === 'fail').length;
  // Use AI test cases count if available, otherwise fallback
  const activeTestCases = aiTestCases || testData.testCases;
  const totalTests = activeTestCases.length;

  return (
    <div className="mt-4 border border-blue-200 rounded-lg overflow-hidden">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full bg-blue-50 hover:bg-blue-100 px-4 py-3 flex items-center justify-between transition-colors"
      >
        <div className="flex items-center">
          <svg
            className={`w-5 h-5 mr-2 text-blue-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-semibold text-blue-800">Test Program Logic</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {/* Run Tests Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRunTests();
            }}
            disabled={isRunning || isAnalyzing}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              isRunning || isAnalyzing
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isAnalyzing ? 'Analyzing...' : isRunning ? 'Running...' : 'Run Tests'}
          </button>
          {/* AI Badge */}
          {usingAI && aiProgramType && (
            <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs" title={aiDescription || ''}>
              AI: {aiProgramType.replace(/_/g, ' ')}
            </span>
          )}
          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
            {totalTests} tests
          </span>
          {passedCount > 0 && (
            <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
              {passedCount} passed
            </span>
          )}
          {failedCount > 0 && (
            <span className="bg-red-100 text-red-700 px-2 py-1 rounded">
              {failedCount} failed
            </span>
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 bg-white space-y-4 max-h-[600px] overflow-y-auto">
          {/* Detected Patterns */}
          {testData.detectedPatterns.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="font-semibold text-gray-800 text-sm mb-2">Detected Patterns</h4>
              <div className="flex flex-wrap gap-2">
                {testData.detectedPatterns.map((pattern, idx) => (
                  <span
                    key={idx}
                    className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs"
                    title={pattern.details.description || pattern.type}
                  >
                    {pattern.type.replace(/_/g, ' ')} ({Math.round(pattern.confidence * 100)}%)
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* I/O Mapping Table */}
          {testData.ioMappings.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-800 text-sm mb-2">I/O Mapping</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-200 px-2 py-1 text-left">Address</th>
                      <th className="border border-gray-200 px-2 py-1 text-left">Symbol</th>
                      <th className="border border-gray-200 px-2 py-1 text-left">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testData.ioMappings.map((io, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="border border-gray-200 px-2 py-1 font-mono">{io.address}</td>
                        <td className="border border-gray-200 px-2 py-1">{io.symbol || '-'}</td>
                        <td className="border border-gray-200 px-2 py-1">
                          <span className={`px-1 rounded text-xs ${
                            io.type === 'input' ? 'bg-green-100 text-green-700' :
                            io.type === 'output' ? 'bg-orange-100 text-orange-700' :
                            io.type === 'analog_input' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {io.type}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Memory Mapping Table */}
          {testData.memoryMappings.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-800 text-sm mb-2">Memory Mapping</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-200 px-2 py-1 text-left">Address</th>
                      <th className="border border-gray-200 px-2 py-1 text-left">Symbol</th>
                      <th className="border border-gray-200 px-2 py-1 text-left">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testData.memoryMappings.map((mem, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="border border-gray-200 px-2 py-1 font-mono">{mem.address}</td>
                        <td className="border border-gray-200 px-2 py-1">{mem.symbol || '-'}</td>
                        <td className="border border-gray-200 px-2 py-1">
                          <span className={`px-1 rounded text-xs ${
                            mem.type === 'bit' ? 'bg-yellow-100 text-yellow-700' :
                            mem.type === 'timer' ? 'bg-purple-100 text-purple-700' :
                            mem.type === 'float' ? 'bg-cyan-100 text-cyan-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {mem.type}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Automated Test Results */}
          {autoTestResults && (
            <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-800 text-sm flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Automated Test Results
                </h4>
                <span className="text-xs text-gray-500">
                  Executed in {autoTestResults.executionTimeMs.toFixed(0)}ms
                </span>
              </div>

              {/* Results Summary Bar */}
              <div className="flex items-center gap-4 mb-3 p-2 bg-white rounded border">
                <div className="flex items-center">
                  <span className="text-2xl font-bold text-gray-800">{autoTestResults.passed}</span>
                  <span className="text-green-600 text-sm ml-1">/{autoTestResults.totalTests} passed</span>
                </div>
                {autoTestResults.failed > 0 && (
                  <span className="text-red-600 text-sm">{autoTestResults.failed} failed</span>
                )}
                {autoTestResults.errors > 0 && (
                  <span className="text-orange-600 text-sm">{autoTestResults.errors} errors</span>
                )}
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${(autoTestResults.passed / autoTestResults.totalTests) * 100}%` }}
                  />
                </div>
                <span className="text-lg font-bold text-gray-800">
                  {Math.round((autoTestResults.passed / autoTestResults.totalTests) * 100)}%
                </span>
              </div>

              {/* Individual Test Results */}
              <div className="space-y-2">
                {autoTestResults.results.map((result) => (
                  <AutoTestResultCard key={result.testId} result={result} />
                ))}
              </div>
            </div>
          )}

          {/* AI Analysis Info */}
          {usingAI && aiDescription && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <h4 className="font-semibold text-purple-800 text-sm">AI Program Analysis</h4>
              </div>
              <p className="text-purple-700 text-xs">{aiDescription}</p>
              <div className="mt-2 text-xs text-purple-600">
                Detected type: <span className="font-medium">{aiProgramType?.replace(/_/g, ' ')}</span>
              </div>
            </div>
          )}

          {/* Test Scenarios */}
          <div>
            <h4 className="font-semibold text-gray-800 text-sm mb-2">
              Test Scenarios {usingAI && <span className="text-purple-600 text-xs font-normal">(AI-generated)</span>}
            </h4>
            <div className="space-y-3">
              {activeTestCases.map((tc) => (
                <TestCaseCard
                  key={tc.id}
                  testCase={tc}
                  result={testResults[tc.id] || 'pending'}
                  onMark={(result) => handleMarkTest(tc.id, result)}
                />
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-100 rounded-lg p-3 mt-4">
            <h4 className="font-semibold text-gray-800 text-sm mb-2">Test Summary</h4>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-white rounded p-2">
                <div className="text-lg font-bold text-gray-800">{totalTests}</div>
                <div className="text-gray-500">Total</div>
              </div>
              <div className="bg-green-50 rounded p-2">
                <div className="text-lg font-bold text-green-600">{passedCount}</div>
                <div className="text-green-600">Passed</div>
              </div>
              <div className="bg-red-50 rounded p-2">
                <div className="text-lg font-bold text-red-600">{failedCount}</div>
                <div className="text-red-600">Failed</div>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <div className="text-lg font-bold text-gray-600">{totalTests - passedCount - failedCount}</div>
                <div className="text-gray-500">Pending</div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-800">
            <strong>How to use:</strong>
            <ul className="mt-1 space-y-1 list-disc list-inside">
              <li>Run tests in Machine Expert Basic simulator</li>
              <li>Use Animation Table to force inputs and monitor outputs</li>
              <li>Mark each test as Pass or Fail after execution</li>
              <li>Use a stopwatch for timer-related tests</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// Test Case Card Component
interface TestCaseCardProps {
  testCase: TestCase;
  result: 'pass' | 'fail' | 'pending';
  onMark: (result: 'pass' | 'fail') => void;
}

function TestCaseCard({ testCase, result, onMark }: TestCaseCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const categoryColors: Record<string, string> = {
    startup: 'bg-blue-100 text-blue-700',
    safety: 'bg-red-100 text-red-700',
    operation: 'bg-green-100 text-green-700',
    transition: 'bg-yellow-100 text-yellow-700',
    fault: 'bg-orange-100 text-orange-700',
    manual: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className={`border rounded-lg overflow-hidden ${
      result === 'pass' ? 'border-green-300 bg-green-50' :
      result === 'fail' ? 'border-red-300 bg-red-50' :
      'border-gray-200 bg-white'
    }`}>
      {/* Card Header */}
      <div className="flex items-center justify-between p-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center flex-1 text-left"
        >
          <svg
            className={`w-4 h-4 mr-2 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-medium text-sm text-gray-800">{testCase.id}: {testCase.title}</span>
          <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${categoryColors[testCase.category] || 'bg-gray-100 text-gray-700'}`}>
            {testCase.category}
          </span>
        </button>

        {/* Pass/Fail Buttons */}
        <div className="flex gap-1">
          <button
            onClick={() => onMark('pass')}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              result === 'pass'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700'
            }`}
          >
            Pass
          </button>
          <button
            onClick={() => onMark('fail')}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              result === 'fail'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-700'
            }`}
          >
            Fail
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2 text-xs">
          <p className="text-gray-600">{testCase.description}</p>

          {/* Initial Conditions */}
          <div>
            <div className="font-semibold text-gray-700 mb-1">Initial Conditions:</div>
            <ul className="list-disc list-inside text-gray-600 ml-2">
              {testCase.initialConditions.map((cond, idx) => (
                <li key={idx}>{cond}</li>
              ))}
            </ul>
          </div>

          {/* Steps Table */}
          <div>
            <div className="font-semibold text-gray-700 mb-1">Steps:</div>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-200 px-2 py-1 text-left w-10">Step</th>
                  <th className="border border-gray-200 px-2 py-1 text-left">Action</th>
                  <th className="border border-gray-200 px-2 py-1 text-left">Expected</th>
                </tr>
              </thead>
              <tbody>
                {testCase.steps.map((step) => (
                  <tr key={step.step}>
                    <td className="border border-gray-200 px-2 py-1 text-center">{step.step}</td>
                    <td className="border border-gray-200 px-2 py-1">{step.action}</td>
                    <td className="border border-gray-200 px-2 py-1">{step.expected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pass Criteria */}
          <div>
            <div className="font-semibold text-gray-700 mb-1">Pass Criteria:</div>
            <ul className="list-disc list-inside text-gray-600 ml-2">
              {testCase.passCriteria.map((crit, idx) => (
                <li key={idx}>{crit}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// Automated Test Result Card Component
interface AutoTestResultCardProps {
  result: TestResult;
}

function AutoTestResultCard({ result }: AutoTestResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusIcon = {
    pass: (
      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    fail: (
      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  };

  const statusColors = {
    pass: 'border-green-300 bg-green-50',
    fail: 'border-red-300 bg-red-50',
    error: 'border-orange-300 bg-orange-50',
  };

  return (
    <div className={`border rounded-lg overflow-hidden ${statusColors[result.status]}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-2 text-left hover:bg-white/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {statusIcon[result.status]}
          <span className="font-medium text-sm text-gray-800">
            {result.testId}: {result.title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            result.status === 'pass' ? 'bg-green-200 text-green-800' :
            result.status === 'fail' ? 'bg-red-200 text-red-800' :
            'bg-orange-200 text-orange-800'
          }`}>
            {result.status.toUpperCase()}
          </span>
          <span className="text-xs text-gray-500">{result.executionTimeMs.toFixed(0)}ms</span>
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-2 text-xs bg-white/50">
          {/* Execution Details */}
          {result.details.length > 0 && (
            <div>
              <div className="font-semibold text-gray-700 mb-1">Execution Log:</div>
              <ul className="list-disc list-inside text-gray-600 ml-2 space-y-0.5">
                {result.details.map((detail, idx) => (
                  <li key={idx} className={detail.includes('expected') && detail.includes('got') ? 'text-red-600' : ''}>
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Expected vs Actual */}
          {Object.keys(result.expectedOutputs).length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="font-semibold text-gray-700 mb-1">Expected:</div>
                <div className="bg-white rounded p-2 font-mono text-xs">
                  {Object.entries(result.expectedOutputs).map(([addr, value]) => (
                    <div key={addr} className="text-gray-600">
                      {addr} = {String(value)}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="font-semibold text-gray-700 mb-1">Actual:</div>
                <div className="bg-white rounded p-2 font-mono text-xs">
                  {Object.entries(result.actualOutputs).map(([addr, value]) => {
                    const expected = result.expectedOutputs[addr];
                    const matches = expected === value;
                    return (
                      <div key={addr} className={matches ? 'text-green-600' : 'text-red-600'}>
                        {addr} = {String(value)} {matches ? '' : '(MISMATCH)'}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {result.errorMessage && (
            <div className="bg-red-100 border border-red-200 rounded p-2 text-red-700">
              <strong>Error:</strong> {result.errorMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
