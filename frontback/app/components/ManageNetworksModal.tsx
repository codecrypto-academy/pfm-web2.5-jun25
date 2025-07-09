'use client';

import { useState } from 'react';
import { useNetwork } from '../context/NetworkContext';

export default function ManageNetworksModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [networkName, setNetworkName] = useState('');
  const [rpcUrl, setRpcUrl] = useState('');
  const [chainId, setChainId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { refreshNetworks } = useNetwork();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const networkId = networkName.toLowerCase().replace(/\s+/g, '-');

    try {
      const response = await fetch('/api/networks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: networkId,
          name: networkName,
          rpcUrl,
          chainId: parseInt(chainId, 10),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create network');
      }

      await refreshNetworks();
      setIsOpen(false);
      // Reset form
      setNetworkName('');
      setRpcUrl('');
      setChainId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-sm bg-purple-accent text-white py-2 px-4 rounded-md hover:bg-opacity-80"
      >
        Manage Networks
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md z-50">
            <h2 className="text-xl font-bold mb-4">Add a New Network</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="networkName" className="block text-sm font-medium text-gray-700">Network Name</label>
                <input type="text" id="networkName" value={networkName} onChange={(e) => setNetworkName(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
              </div>
              <div>
                <label htmlFor="rpcUrl" className="block text-sm font-medium text-gray-700">RPC URL</label>
                <input type="url" id="rpcUrl" value={rpcUrl} onChange={(e) => setRpcUrl(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
              </div>
              <div>
                <label htmlFor="chainId" className="block text-sm font-medium text-gray-700">Chain ID</label>
                <input type="number" id="chainId" value={chainId} onChange={(e) => setChainId(e.target.value)} required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={() => setIsOpen(false)} className="bg-gray-200 py-2 px-4 rounded-md">Cancel</button>
                <button type="submit" disabled={submitting} className="bg-blue-dark text-white py-2 px-4 rounded-md disabled:bg-gray-400">
                  {submitting ? 'Adding...' : 'Add Network'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
} 