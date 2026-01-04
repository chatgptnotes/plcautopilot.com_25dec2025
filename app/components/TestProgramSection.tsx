'use client';

import { useState, useMemo } from 'react';
import { generateTests, type TestCase, type TestGeneratorResult } from '@/lib/test-generator';

interface TestProgramSectionProps {
  smbpContent: string;
}

export default function TestProgramSection({ smbpContent }: TestProgramSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, 'pass' | 'fail' | 'pending'>>({});

  // Extract rungs from SMBP content and generate tests
  const testData = useMemo<TestGeneratorResult | null>(() => {
    if (!smbpContent) return null;

    // Extract rungs section from SMBP XML
    const rungsMatch = smbpContent.match(/<Rungs>([\s\S]*?)<\/Rungs>/);
    if (!rungsMatch) return null;

    const rungsXml = rungsMatch[1];
    return generateTests(rungsXml);
  }, [smbpContent]);

  if (!testData || testData.testCases.length === 0) {
    return null;
  }

  const handleMarkTest = (testId: string, result: 'pass' | 'fail') => {
    setTestResults(prev => ({ ...prev, [testId]: result }));
  };

  const passedCount = Object.values(testResults).filter(r => r === 'pass').length;
  const failedCount = Object.values(testResults).filter(r => r === 'fail').length;
  const totalTests = testData.testCases.length;

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

          {/* Test Scenarios */}
          <div>
            <h4 className="font-semibold text-gray-800 text-sm mb-2">Test Scenarios</h4>
            <div className="space-y-3">
              {testData.testCases.map((tc) => (
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
