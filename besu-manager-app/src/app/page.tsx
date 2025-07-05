'use client';

import { useState, useEffect } from 'react';
import CreateNetworkModal from '../components/CreateNetworkModal';
import DeleteNetworkModal from '../components/DeleteNetworkModal';
import CreateNodeModal from '../components/CreateNodeModal';

interface DockerNetwork {
  id: string;
  name: string;
  driver: string;
  scope: string;
}

interface BesuNode {
  id: string;
  name: string;
  status: string;
  ports: string[];
  networkId: string;
}

export default function Home() {
  const [networks, setNetworks] = useState<DockerNetwork[]>([]);
  const [nodes, setNodes] = useState<BesuNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCreateNodeModalOpen, setIsCreateNodeModalOpen] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<DockerNetwork | null>(null);

  useEffect(() => {
    fetchNetworksAndNodes();
  }, []);

  const fetchNetworksAndNodes = async () => {
    try {
      setLoading(true);
      const [networksResponse, nodesResponse] = await Promise.all([
        fetch('/api/networks'),
        fetch('/api/nodes')
      ]);
      
      if (!networksResponse.ok || !nodesResponse.ok) {
        throw new Error('Error al obtener datos');
      }
      
      const networksData = await networksResponse.json();
      const nodesData = await nodesResponse.json();
      
      setNetworks(networksData);
      setNodes(nodesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const getNodesForNetwork = (networkId: string) => {
    return nodes.filter(node => node.networkId === networkId);
  };

  const handleNetworkCreated = () => {
    fetchNetworksAndNodes();
  };

  const handleDeleteNetwork = (network: DockerNetwork) => {
    setSelectedNetwork(network);
    setIsDeleteModalOpen(true);
  };

  const handleNetworkDeleted = () => {
    fetchNetworksAndNodes();
  };

  const handleCreateNode = (network: DockerNetwork) => {
    setSelectedNetwork(network);
    setIsCreateNodeModalOpen(true);
  };

  const handleNodeCreated = () => {
    fetchNetworksAndNodes();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando redes y nodos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchNetworksAndNodes}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Besu Network Manager
          </h1>
          <p className="text-gray-600">
            Gestión de redes Docker y nodos Besu
          </p>
          <div className="mt-4 flex gap-3">
            <button 
              onClick={fetchNetworksAndNodes}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              🔄 Actualizar
            </button>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
            >
              ➕ Nueva Red
            </button>
          </div>
        </header>

        {networks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🌐</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No hay redes disponibles
            </h3>
            <p className="text-gray-500">
              No se encontraron redes Docker activas
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {networks.map((network) => {
              const networkNodes = getNodesForNetwork(network.id);
              
              return (
                <div key={network.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="bg-blue-600 text-white p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold">{network.name}</h2>
                        <p className="text-blue-100 text-sm">
                          ID: {network.id.substring(0, 12)}... | Driver: {network.driver} | Scope: {network.scope}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-2xl font-bold">{networkNodes.length}</div>
                          <div className="text-blue-100 text-sm">nodos</div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleCreateNode(network)}
                            className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                            title="Crear nodo en esta red"
                          >
                            + Nodo
                          </button>
                          {!['bridge', 'host', 'none'].includes(network.name) && (
                            <button
                              onClick={() => handleDeleteNetwork(network)}
                              className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                              title="Eliminar red"
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    {networkNodes.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <div className="text-4xl mb-2">📦</div>
                        <p>No hay nodos en esta red</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {networkNodes.map((node) => (
                          <div key={node.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold text-gray-900">{node.name}</h3>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                node.status === 'running' 
                                  ? 'bg-green-100 text-green-800' 
                                  : node.status === 'exited'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {node.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              ID: {node.id.substring(0, 12)}...
                            </p>
                            {node.ports.length > 0 && (
                              <div className="text-sm">
                                <span className="text-gray-500">Puertos: </span>
                                <span className="text-gray-700">{node.ports.join(', ')}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
         )}
       </div>
       
       <CreateNetworkModal
         isOpen={isCreateModalOpen}
         onClose={() => setIsCreateModalOpen(false)}
         onNetworkCreated={handleNetworkCreated}
       />
       
       {selectedNetwork && (
          <DeleteNetworkModal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onDelete={handleNetworkDeleted}
            networkName={selectedNetwork.name}
            networkId={selectedNetwork.id}
          />
        )}
        
        {selectedNetwork && (
          <CreateNodeModal
            isOpen={isCreateNodeModalOpen}
            onClose={() => setIsCreateNodeModalOpen(false)}
            onNodeCreated={handleNodeCreated}
            networkId={selectedNetwork.id}
            networkName={selectedNetwork.name}
          />
        )}
     </div>
   );
 }
