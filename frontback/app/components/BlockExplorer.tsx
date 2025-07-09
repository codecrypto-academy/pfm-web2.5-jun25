'use client';

import { useEffect, useState, useCallback } from 'react';
import { useNetwork } from '../context/NetworkContext';

interface Block {
  number: number;
  timestamp: number;
  transactionCount: number;
  gasUsed: string;
  miner: string;
  hash: string;
  gasLimit: string;
}

export default function BlockExplorer() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectedNetwork } = useNetwork();

  const fetchBlocks = useCallback(async () => {
    if (!selectedNetwork) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/blocks?networkId=${selectedNetwork.id}&limit=10`);
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
  }, [selectedNetwork]);

  useEffect(() => {
    fetchBlocks();
    const interval = setInterval(fetchBlocks, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [fetchBlocks]);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  if (!selectedNetwork) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Latest Blocks</h2>
        <p className="text-gray-500">Please select a network to see the latest blocks.</p>
      </div>
    );
  }
  
  if (loading && blocks.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Latest Blocks</h2>
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Latest Blocks</h2>
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

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Block</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transactions</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Miner</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gas Used</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gas Limit</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {blocks.map(block => (
              <tr key={block.hash}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{block.number}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatTimestamp(block.timestamp)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{block.transactionCount}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate" title={block.miner ?? 'N/A'}>
                  {block.miner ? `${block.miner.substring(0, 8)}...${block.miner.substring(block.miner.length - 6)}` : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{Number(block.gasUsed).toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{Number(block.gasLimit).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}