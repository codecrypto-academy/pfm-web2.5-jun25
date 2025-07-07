'use client';

import React, { useState } from 'react';

interface NodeControlButtonsProps {
  nodeId: string;
  nodeName: string;
  networkId: string;
  currentStatus: string;
  onStatusChange: () => void;
}

const NodeControlButtons: React.FC<NodeControlButtonsProps> = ({
  nodeId,
  nodeName,
  networkId,
  currentStatus,
  onStatusChange
}) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const handleNodeAction = async (action: 'start' | 'stop' | 'restart') => {
    setLoading(action);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/nodes/${nodeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          networkId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error performing action');
      }

      setSuccess(data.message);
      onStatusChange(); // Refresh the parent component
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
      // Clear error message after 5 seconds
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(null);
    }
  };

  const isRunning = currentStatus === 'running';
  const isStopped = currentStatus === 'stopped' || currentStatus === 'exited';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {/* Start Button */}
        <button
          onClick={() => handleNodeAction('start')}
          disabled={loading !== null || isRunning}
          className={`px-3 py-1 text-sm rounded transition-colors ${
            isRunning
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : loading === 'start'
              ? 'bg-blue-400 text-white cursor-wait'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {loading === 'start' ? (
            <span className="flex items-center gap-1">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Starting...
            </span>
          ) : (
            '▶️ Start'
          )}
        </button>

        {/* Stop Button */}
        <button
          onClick={() => handleNodeAction('stop')}
          disabled={loading !== null || isStopped}
          className={`px-3 py-1 text-sm rounded transition-colors ${
            isStopped
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : loading === 'stop'
              ? 'bg-red-400 text-white cursor-wait'
              : 'bg-red-500 hover:bg-red-600 text-white'
          }`}
        >
          {loading === 'stop' ? (
            <span className="flex items-center gap-1">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Stopping...
            </span>
          ) : (
            '⏹️ Stop'
          )}
        </button>

        {/* Restart Button */}
        <button
          onClick={() => handleNodeAction('restart')}
          disabled={loading !== null}
          className={`px-3 py-1 text-sm rounded transition-colors ${
            loading === 'restart'
              ? 'bg-orange-400 text-white cursor-wait'
              : 'bg-orange-500 hover:bg-orange-600 text-white'
          }`}
        >
          {loading === 'restart' ? (
            <span className="flex items-center gap-1">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Restarting...
            </span>
          ) : (
            '🔄 Restart'
          )}
        </button>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="text-red-600 text-xs bg-red-50 p-2 rounded border border-red-200">
          ❌ {error}
        </div>
      )}
      
      {success && (
        <div className="text-green-600 text-xs bg-green-50 p-2 rounded border border-green-200">
          ✅ {success}
        </div>
      )}
    </div>
  );
};

export default NodeControlButtons;