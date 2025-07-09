// lib/api.ts
// Cliente para tu API REST de Besu - ACTUALIZADO para gestión dinámica

const API_BASE = '/api'

// ═══ INTERFACES ACTUALIZADAS ═══

export interface NetworkInfo {
  id: string
  name: string
  config: {
    subnet?: string
    gateway?: string
  }
  containers: ContainerInfo[]
}

export interface ContainerInfo {
  id: string
  name: string
  ip?: string
  state?: string
  ports?: {
    rpc?: number
    ws?: number
    p2p?: number
  }
  endpoints?: {
    rpc?: string
    ws?: string
  }
  labels?: Record<string, string>
  createdAt?: string
}

export interface NetworkCreateOptions {
  name: string
  subnet: string
  labels?: Record<string, string>
}

// ⚡ NUEVA INTERFACE - Simplificada para gestión dinámica
export interface CreateNodeRequest {
  minerEnabled?: boolean
  nodeType?: 'miner' | 'rpc' | 'bootnode'
}

// ⚡ NUEVA INTERFACE - Respuesta del nodo creado
export interface NodeResponse {
  id: string
  name: string
  ip: string
  ports: {
    rpc: number
    ws: number
    p2p: number
  }
  endpoints: {
    rpc: string
    ws: string
  }
  type: string
  minerEnabled: boolean
  networkId: string
  createdAt: string
}

// ⚡ NUEVA INTERFACE - Estadísticas de recursos
export interface ResourceStats {
  usedPorts: number[]
  availablePortRanges: {
    RPC: { used: number; available: number; range: string }
    WS: { used: number; available: number; range: string }
    P2P: { used: number; available: number; range: string }
  }
  totalContainers: number
  besuContainers: number
}

// ⚡ NUEVA INTERFACE - Resultado de limpieza
export interface CleanupResult {
  removedContainers: string[]
  freedPorts: number[]
}

// Clase que encapsula todas las operaciones con tu API
export class BesuAPI {
  private baseUrl: string

  constructor(baseUrl = API_BASE) {
    this.baseUrl = baseUrl
  }

  // ═══ GESTIÓN DE REDES ═══
  
  // GET /api/networks
  async getNetworks(): Promise<NetworkInfo[]> {
    const response = await fetch(`${this.baseUrl}/networks`)
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Error al obtener redes')
    }
    
