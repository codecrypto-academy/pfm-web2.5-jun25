'use client';

import { useNetwork } from '../context/NetworkContext';

export default function NetworkSelector() {
  const { networks, selectedNetwork, selectNetwork, loading } = useNetwork();

  if (loading || !selectedNetwork) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 rounded-full bg-gray-400 animate-pulse"></div>
        <span className="text-sm text-gray-500">Loading Networks...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <select
        value={selectedNetwork.id}
        onChange={(e) => selectNetwork(e.target.value)}
        className="appearance-none w-full bg-white border border-gray-300 rounded-md pl-3 pr-8 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        {networks.map((network) => (
          <option key={network.id} value={network.id}>
            {network.name}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
        </svg>
      </div>
    </div>
  );
} 