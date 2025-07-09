'use client';

import NetworkStatus from './components/NetworkStatus';
import FaucetPanel from './components/FaucetPanel';
import BalanceChecker from './components/BalanceChecker';
import TransferPanel from './components/TransferPanel';
import BlockExplorer from './components/BlockExplorer';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Besu Network Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your private Hyperledger Besu blockchain network
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Network Status */}
          <div className="lg:col-span-1">
            <NetworkStatus />
          </div>

          {/* Middle Column - Actions */}
          <div className="lg:col-span-1 space-y-6">
            <FaucetPanel />
            <BalanceChecker />
            <TransferPanel />
          </div>

          {/* Right Column - Block Explorer */}
          <div className="lg:col-span-1">
            <BlockExplorer />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-gray-600">
              Besu Network MVP Dashboard - For testing and development
            </div>
            <div className="flex space-x-4 text-sm">
              <div className="text-gray-600">
                <span className="font-medium">Status:</span> Connected
              </div>
              <div className="text-gray-600">
                <span className="font-medium">Environment:</span> Development
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}