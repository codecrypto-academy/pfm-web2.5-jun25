'use client';

import { useState } from 'react';
import { useNetwork } from '../context/NetworkContext';
import Image from 'next/image';

interface CreateNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNodeCreated?: () => void;
}

interface NodeFormData {
  name: string;
  nodeType: 'validator' | 'rpc' | 'normal';
  isRpc: boolean;
  initialBalance: string;
  rpcPort?: string;
  ip?: string;
}

export default function CreateNodeModal({ isOpen, onClose, onNodeCreated }: CreateNodeModalProps) {
  const { selectedNetwork } = useNetwork();
  const [formData, setFormData] = useState<NodeFormData>({
    name: '',
    nodeType: 'normal',
    isRpc: false,
    initialBalance: '10.0',
    rpcPort: '8545',
    ip: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNetwork) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/networks/${selectedNetwork.id}/nodes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          nodeType: formData.nodeType,
          isRpc: formData.isRpc,
          initialBalance: formData.initialBalance,
          rpcPort: formData.isRpc ? parseInt(formData.rpcPort || '8545') : undefined,
          ip: formData.ip || undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error creating node');
      }

      // Reset form
      setFormData({
        name: '',
        nodeType: 'normal',
        isRpc: false,
        initialBalance: '10.0',
        rpcPort: '8545',
        ip: ''
      });

      onNodeCreated?.();
      onClose();
    } catch (error) {
      console.error('Error creating node:', error);
      setError(error instanceof Error ? error.message : 'Error creating node');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'validator':
        return '/assets/white-node.svg';
      case 'rpc':
        return '/assets/marine-node-rpc.svg';
      default:
        return '/assets/grey-node.svg';
    }
  };

  const getNodeDescription = (type: string) => {
    switch (type) {
      case 'validator':
        return 'Participa en la validación de bloques y actúa como bootnode';
      case 'rpc':
        return 'Expone interfaz JSON-RPC para interacciones externas';
      case 'normal':
        return 'Participante estándar de la red sin privilegios especiales';
      default:
        return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Crear Nuevo Nodo</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {selectedNetwork && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-800">
              Red: <span className="font-medium">{selectedNetwork.name}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Nodo
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="ej: mi-nuevo-nodo"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Nodo
            </label>
            <div className="space-y-3">
              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.nodeType === 'validator'}
                  onChange={(e) => setFormData({ ...formData, nodeType: e.target.checked ? 'validator' : 'normal' })}
                  className="mr-3"
                />
                <Image
                  src={getNodeIcon('validator')}
                  alt="validator"
                  width={24}
                  height={24}
                  className="mr-3"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Validator</div>
                  <div className="text-sm text-gray-500">Participa en la validación de bloques y actúa como bootnode</div>
                </div>
              </label>
              
              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.isRpc}
                  onChange={(e) => setFormData({ ...formData, isRpc: e.target.checked })}
                  className="mr-3"
                />
                <Image
                  src={getNodeIcon('rpc')}
                  alt="rpc"
                  width={24}
                  height={24}
                  className="mr-3"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">RPC</div>
                  <div className="text-sm text-gray-500">Expone interfaz JSON-RPC para interacciones externas</div>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="initialBalance" className="block text-sm font-medium text-gray-700 mb-1">
              Balance Inicial (ETH)
            </label>
            <input
              type="number"
              id="initialBalance"
              value={formData.initialBalance}
              onChange={(e) => setFormData({ ...formData, initialBalance: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="10.0"
              min="0"
              step="0.1"
              required
            />
          </div>

          {formData.isRpc && (
            <div>
              <label htmlFor="rpcPort" className="block text-sm font-medium text-gray-700 mb-1">
                Puerto RPC
              </label>
              <input
                type="number"
                id="rpcPort"
                value={formData.rpcPort}
                onChange={(e) => setFormData({ ...formData, rpcPort: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="8545"
                min="1024"
                max="65535"
              />
            </div>
          )}

          <div>
            <label htmlFor="ip" className="block text-sm font-medium text-gray-700 mb-1">
              IP Address
            </label>
            <div className="flex items-center">
              <span className="text-gray-500 mr-2">172.20.0.</span>
              <input
                type="number"
                id="ip"
                value={formData.ip}
                onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="10"
                min="1"
                max="254"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Último octeto de la IP (1-254). Auto-asignado si se deja vacío.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              disabled={isSubmitting || !formData.name}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creando...
                </>
              ) : (
                'Crear Nodo'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}