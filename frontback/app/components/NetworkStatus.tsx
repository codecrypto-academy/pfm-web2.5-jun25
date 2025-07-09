'use client';

import { useEffect, useState, useCallback } from 'react';
import { useBalance } from '../context/BalanceContext';
import { useNetwork } from '../context/NetworkContext';

interface NetworkStatusData {
  isHealthy: boolean;
  chainId: number;
  blockNumber: number;
  gasPrice: string;
  lastBlockTimestamp: number;
}

export default function NetworkStatus() {
  const [status, setStatus] = useState<NetworkStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { balance, fetchBalance } = useBalance();
  const { selectedNetwork, deleteNetwork } = useNetwork();

  const fetchStatus = useCallback(async () => {
    if (!selectedNetwork) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/network/status?networkId=${selectedNetwork.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch network status');
      }
      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [selectedNetwork, fetchBalance]);

  const handleDeleteNetwork = async () => {
    if (!selectedNetwork) return;
    
    try {
      await deleteNetwork(selectedNetwork.id);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting network:', error);
      alert('Error al borrar la red: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  if (!selectedNetwork) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Network Status</h2>
        <div className="text-gray-500">Please select a network.</div>
      </div>
    );
  }

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
            <div className="text-lg">{status.chainId}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700">Block Number</div>
            <div className="text-lg">{status.blockNumber}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700">Gas Price</div>
            <div className="text-lg">{status.gasPrice} Gwei</div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-sm font-medium text-gray-700">Network</div>
            <div className="text-sm font-mono text-gray-600">{selectedNetwork.name}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700">RPC URL</div>
            <div className="text-sm font-mono text-gray-600">{selectedNetwork.rpcUrl}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700">Last Block Time</div>
            <div className="text-lg">{new Date(status.lastBlockTimestamp * 1000).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Botón para borrar red */}
      {selectedNetwork && selectedNetwork.id !== 'besu-local-env' && (
        <div className="mt-4 flex justify-end">
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 text-sm"
          >
            Borrar Red
          </button>
        </div>
      )}

      {/* Modal de confirmación */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Confirmar eliminación</h3>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que quieres borrar la red "{selectedNetwork?.name}"? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteNetwork}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Borrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}