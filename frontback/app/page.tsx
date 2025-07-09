'use client';

import BlockExplorer from './components/BlockExplorer';
import BalanceChecker from './components/BalanceChecker';
import FaucetPanel from './components/FaucetPanel';
import NetworkStatus from './components/NetworkStatus';
import NetworkSelector from './components/NetworkSelector';
import ManageNetworksModal from './components/ManageNetworksModal';

export default function Home() {
  return (
    <div className="min-h-screen bg-blue-accent text-gray-800">
      <header className="bg-white shadow-md p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-dark">BesuChain Explorer</h1>
          <div className="flex items-center space-x-4">
            <NetworkSelector />
            <ManageNetworksModal />
          </div>
        </div>
      </header>
      
      <main className="container mx-auto p-4 md:p-6 lg:p-8 h-screen">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          {/* Columna Izquierda */}
          <div className="space-y-6">
            <NetworkStatus />
            <FaucetPanel />
          </div>

          {/* Columna Central - Block Stream */}
          <div className="h-full">
            <BlockExplorer />
          </div>

          {/* Columna Derecha */}
          <div className="space-y-6">
            <BalanceChecker />
          </div>
        </div>
      </main>
    </div>
  );
}