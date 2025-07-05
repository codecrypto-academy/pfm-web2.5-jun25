'use client';

import { useState } from 'react';

interface CreateNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNodeCreated: () => void;
  networkId: string;
  networkName: string;
}

export default function CreateNodeModal({ 
  isOpen, 
  onClose, 
  onNodeCreated, 
  networkId,
  networkName 
}: CreateNodeModalProps) {
  const [besuNodeNameValue, setBesuNodeNameValue] = useState('');
  const [nodeType, setNodeType] = useState<'signer' | 'miner' | 'normal'>('normal');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError('');
    
    try {
      const response = await fetch('/api/nodes/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          networkId,
          nodeName: besuNodeNameValue,
          nodeType
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error creando el nodo');
      }
      
      setBesuNodeNameValue('');
      setNodeType('normal');
      onNodeCreated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setBesuNodeNameValue('');
    setNodeType('normal');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold mb-4">Crear Nodo en {networkName}</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="besuNodeName" className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Nodo
            </label>
            <input
              type="text"
              id="besuNodeName"
          value={besuNodeNameValue}
          onChange={(e) => setBesuNodeNameValue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: besu-node-1"
              required
              pattern="[a-zA-Z0-9_\-]+"
              title="Solo letras, números, guiones y guiones bajos"
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="nodeType" className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Nodo
            </label>
            <select
              id="nodeType"
              value={nodeType}
              onChange={(e) => setNodeType(e.target.value as 'signer' | 'miner' | 'normal')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="normal">Normal (Solo consultas)</option>
              <option value="miner">Miner (Procesa transacciones)</option>
              <option value="signer">Signer (Validador PoA)</option>
            </select>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={isCreating}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isCreating || !besuNodeNameValue.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isCreating && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {isCreating ? 'Creando...' : 'Crear Nodo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}