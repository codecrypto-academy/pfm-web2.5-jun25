'use client';

import { useState, useEffect } from 'react';
import { useNetwork } from '../context/NetworkContext';
import NodeSelector from './NodeSelector';
import CreateNodeModal from './CreateNodeModal';
import Image from 'next/image';

interface NodeInfo {
  name: string;
  address: string;
  balance: string;
  type: 'validator' | 'rpc' | 'normal' | 'bootnode';
  status: 'RUNNING' | 'STOPPED' | 'ERROR' | 'STARTING' | 'STOPPING' | 'CREATED';
  rpcUrl?: string;
}

export default function NodeManagement() {
  const { selectedNetwork } = useNetwork();
  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  const [selectedNode, setSelectedNode] = useState<NodeInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (selectedNetwork) {
      fetchNodes();
    }
  }, [selectedNetwork]);

  const fetchNodes = async () => {
    if (!selectedNetwork) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/networks/${selectedNetwork.id}/nodes`);
      if (!response.ok) {
        throw new Error('Failed to fetch nodes');
      }
      const data: NodeInfo[] = await response.json();
      setNodes(data);
      
      // If no node selected, select the first one
      if (!selectedNode && data.length > 0) {
        setSelectedNode(data[0]);
      }
    } catch (error) {
      console.error('Error fetching nodes:', error);
      setNodes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNodeCreated = () => {
    fetchNodes();
  };

  const handleDeleteNode = async (nodeName: string) => {
    if (!selectedNetwork) return;
    
    try {
      const response = await fetch(`/api/networks/${selectedNetwork.id}/nodes?name=${nodeName}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete node');
      }

      // If deleted node was selected, clear selection
      if (selectedNode?.name === nodeName) {
        setSelectedNode(null);
      }

      // Refresh nodes list
      fetchNodes();
    } catch (error) {
      console.error('Error deleting node:', error);
      alert(`Error deleting node: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getNodeIcon = (type: NodeInfo['type']) => {
    switch (type) {
      case 'validator':
        return '/assets/white-node.svg';
      case 'rpc':
        return '/assets/marine-node-rpc.svg';
      case 'normal':
        return '/assets/grey-node.svg';
      case 'bootnode':
        return '/assets/marine-node.svg';
      default:
        return '/assets/grey-node.svg';
    }
  };

  const getStatusColor = (status: NodeInfo['status']) => {
    switch (status) {
      case 'RUNNING':
        return 'bg-green-500';
      case 'STOPPED':
        return 'bg-red-500';
      case 'ERROR':
        return 'bg-red-600';
      case 'STARTING':
        return 'bg-yellow-500';
      case 'STOPPING':
        return 'bg-orange-500';
      case 'CREATED':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = (status: NodeInfo['status']) => {
    switch (status) {
      case 'RUNNING':
        return 'En ejecución';
      case 'STOPPED':
        return 'Detenido';
      case 'ERROR':
        return 'Error';
      case 'STARTING':
        return 'Iniciando';
      case 'STOPPING':
        return 'Deteniendo';
      case 'CREATED':
        return 'Creado';
      default:
        return 'Desconocido';
    }
  };

  if (!selectedNetwork) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Gestión de Nodos</h2>
        <p className="text-gray-500">Selecciona una red para gestionar sus nodos</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm overflow-visible">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Gestión de Nodos</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Crear Nodo
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-visible">
        {/* Node Selector */}
        <div className="space-y-4 overflow-visible">
          <div className="relative overflow-visible">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar Nodo
            </label>
            <NodeSelector
              onNodeSelect={setSelectedNode}
              selectedNode={selectedNode}
            />
          </div>

          {/* Node List */}
          <div className="space-y-2 mt-6">
            <h3 className="text-sm font-medium text-gray-700">Todos los Nodos ({nodes.length})</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {loading ? (
                <div className="text-center py-4 text-gray-500">Cargando nodos...</div>
              ) : nodes.length === 0 ? (
                <div className="text-center py-4 text-gray-500">No hay nodos disponibles</div>
              ) : (
                nodes.map((node) => (
                  <div
                    key={node.name}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedNode?.name === node.name
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedNode(node)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Image
                          src={getNodeIcon(node.type)}
                          alt={node.type}
                          width={20}
                          height={20}
                        />
                        <div>
                          <div className="font-medium text-gray-900">{node.name}</div>
                          <div className="text-sm text-gray-500">{node.balance} ETH</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(node.status)}`} />
                        <span className="text-xs text-gray-500 capitalize">{node.type}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Node Details */}
        <div className="space-y-4 mt-6 lg:mt-0">
          <h3 className="text-sm font-medium text-gray-700">Detalles del Nodo</h3>
          {selectedNode ? (
            <div className="border border-gray-200 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Image
                    src={getNodeIcon(selectedNode.type)}
                    alt={selectedNode.type}
                    width={32}
                    height={32}
                  />
                  <div>
                    <h4 className="font-medium text-gray-900">{selectedNode.name}</h4>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(selectedNode.status)}`} />
                      <span className="text-sm text-gray-500">{getStatusText(selectedNode.status)}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteNode(selectedNode.name)}
                  className="text-red-600 hover:text-red-800 focus:outline-none"
                  title="Eliminar nodo"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Tipo:</span>
                  <span className="text-sm font-medium text-gray-900 capitalize">{selectedNode.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Balance:</span>
                  <span className="text-sm font-medium text-gray-900">{selectedNode.balance} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Dirección:</span>
                  <span className="text-sm font-mono text-gray-900 break-all">{selectedNode.address}</span>
                </div>
                {selectedNode.rpcUrl && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">RPC URL:</span>
                    <span className="text-sm font-mono text-gray-900 break-all">{selectedNode.rpcUrl}</span>
                  </div>
                )}
              </div>

              <div className="flex space-x-2 pt-4">
                <button
                  className="flex-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  disabled={selectedNode.status === 'RUNNING'}
                >
                  {selectedNode.status === 'RUNNING' ? 'En ejecución' : 'Iniciar'}
                </button>
                <button
                  className="flex-1 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  disabled={selectedNode.status === 'STOPPED'}
                >
                  {selectedNode.status === 'STOPPED' ? 'Detenido' : 'Detener'}
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg p-4 text-center text-gray-500">
              Selecciona un nodo para ver sus detalles
            </div>
          )}
        </div>
      </div>

      <CreateNodeModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onNodeCreated={handleNodeCreated}
      />
    </div>
  );
}