'use client';

import { useEffect, useState, useCallback } from 'react';
import { useBalance } from '../context/BalanceContext';

interface NetworkStatusData {
  network: {
    chainId: number;
    name: string;
    rpcUrl: string;
  };
  blockchain: {
    blockNumber: number;
    blockTimestamp: number;
    gasUsed: string;
    transactionCount: number;
    peerCount: number;
  };
  account: {
    address: string;
    balance: string;
    balanceWei: string;
  };
}

export default function NetworkStatus() {
  const [status, setStatus] = useState<NetworkStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { balance, fetchBalance } = useBalance();

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/network/status');
      if (!response.ok) {
        throw new Error('Failed to fetch network status');
      }
      const data = await response.json();
      setStatus(data);
      if (data?.account?.address) {
        fetchBalance(data.account.address);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [fetchBalance]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Network Status</h2>
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Network Status</h2>
        <div className="text-red-500">Error: {error}</div>
        <button 
          onClick={fetchStatus}
          className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Network Status</h2>
        <div className="text-gray-500">No data available</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Network Status</h2>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-sm text-gray-600">Connected</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <div className="text-sm font-medium text-gray-700">Chain ID</div>
            <div className="text-lg">{status.network.chainId}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700">Block Number</div>
            <div className="text-lg">{status.blockchain.blockNumber}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700">Peers</div>
            <div className="text-lg">{status.blockchain.peerCount}</div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-sm font-medium text-gray-700">RPC URL</div>
            <div className="text-sm font-mono text-gray-600">{status.network.rpcUrl}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700">Validator Address</div>
            <div className="text-sm font-mono text-gray-600">{status.account.address}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700">Validator Balance</div>
            <div className="text-lg">{balance ? `${parseFloat(balance).toFixed(4)} ETH` : 'Loading...'}</div>
          </div>
        </div>
      </div>

      <button 
        onClick={fetchStatus}
        className="mt-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 text-sm"
      >
        Refresh Status
      </button>
    </div>
  );
}