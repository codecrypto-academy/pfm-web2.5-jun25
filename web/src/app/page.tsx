'use client'

import { useState, useEffect } from 'react'
import { besuAPI, NetworkInfo, NodeResponse } from '@/lib/api'

export default function DashboardPage() {
  // Estado principal
  const [networks, setNetworks] = useState<NetworkInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Estado para crear red - SIMPLIFICADO
  const [isCreatingNetwork, setIsCreatingNetwork] = useState(false)
  const [newNetworkName, setNewNetworkName] = useState('')
  const [isSubmittingNetwork, setIsSubmittingNetwork] = useState(false)

  // Estado para crear nodo - SOLO MINERO/RPC
  const [isCreatingNode, setIsCreatingNode] = useState<string | null>(null)
  const [nodeForm, setNodeForm] = useState({
    minerEnabled: true
  })
  const [isSubmittingNode, setIsSubmittingNode] = useState(false)

  // Cargar redes
  const loadNetworks = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await besuAPI.getNetworks()
      setNetworks(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadNetworks()
  }, [])

  // ═══ GESTIÓN DE REDES ═══
  const handleCreateNetwork = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNetworkName.trim()) return

    try {
      setIsSubmittingNetwork(true)
      console.log('🌐 Creando red automática:', newNetworkName.trim())
      
      // ✅ NUEVO - Solo nombre, subred automática
      await besuAPI.createNetwork({
        name: newNetworkName.trim(),
        subnet: '', // Se genera automáticamente
        labels: { 'created-by': 'besu-manager', 'protocol': 'clique' }
      })
      
      setNewNetworkName('')
      setIsCreatingNetwork(false)
      loadNetworks()
      
    } catch (error) {
      alert('Error al crear la red: ' + (error instanceof Error ? error.message : 'Error desconocido'))
    } finally {
      setIsSubmittingNetwork(false)
    }
  }

  const handleDeleteNetwork = async (networkId: string, networkName: string) => {
    if (!confirm(`¿Eliminar la red "${networkName}" y todos sus nodos?`)) return
    
    try {
      await besuAPI.deleteNetwork(networkId)
      loadNetworks()
    } catch (error) {
      alert('Error al eliminar la red: ' + (error instanceof Error ? error.message : 'Error desconocido'))
    }
  }

  // ═══ GESTIÓN DE NODOS ═══
  const openNodeForm = (networkId: string) => {
    setIsCreatingNode(networkId)
    setNodeForm({
      minerEnabled: true
    })
  }

  const closeNodeForm = () => {
    setIsCreatingNode(null)
    setNodeForm({
      minerEnabled: true
    })
  }

  const handleCreateNode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isCreatingNode) return

    try {
      setIsSubmittingNode(true)
      
      console.log('🔧 Creando nodo automático...')
      console.log('🌐 En red:', isCreatingNode)
      console.log('⚙️ Tipo:', nodeForm.minerEnabled ? 'minero' : 'rpc')
      
      // ✅ SIMPLIFICADO - Solo tipo de nodo
      const result = await besuAPI.createNode(isCreatingNode, {
        minerEnabled: nodeForm.minerEnabled,
        nodeType: nodeForm.minerEnabled ? 'miner' : 'rpc'
      })
      
      console.log('✅ Nodo creado:', result)
      
      closeNodeForm()
      
      // Esperar un poco antes de recargar
      setTimeout(() => {
        console.log('🔄 Recargando redes...')
        loadNetworks()
      }, 3000)
      
    } catch (error) {
      console.error('❌ Error completo:', error)
      alert('Error al crear el nodo: ' + (error instanceof Error ? error.message : 'Error desconocido'))
    } finally {
      setIsSubmittingNode(false)
    }
  }

  const handleDeleteNode = async (networkId: string, containerName: string) => {
    if (!confirm(`¿Eliminar el nodo "${containerName}"?`)) return
    
    try {
      await besuAPI.deleteNode(networkId, containerName)
      loadNetworks()
    } catch (error) {
      alert('Error al eliminar el nodo: ' + (error instanceof Error ? error.message : 'Error desconocido'))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🚀 Hyperledger Besu Manager
          </h1>
          <p className="text-gray-600">
            Gestiona redes blockchain y nodos Docker con protocolo Clique - Todo automático
          </p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700">Redes</h3>
            <p className="text-3xl font-bold text-blue-600">{networks.length}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700">Nodos</h3>
            <p className="text-3xl font-bold text-green-600">
              {networks.reduce((acc, net) => acc + net.containers.length, 0)}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700">Estado</h3>
            <p className="text-3xl font-bold text-emerald-600">
              {isLoading ? '⏳' : error ? '❌' : '✅'}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700">Gestión</h3>
            <p className="text-2xl font-bold text-purple-600">🤖 Total</p>
          </div>
        </div>

        {/* Botones principales */}
        <div className="mb-6 flex space-x-4">
          <button
            onClick={() => setIsCreatingNetwork(!isCreatingNetwork)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
            disabled={isSubmittingNetwork}
          >
            {isCreatingNetwork ? '❌ Cancelar' : '🌐 Nueva Red'}
          </button>
          
          <button
            onClick={loadNetworks}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            disabled={isLoading}
          >
            {isLoading ? '⏳ Cargando...' : '🔄 Actualizar'}
          </button>
        </div>

        {/* Formulario crear red - SIMPLIFICADO */}
        {isCreatingNetwork && (
          <div className="bg-white p-6 rounded-lg shadow mb-8 border-l-4 border-blue-500">
            <h2 className="text-xl font-semibold mb-4">🌐 Crear Nueva Red Blockchain</h2>
            
            <form onSubmit={handleCreateNetwork} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de la Red
                </label>
                <input
                  type="text"
                  value={newNetworkName}
                  onChange={(e) => setNewNetworkName(e.target.value)}
                  placeholder="ej: red-produccion"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700">
                  <strong>🤖 Gestión Automática:</strong> El sistema asignará automáticamente:
                </p>
                <ul className="text-sm text-blue-600 mt-2 ml-4 list-disc">
                  <li><strong>Subred única:</strong> Ej. 172.23.0.0/16</li>
                  <li><strong>Nombre único:</strong> Ej. red-produccion-a7b2</li>
                  <li><strong>Gateway automático:</strong> Primera IP disponible</li>
                  <li><strong>Sin conflictos:</strong> Verifica automáticamente</li>
                </ul>
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={isSubmittingNetwork}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50"
                >
                  {isSubmittingNetwork ? '⏳ Creando Red...' : '✅ Crear Red'}
                </button>
                
                <button
                  type="button"
                  onClick={() => setIsCreatingNetwork(false)}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Formulario crear nodo - SOLO MINERO/RPC */}
        {isCreatingNode && (
          <div className="bg-white p-6 rounded-lg shadow mb-8 border-l-4 border-green-500">
            <h2 className="text-xl font-semibold mb-4">🔧 Añadir Nodo a la Red</h2>
            
            <form onSubmit={handleCreateNode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Nodo
                </label>
                <select
                  value={nodeForm.minerEnabled ? 'miner' : 'rpc'}
                  onChange={(e) => {
                    setNodeForm({
                      minerEnabled: e.target.value === 'miner'
                    })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="miner">⛏️ Nodo Minero (produce bloques y valida)</option>
                  <option value="rpc">🔗 Nodo RPC (API y transacciones)</option>
                </select>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-sm text-green-700">
                  <strong>🤖 Gestión Automática:</strong> El sistema asignará automáticamente:
                </p>
                <ul className="text-sm text-green-600 mt-2 ml-4 list-disc">
                  <li><strong>Nombre único:</strong> Ej. m-abc123-x7f2a1</li>
                  <li><strong>Puerto RPC:</strong> Próximo disponible (8545-8600)</li>
                  <li><strong>IP interna:</strong> Automática en la subred</li>
                  <li><strong>Puerto P2P:</strong> Dinámico (30303-30400)</li>
                </ul>
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={isSubmittingNode}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50"
                >
                  {isSubmittingNode ? '⏳ Creando Nodo...' : '🔧 Crear Nodo'}
                </button>
                
                <button
                  type="button"
                  onClick={closeNodeForm}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de redes */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">
              🌐 Redes Blockchain ({networks.length})
            </h2>
          </div>
          
          <div className="p-6">
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">⏳ Cargando redes...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-600">❌ Error: {error}</p>
                <button onClick={loadNetworks} className="mt-2 text-blue-600 hover:text-blue-800 underline">
                  🔄 Reintentar
                </button>
              </div>
            ) : networks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">🌐 No hay redes configuradas</p>
                <p className="text-sm text-gray-400">Crea tu primera red blockchain para empezar</p>
              </div>
            ) : (
              <div className="space-y-6">
                {networks.map((network) => (
                  <div key={network.id} className="border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                    
                    {/* Header de la red */}
                    <div className="p-4 bg-gray-50 border-b border-gray-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-1">
                            🌐 {network.name}
                          </h3>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>📡 Subred: {network.config.subnet || 'No configurada'}</p>
                            {network.config.gateway && <p>🚪 Gateway: {network.config.gateway}</p>}
                            <p>🔧 Nodos: {network.containers.length}</p>
                            <p className="text-xs text-green-600">🤖 Gestionada automáticamente</p>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openNodeForm(network.id)}
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                          >
                            ➕ Nodo
                          </button>
                          
                          <button
                            onClick={() => handleDeleteNetwork(network.id, network.name)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                          >
                            🗑️ Red
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Lista de nodos */}
                    {network.containers.length > 0 ? (
                      <div className="p-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">🔧 Nodos Desplegados</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {network.containers.map((container) => (
                            <div key={container.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-medium text-sm text-gray-900 mb-1">
                                    {container.name.startsWith('m-') ? '⛏️' : '🔗'} {container.name}
                                  </div>
                                  {container.ip && (
                                    <div className="text-xs text-gray-600 mb-1">
                                      🌐 IP: {container.ip}
                                    </div>
                                  )}
                                  <div className="flex items-center space-x-2">
                                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                                    <span className="text-xs text-green-600 font-medium">
                                      {container.name.startsWith('m-') ? 'Minero' : 'RPC'}
                                    </span>
                                  </div>
                                </div>
                                
                                <button
                                  onClick={() => handleDeleteNode(network.id, container.name)}
                                  className="text-red-500 hover:text-red-700 text-sm p-1 hover:bg-red-50 rounded transition-colors"
                                  title="Eliminar nodo"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 text-center text-gray-500">
                        <div className="mb-3">📭</div>
                        <p className="text-sm mb-3">No hay nodos desplegados en esta red</p>
                        <button
                          onClick={() => openNodeForm(network.id)}
                          className="text-green-600 hover:text-green-800 text-sm underline font-medium"
                        >
                          ➕ Añadir primer nodo
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer con info útil */}
        <div className="mt-8 bg-white p-4 rounded-lg shadow">
          <div className="text-center text-sm text-gray-500 space-y-1">
            <p>🤖 <strong>Gestión Total:</strong> Subredes, puertos e IPs automáticos • 🐳 <strong>Docker:</strong> Hyperledger Besu • 🚀 <strong>API:</strong> Puerto 3000</p>
            <p>📡 <strong>Protocolo:</strong> Clique (Proof of Authority) • ⛏️ <strong>Tipos:</strong> Solo Mineros y RPC • 🔧 <strong>Conflictos:</strong> Imposibles</p>
          </div>
        </div>
      </div>
    </div>
  )
}