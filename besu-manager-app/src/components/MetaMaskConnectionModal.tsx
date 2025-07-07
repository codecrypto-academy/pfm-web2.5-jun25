'use client';

import { useState } from 'react';

interface MetaMaskConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  networkName: string;
  chainId: string;
  rpcUrl: string;
}

export default function MetaMaskConnectionModal({
  isOpen,
  onClose,
  networkName,
  chainId,
  rpcUrl
}: MetaMaskConnectionModalProps) {
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Error copiando al portapapeles:', err);
    }
  };

  const addToMetaMask = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${parseInt(chainId).toString(16)}`,
            chainName: `Besu ${networkName}`,
            nativeCurrency: {
              name: 'Ether',
              symbol: 'ETH',
              decimals: 18
            },
            rpcUrls: [rpcUrl],
            blockExplorerUrls: null
          }]
        });
        alert('Red agregada exitosamente a MetaMask!');
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 4902) {
          alert('Por favor, agrega la red manualmente usando la información mostrada.');
        } else {
          console.error('Error agregando red a MetaMask:', error);
          alert('Error agregando la red. Intenta agregarla manualmente.');
        }
      }
    } else {
      alert('MetaMask no está instalado. Por favor, instala MetaMask primero.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 border border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Conectar con MetaMask</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-3">Información de la Red</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Nombre de la Red
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={`Besu ${networkName}`}
                    readOnly
                    className="flex-1 bg-gray-600 border border-gray-500 text-white px-3 py-2 rounded text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(`Besu ${networkName}`, 'name')}
                    className="px-3 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-500"
                  >
                    {copied === 'name' ? '✓' : '📋'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  URL RPC
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={rpcUrl}
                    readOnly
                    className="flex-1 bg-gray-600 border border-gray-500 text-white px-3 py-2 rounded text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(rpcUrl, 'rpc')}
                    className="px-3 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-500"
                  >
                    {copied === 'rpc' ? '✓' : '📋'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Chain ID
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={chainId}
                    readOnly
                    className="flex-1 bg-gray-600 border border-gray-500 text-white px-3 py-2 rounded text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(chainId, 'chainId')}
                    className="px-3 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-500"
                  >
                    {copied === 'chainId' ? '✓' : '📋'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Símbolo de Moneda
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value="ETH"
                    readOnly
                    className="flex-1 bg-gray-600 border border-gray-500 text-white px-3 py-2 rounded text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard('ETH', 'symbol')}
                    className="px-3 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-500"
                  >
                    {copied === 'symbol' ? '✓' : '📋'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-900 border border-blue-700 p-4 rounded-lg">
            <h4 className="text-blue-200 font-medium mb-2">💡 Instrucciones</h4>
            <ol className="text-blue-100 text-sm space-y-1 list-decimal list-inside">
              <li>Abre MetaMask en tu navegador</li>
              <li>Haz clic en el selector de red (arriba)</li>
              <li>Selecciona &quot;Agregar red&quot; o &quot;Add network&quot;</li>
              <li>Usa la información mostrada arriba</li>
              <li>Guarda la configuración</li>
            </ol>
          </div>

          <div className="flex gap-3">
            <button
              onClick={addToMetaMask}
              className="flex-1 bg-orange-600 text-white py-2 px-4 rounded hover:bg-orange-500 transition-colors font-medium"
            >
              🦊 Agregar a MetaMask
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-300 border border-gray-600 rounded hover:bg-gray-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}