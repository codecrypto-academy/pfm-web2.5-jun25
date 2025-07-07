'use client';

import { useEffect, useState } from 'react';

interface CreateNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNodeCreated: () => void;
  networkId: string;
  networkName: string;
}

interface BesuNode {
  id: string;
  name: string;
  status: string;
  ports: string[];
  networkId: string;
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
  const [isBootnode, setIsBootnode] = useState(false);
  
  // Generar el nombre del contenedor basado en la convención
  const generateContainerName = () => {
    if (!besuNodeNameValue.trim()) return '';
    const typePrefix = isBootnode ? 'bootnode' : nodeType;
    return `${networkId}-${typePrefix}-${besuNodeNameValue.trim()}`;
  };
  const [selectedBootnode, setSelectedBootnode] = useState('');
  const [availableBootnodes, setAvailableBootnodes] = useState<BesuNode[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  // Cargar nodos disponibles cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      fetchAvailableNodes();
    }
  }, [isOpen, networkId]);

  const fetchAvailableNodes = async () => {
    try {
      // Usar el endpoint específico de la red para obtener solo los nodos de esta red
      const response = await fetch(`/api/networks/${networkId}/nodes`);
      if (response.ok) {
        const nodes = await response.json();
        // Filtrar solo los bootnodes que estén ejecutándose
        const networkBootnodes = nodes.filter((node: unknown) => {
          return (
            typeof node === 'object' &&
            node !== null &&
            'status' in node &&
            'isBootnode' in node &&
            (node as Record<string, unknown>).status === 'running' && 
            (node as Record<string, unknown>).isBootnode === true
          );
        });
        setAvailableBootnodes(networkBootnodes);
      }
    } catch (err) {
      console.error('Error cargando nodos:', err);
    }
  };

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
          nodeType,
          isBootnode,
          selectedBootnode: !isBootnode ? selectedBootnode : undefined
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error creando el nodo');
      }
      
      setBesuNodeNameValue('');
      setNodeType('normal');
      setIsBootnode(false);
      setSelectedBootnode('');
      onNodeCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setBesuNodeNameValue('');
    setNodeType('normal');
    setIsBootnode(false);
    setSelectedBootnode('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold mb-4 text-white">Crear Nodo en {networkName}</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="besuNodeName" className="block text-sm font-medium text-gray-300 mb-2">
              Nombre del Nodo
            </label>
            <input
              type="text"
              id="besuNodeName"
              value={besuNodeNameValue}
              onChange={(e) => setBesuNodeNameValue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
              placeholder="Ej: node-1, validator-01, miner-alpha"
              required
              pattern="[a-zA-Z0-9_\-]+"
              title="Solo letras, números, guiones y guiones bajos"
            />
            {besuNodeNameValue.trim() && (
              <div className="mt-2 p-2 bg-blue-900 border border-blue-700 rounded-md">
                <p className="text-xs text-blue-200">
                  <strong>Nombre del contenedor:</strong> <code className="bg-blue-800 px-1 rounded text-blue-100">{generateContainerName()}</code>
                </p>
              </div>
            )}
          </div>
          
          <div className="mb-4">
            <label htmlFor="nodeType" className="block text-sm font-medium text-gray-300 mb-2">
              Tipo de Nodo
            </label>
            <select
              id="nodeType"
              value={nodeType}
              onChange={(e) => setNodeType(e.target.value as 'signer' | 'miner' | 'normal')}
              className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="normal">Normal (Solo consultas)</option>
              <option value="miner">Miner (Procesa transacciones)</option>
              <option value="signer">Signer (Validador PoA)</option>
            </select>
          </div>
          
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isBootnode}
                onChange={(e) => {
                  setIsBootnode(e.target.checked);
                  if (e.target.checked) {
                    setSelectedBootnode(''); // Limpiar selección de bootnode si se marca como bootnode
                  }
                }}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 bg-gray-700 rounded"
              />
              <span className="text-sm font-medium text-gray-300">
                Configurar como Bootnode
              </span>
            </label>
            <p className="text-xs text-gray-400 mt-1">
              Los bootnodes ayudan a otros nodos a descubrir y conectarse a la red
            </p>
          </div>
          
          {!isBootnode && availableBootnodes.length > 0 && (
            <div className="mb-4">
              <label htmlFor="bootnode" className="block text-sm font-medium text-gray-300 mb-2">
                Bootnode para Sincronización (Opcional)
              </label>
              <select
                id="bootnode"
                value={selectedBootnode}
                onChange={(e) => setSelectedBootnode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar bootnode (opcional)</option>
                {availableBootnodes.map((node) => (
                  <option key={node.id} value={node.name}>
                    {node.name} ({node.status})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Selecciona un nodo existente para sincronización más rápida
              </p>
            </div>
          )}
          
          {!isBootnode && availableBootnodes.length === 0 && (
            <div className="mb-6 p-3 bg-yellow-900 border border-yellow-700 rounded-md">
              <p className="text-sm text-yellow-200">
                No hay bootnodes disponibles en esta red. Este nodo se conectará usando descubrimiento automático.
              </p>
            </div>
          )}
          
          {error && (
            <div className="mb-4 p-3 bg-red-900 border border-red-700 text-red-300 rounded">
              {error}
            </div>
          )}
          
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={isCreating}
              className="px-4 py-2 text-gray-300 border border-gray-600 bg-gray-600 rounded hover:bg-gray-500 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isCreating || !besuNodeNameValue.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50 flex items-center gap-2"
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