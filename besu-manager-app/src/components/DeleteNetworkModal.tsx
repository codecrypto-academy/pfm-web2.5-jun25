'use client';

import { useState } from 'react';

interface DeleteNetworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
  networkName: string;
  networkId: string;
}

export default function DeleteNetworkModal({ 
  isOpen, 
  onClose, 
  onDelete, 
  networkName,
  networkId 
}: DeleteNetworkModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setIsDeleting(true);
    setError('');
    
    try {
      const response = await fetch(`/api/networks/delete?id=${networkId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error eliminando la red');
      }
      
      onDelete();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold mb-4 text-red-400">Eliminar Red</h2>
        
        <div className="mb-6">
          <p className="text-gray-300 mb-2">
            ¿Estás seguro de que quieres eliminar la red?
          </p>
          <p className="font-semibold text-white">
            {networkName}
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Esta acción no se puede deshacer.
          </p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-900 border border-red-700 text-red-300 rounded">
            {error}
          </div>
        )}
        
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-gray-300 border border-gray-600 bg-gray-600 rounded hover:bg-gray-500 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500 disabled:opacity-50 flex items-center gap-2"
          >
            {isDeleting && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            {isDeleting ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}