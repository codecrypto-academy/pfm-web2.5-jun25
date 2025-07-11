'use client';

import { useState, useEffect } from 'react';
import { useNetwork } from '../context/NetworkContext';
import Image from 'next/image';

interface NodeInfo {
  name: string;
  address: string;
  balance: string;
  type: 'validator' | 'rpc' | 'normal' | 'bootnode';
  status: 'RUNNING' | 'STOPPED' | 'ERROR' | 'STARTING' | 'STOPPING' | 'CREATED';
  rpcUrl?: string;
}

interface NodeSelectorProps {
  onNodeSelect?: (node: NodeInfo) => void;
  selectedNode?: NodeInfo | null;
}

export default function NodeSelector({ onNodeSelect, selectedNode }: NodeSelectorProps) {
  const { selectedNetwork } = useNetwork();
  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

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
    } catch (error) {
      console.error('Error fetching nodes:', error);
      setNodes([]);
    } finally {
      setLoading(false);
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

  const getNodeTypeDisplay = (type: NodeInfo['type']) => {
    switch (type) {
      case 'validator':
        return 'Validator';
      case 'rpc':
        return 'RPC';
      case 'normal':
        return ''; // Don't show "normal" type
      case 'bootnode':
        return 'Bootnode';
      default:
        return '';
    }
  };

  const getNodeColor = (type: NodeInfo['type']) => {
    switch (type) {
      case 'validator':
        return 'text-white bg-blue-600';
      case 'rpc':
        return 'text-blue-600 bg-blue-100';
      case 'normal':
        return 'text-gray-600 bg-gray-100';
      case 'bootnode':
        return 'text-blue-800 bg-blue-200';
      default:
        return 'text-gray-600 bg-gray-100';
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

  const handleNodeSelect = (node: NodeInfo) => {
    onNodeSelect?.(node);
    setIsOpen(false);
  };

  if (!selectedNetwork) {
    return (
      <div className="text-gray-500 text-sm">
        Selecciona una red para ver los nodos
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-w-[280px] p-3 bg-white border border-gray-300 rounded-lg shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        disabled={loading}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {selectedNode ? (
              <>
                <Image
                  src={getNodeIcon(selectedNode.type)}
                  alt={selectedNode.type}
                  width={20}
                  height={20}
                />
                <div className="text-left">
                  <div className="font-medium text-gray-900">{selectedNode.name}</div>
                  <div className="text-sm text-gray-500">
                    {selectedNode.balance} ETH{getNodeTypeDisplay(selectedNode.type) ? ` • ${getNodeTypeDisplay(selectedNode.type)}` : ''}
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${getStatusColor(selectedNode.status)}`} />
              </>
            ) : (
              <div className="text-gray-500">
                {loading ? 'Cargando nodos...' : 'Seleccionar nodo'}
              </div>
            )}
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-xl z-[100] max-h-60 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              Cargando nodos...
            </div>
          ) : nodes.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No hay nodos disponibles
            </div>
          ) : (
            <div className="py-1">
              {nodes.map((node) => (
                <button
                  key={node.name}
                  onClick={() => handleNodeSelect(node)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
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
                        <div className="text-sm text-gray-500">
                          {node.balance} ETH{getNodeTypeDisplay(node.type) ? ` • ${getNodeTypeDisplay(node.type)}` : ''}
                        </div>
                        <div className="text-xs text-gray-400">
                          {node.address.substring(0, 10)}...{node.address.substring(node.address.length - 8)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getNodeTypeDisplay(node.type) && (
                        <span className={`px-2 py-1 text-xs rounded-full ${getNodeColor(node.type)}`}>
                          {getNodeTypeDisplay(node.type)}
                        </span>
                      )}
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(node.status)}`} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}