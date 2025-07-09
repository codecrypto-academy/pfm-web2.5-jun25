'use client';

import { useEffect, useState } from 'react';

interface Block {
  number: number;
  timestamp: number;
  gasUsed: string;
  gasLimit: string;
  miner: string;
  transactionCount: number;
  hash: string;
  parentHash: string;
}

export default function BlockExplorer() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBlocks = async () => {
    try {
      const response = await fetch('/api/blocks?limit=10');
      if (!response.ok) {
        throw new Error('Failed to fetch blocks');
      }
      const data = await response.json();
      setBlocks(data.blocks);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlocks();
    const interval = setInterval(fetchBlocks, 15000); // Refresh every 15 seconds
    return () => clearInterval(interval);
  }, []);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Recent Blocks</h2>
        <div className="text-gray-500">Loading blocks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Recent Blocks</h2>
        <div className="text-red-500">Error: {error}</div>
        <button 
          onClick={fetchBlocks}
          className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Recent Blocks</h2>
        <button 
          onClick={fetchBlocks}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 text-sm"
        >
          Refresh
        </button>
      </div>

      {blocks.length === 0 ? (
        <div className="text-gray-500">No blocks found</div>
      ) : (
        <div className="space-y-3">
          {blocks.map((block) => (
            <div key={block.number} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2">
                  <div className="text-lg font-semibold">Block #{block.number}</div>
                  <div className="text-sm text-gray-500">
                    {block.transactionCount} tx{block.transactionCount !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {formatTimestamp(block.timestamp)}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium">Hash:</span>{' '}
                  <span className="font-mono text-gray-600">
                    {block.hash.substring(0, 20)}...
                  </span>
                </div>
                <div>
                  <span className="font-medium">Gas Used:</span>{' '}
                  <span className="text-gray-600">
                    {parseInt(block.gasUsed).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Miner:</span>{' '}
                  <span className="font-mono text-gray-600">
                    {block.miner ? `${block.miner.substring(0, 20)}...` : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Gas Limit:</span>{' '}
                  <span className="text-gray-600">
                    {parseInt(block.gasLimit).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}