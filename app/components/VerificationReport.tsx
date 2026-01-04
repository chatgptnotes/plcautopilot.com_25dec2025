'use client';

import { useState, useEffect } from 'react';
import type { VerificationResult } from '@/lib/logic-comparator';

interface VerificationReportProps {
  userLogic: string;
  smbpContent: string;
  onRegenerate?: (fixes: string[]) => void;
}

export default function VerificationReport({ userLogic, smbpContent, onRegenerate }: VerificationReportProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Run verification when expanded and inputs change
  useEffect(() => {
    if (isExpanded && userLogic && smbpContent && !result) {
      runVerification();
    }
  }, [isExpanded, userLogic, smbpContent]);

  const runVerification = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/verify-program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userLogic, smbpContent })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = () => {
    if (!result || !onRegenerate) return;

    // Collect fixes needed
    const fixes: string[] = [];
    result.mismatches.forEach(m => {
      fixes.push(`Fix: ${m.suggestion}`);
    });
    result.missing.forEach(m => {
      fixes.push(`Add: ${m.description}`);
    });

    onRegenerate(fixes);
  };

  const getStatusColor = (status: VerificationResult['status']) => {
    switch (status) {
      case 'pass': return 'bg-green-100 border-green-300 text-green-800';
      case 'fail': return 'bg-red-100 border-red-300 text-red-800';
      case 'warning': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getStatusIcon = (status: VerificationResult['status']) => {
    switch (status) {
      case 'pass':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'fail':
        return (
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
    }
  };

  if (!userLogic) {
    return null;
  }

  return (
    <div className="mt-4 border border-purple-200 rounded-lg overflow-hidden">
      {/* Collapsible Header */}
      <button
        onClick={() => {
          setIsExpanded(!isExpanded);
          if (!isExpanded && !result) {
            runVerification();
          }
        }}
        className="w-full bg-purple-50 hover:bg-purple-100 px-4 py-3 flex items-center justify-between transition-colors"
      >
        <div className="flex items-center">
          <svg
            className={`w-5 h-5 mr-2 text-purple-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-semibold text-purple-800">Verify Program Logic</span>
        </div>
        {result && (
          <div className="flex items-center gap-2">
            {getStatusIcon(result.status)}
            <span className={`px-2 py-1 rounded text-sm font-medium ${getStatusColor(result.status)}`}>
              {result.status.toUpperCase()} - {result.score}%
            </span>
          </div>
        )}
        {isLoading && (
          <svg className="animate-spin w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 bg-white space-y-4 max-h-[500px] overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <svg className="animate-spin w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="ml-2 text-gray-600">Verifying program logic...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              <strong>Error:</strong> {error}
              <button
                onClick={runVerification}
                className="ml-2 text-red-600 underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          )}

          {result && (
            <>
              {/* Score Bar */}
              <div className="bg-gray-100 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Verification Score</span>
                  <span className={`text-lg font-bold ${
                    result.score >= 80 ? 'text-green-600' :
                    result.score >= 50 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>{result.score}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      result.score >= 80 ? 'bg-green-500' :
                      result.score >= 50 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${result.score}%` }}
                  />
                </div>
              </div>

              {/* Matches */}
              {result.matches.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-green-700 text-sm flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Verified Requirements ({result.matches.length})
                  </h4>
                  <div className="space-y-1">
                    {result.matches.map((match, idx) => (
                      <div key={idx} className="bg-green-50 border border-green-200 rounded p-2 text-xs">
                        <div className="font-medium text-green-800">{match.requirementText}</div>
                        <div className="text-green-600 mt-1">
                          Implemented: {match.implementationDetails}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mismatches */}
              {result.mismatches.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-red-700 text-sm flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Issues Found ({result.mismatches.length})
                  </h4>
                  <div className="space-y-2">
                    {result.mismatches.map((mismatch, idx) => (
                      <div key={idx} className={`border rounded p-2 text-xs ${
                        mismatch.severity === 'critical' ? 'bg-red-50 border-red-300' : 'bg-yellow-50 border-yellow-300'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className={`font-medium ${
                            mismatch.severity === 'critical' ? 'text-red-800' : 'text-yellow-800'
                          }`}>
                            {mismatch.requirementText}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            mismatch.severity === 'critical' ? 'bg-red-200 text-red-700' : 'bg-yellow-200 text-yellow-700'
                          }`}>
                            {mismatch.severity}
                          </span>
                        </div>
                        <div className="mt-1 space-y-1 text-gray-600">
                          <div>Expected: <span className="font-mono">{mismatch.expected}</span></div>
                          <div>Found: <span className="font-mono">{mismatch.found}</span></div>
                          <div className="text-purple-600 font-medium">Fix: {mismatch.suggestion}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing */}
              {result.missing.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-orange-700 text-sm flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                    Not Implemented ({result.missing.length})
                  </h4>
                  <div className="space-y-1">
                    {result.missing.map((missing, idx) => (
                      <div key={idx} className="bg-orange-50 border border-orange-200 rounded p-2 text-xs">
                        <div className="font-medium text-orange-800">{missing.requirementText}</div>
                        <div className="text-orange-600 mt-1">{missing.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Extras */}
              {result.extras.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-blue-700 text-sm flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Additional Features ({result.extras.length})
                  </h4>
                  <div className="space-y-1">
                    {result.extras.map((extra, idx) => (
                      <div key={idx} className="bg-blue-50 border border-blue-200 rounded p-2 text-xs">
                        <div className="font-medium text-blue-800">{extra.description}</div>
                        <div className="text-blue-600">{extra.details}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                <strong>Summary:</strong> {result.summary}
              </div>

              {/* Actions */}
              {(result.mismatches.length > 0 || result.missing.length > 0) && onRegenerate && (
                <div className="flex gap-2">
                  <button
                    onClick={handleRegenerate}
                    className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors flex items-center justify-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Re-generate with Fixes
                  </button>
                  <button
                    onClick={runVerification}
                    className="bg-gray-200 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                  >
                    Re-verify
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
