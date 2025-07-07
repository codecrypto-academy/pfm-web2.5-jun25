'use client';

import { useState } from 'react';

interface DeleteNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
  nodeName: string;
  nodeId: string;
  networkId: string;
  isBootnode: boolean;
}

export default function DeleteNodeModal({ 
  isOpen, 
  onClose, 
  onDelete, 
  nodeName,
  nodeId,
  networkId,
  isBootnode
}: DeleteNodeModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (isBootnode) {
      setError('No se pueden eliminar nodos bootnode');
      return;
    }

    setIsDeleting(true);
    setError('');
    
    try {
      const response = await fetch(`/api/nodes/delete?name=${encodeURIComponent(nodeName)}&networkId=${encodeURIComponent(networkId)}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error eliminando el nodo');
      }
      
      onDelete();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-white mb-4">
          Eliminar Nodo
        </h2>
        
        {isBootnode ? (
          <div className="mb-4">
            <div className="bg-red-900 border border-red-700 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-200">
                    No se puede eliminar
                  </h3>
                  <div className="mt-2 text-sm text-red-300">
                    <p>Los nodos bootnode no pueden ser eliminados ya que son esenciales para el funcionamiento de la red.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <p className="text-gray-300 mb-2">
              ¿Estás seguro de que quieres eliminar el nodo <strong>{nodeName}</strong>?
            </p>
            <p className="text-sm text-gray-400">
              Esta acción no se puede deshacer. El contenedor del nodo será detenido y eliminado permanentemente.
            </p>
          </div>
        )}
        
        {error && (
          <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded-md">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}
        
        <div className="flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-300 bg-gray-600 rounded hover:bg-gray-500 transition-colors"
            disabled={isDeleting}
          >
            Cancelar
          </button>
          {!isBootnode && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar Nodo'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}