    return data.data
  }

  // GET /api/networks/{id} - NUEVO: obtener una red específica
  async getNetwork(networkId: string): Promise<{ network: NetworkInfo; nodes: ContainerInfo[] }> {
    console.log('🔍 API Call: GET /api/networks/' + networkId)
    
    const response = await fetch(`${this.baseUrl}/networks/${networkId}/containers`)
    const data = await response.json()
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Error al obtener información de la red')
    }
    
    return {
      network: data.network,
      nodes: data.nodes
    }
  }

  // POST /api/networks
  async createNetwork(request: NetworkCreateOptions): Promise<NetworkInfo> {
    console.log('🌐 API Call: POST /api/networks')
    console.log('📦 Request:', request)
    
    const response = await fetch(`${this.baseUrl}/networks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })
    
    const data = await response.json()
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Error al crear red')
    }
    
    return data.data
  }

  // DELETE /api/networks/{id}
  async deleteNetwork(id: string): Promise<void> {
    console.log('🗑️ API Call: DELETE /api/networks/' + id)
    
    const response = await fetch(`${this.baseUrl}/networks/${id}`, {
      method: 'DELETE',
    })
    
    const data = await response.json()
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Error al eliminar red')
    }
  }

  // ═══ GESTIÓN DE NODOS (ACTUALIZADO) ═══
  
  // ⚡ POST /api/networks/{networkId}/containers - SIMPLIFICADO
  async createNode(networkId: string, request: CreateNodeRequest = {}): Promise<NodeResponse> {
    console.log('🚀 API Call: POST /api/networks/' + networkId + '/containers')
    console.log('📦 Request body:', JSON.stringify(request, null, 2))
    
    const response = await fetch(`${this.baseUrl}/networks/${networkId}/containers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })
    
    console.log(`📡 Response status: ${response.status} ${response.statusText}`)
    
    let data
    try {
      data = await response.json()
      console.log('📋 Response data:', JSON.stringify(data, null, 2))
    } catch (e) {
      console.error('❌ Failed to parse response as JSON:', e)
      throw new Error(`HTTP ${response.status}: Could not parse response`)
    }
    
    if (!response.ok) {
      console.error(`❌ HTTP Error ${response.status}:`, data)
      throw new Error(`HTTP ${response.status}: ${data.error || data.details || 'Unknown error'}`)
    }
    
    if (!data.success) {
      console.error('❌ API Error:', data)
      throw new Error(data.error || 'Failed to create node')
    }
    
    return data.node
  }

  // ⚡ MÉTODOS HELPER - Para crear tipos específicos de nodos
  async createMinerNode(networkId: string): Promise<NodeResponse> {
    return this.createNode(networkId, { minerEnabled: true, nodeType: 'miner' })
  }

  async createRPCNode(networkId: string): Promise<NodeResponse> {
    return this.createNode(networkId, { minerEnabled: false, nodeType: 'rpc' })
  }

  async createBootnode(networkId: string): Promise<NodeResponse> {
    return this.createNode(networkId, { minerEnabled: false, nodeType: 'bootnode' })
  }

  // DELETE /api/networks/{networkId}/containers?container={name}
  async deleteNode(networkId: string, containerName: string): Promise<void> {
    console.log(`🗑️ API Call: DELETE /api/networks/${networkId}/containers?container=${containerName}`)
    
    const response = await fetch(`${this.baseUrl}/networks/${networkId}/containers?container=${containerName}`, {
      method: 'DELETE',
    })
    
    const data = await response.json()
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Error al eliminar nodo')
    }
  }

  // DELETE /api/networks/{networkId}/containers (todos los contenedores)
  async deleteAllNetworkNodes(networkId: string): Promise<void> {
    console.log(`🗑️ API Call: DELETE all nodes from network ${networkId}`)
    
    // Primero obtenemos todos los nodos
    const { nodes } = await this.getNetwork(networkId)
    
    // Eliminamos cada uno
    for (const node of nodes) {
      await this.deleteNode(networkId, node.name)
    }
  }

  // ═══ GESTIÓN DE RECURSOS (NUEVO) ═══
  
  // GET /api/resources
  async getResourceStats(): Promise<ResourceStats> {
    console.log('📊 API Call: GET /api/resources')
    
    const response = await fetch(`${this.baseUrl}/resources`)
    const data = await response.json()
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Error al obtener estadísticas de recursos')
    }
    
    return data.resources
  }

  // POST /api/resources - Limpiar recursos huérfanos
  async cleanupResources(): Promise<CleanupResult> {
    console.log('🧹 API Call: POST /api/resources (cleanup)')
    
    const response = await fetch(`${this.baseUrl}/resources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'cleanup' }),
    })
    
    const data = await response.json()
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Error al limpiar recursos')
    }
    
    return data.result
  }

  // POST /api/resources - Generar configuración de nodo (para preview)
  async generateNodeConfig(networkId: string, nodeType: 'miner' | 'rpc' | 'bootnode' = 'rpc'): Promise<{
    name: string
    ip: string
    rpcPort: number
    wsPort: number
    p2pPort: number
  }> {
    console.log(`⚙️ API Call: POST /api/resources (generate-config for ${nodeType})`)
    
    const response = await fetch(`${this.baseUrl}/resources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'generate-config', networkId, nodeType }),
    })
    
    const data = await response.json()
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Error al generar configuración')
    }
    
    return data.config
  }

  // ═══ MÉTODOS DE UTILIDAD ═══
  
  // Verificar conectividad con un nodo RPC
  async testNodeConnection(rpcUrl: string): Promise<{ connected: boolean; blockNumber?: number; error?: string }> {
    try {
      console.log(`🔗 Testing connection to ${rpcUrl}`)
      
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        }),
        signal: AbortSignal.timeout(5000) // 5 segundo timeout
      })
      
      const data = await response.json()
      
      if (data.result) {
        const blockNumber = parseInt(data.result, 16)
        return { connected: true, blockNumber }
      } else {
        return { connected: false, error: data.error?.message || 'Unknown RPC error' }
      }
    } catch (error) {
      return { connected: false, error: error.message }
    }
  }

  // Obtener balance de una cuenta en un nodo específico
  async getBalance(rpcUrl: string, address: string): Promise<string> {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [address, 'latest'],
        id: 1
      }),
    })
    
    const data = await response.json()
    
    if (data.error) {
      throw new Error(data.error.message)
    }
    
    return data.result
  }

  // Enviar transacción (útil para testing)
  async sendTransaction(rpcUrl: string, from: string, to: string, value: string): Promise<string> {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_sendTransaction',
        params: [{
          from,
          to,
          value
        }],
        id: 1
      }),
    })
    
    const data = await response.json()
    
    if (data.error) {
      throw new Error(data.error.message)
    }
    
    return data.result
  }
}

// Instancia singleton para usar en toda la app
export const besuAPI = new BesuAPI()

// ═══ EXPORTS ADICIONALES ═══
export default besuAPI
export type { NetworkInfo, ContainerInfo, CreateNodeRequest, NodeResponse, ResourceStats, CleanupResult }