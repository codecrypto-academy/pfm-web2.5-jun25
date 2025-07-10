/**
 * Ejemplo de cliente para la API de Besu Network
 * Muestra cómo interactuar con la API desde TypeScript
 */

interface BesuNode {
  name: string;
  ip: string;
  port?: number;
  isBootnode?: boolean;
  isMiner?: boolean;
  isRpc?: boolean;
}

interface CreateNetworkRequest {
  networkName: string;
  subnet: string;
  dataPath?: string;
  nodes: BesuNode[];
}

class BesuNetworkClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Verifica el estado de la API
   */
  async healthCheck(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }

  /**
   * Crea una nueva red Besu
   */
  async createNetwork(request: CreateNetworkRequest): Promise<any> {
    const response = await fetch(`${this.baseUrl}/networks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    return response.json();
  }

  /**
   * Lista todas las redes
   */
  async listNetworks(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/networks`);
    return response.json();
  }

  /**
   * Obtiene información de una red específica
   */
  async getNetwork(networkName: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/networks/${networkName}`);
    return response.json();
  }

  /**
   * Elimina una red
   */
  async deleteNetwork(networkName: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/networks/${networkName}`, {
      method: 'DELETE',
    });
    return response.json();
  }

  /**
   * Agrega un nodo a una red existente
   */
  async addNode(networkName: string, node: BesuNode): Promise<any> {
    const response = await fetch(`${this.baseUrl}/networks/${networkName}/nodes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ node }),
    });
    return response.json();
  }

  /**
   * Remueve un nodo de una red
   */
  async removeNode(networkName: string, nodeName: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/networks/${networkName}/nodes`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nodeName }),
    });
    return response.json();
  }

  /**
   * Obtiene los logs de un nodo
   */
  async getNodeLogs(networkName: string, nodeName: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/networks/${networkName}/nodes/${nodeName}/logs`);
    return response.json();
  }
}

// Ejemplo de uso
async function example() {
  const client = new BesuNetworkClient();

  try {
    // 1. Verificar estado de la API
    console.log('🔍 Verificando estado de la API...');
    const health = await client.healthCheck();
    console.log('Health:', health);

    // 2. Crear una red de prueba
    console.log('\n🚀 Creando red de prueba...');
    const createResult = await client.createNetwork({
      networkName: 'ejemplo-red',
      subnet: '172.26.0.0/16',
      nodes: [
        {
          name: 'bootnode',
          ip: '172.26.0.10',
          isBootnode: true,
        },
        {
          name: 'rpc-node',
          ip: '172.26.0.11',
          isRpc: true,
        },
        {
          name: 'miner-node',
          ip: '172.26.0.12',
          isMiner: true,
        },
      ],
    });
    console.log('Red creada:', createResult);

    // 3. Listar redes
    console.log('\n📋 Listando redes...');
    const networks = await client.listNetworks();
    console.log('Redes:', networks);

    // 4. Obtener información de la red
    console.log('\n📊 Obteniendo información de la red...');
    const networkInfo = await client.getNetwork('ejemplo-red');
    console.log('Info de red:', networkInfo);

    // 5. Obtener logs del bootnode
    console.log('\n📝 Obteniendo logs del bootnode...');
    const logs = await client.getNodeLogs('ejemplo-red', 'bootnode');
    console.log('Logs:', logs);

    // 6. Remover un nodo
    console.log('\n🗑️ Removiendo nodo miner...');
    const removeResult = await client.removeNode('ejemplo-red', 'miner-node');
    console.log('Nodo removido:', removeResult);

    // 7. Verificar red después de remover nodo
    console.log('\n🔍 Verificando red después de remover nodo...');
    const updatedNetworkInfo = await client.getNetwork('ejemplo-red');
    console.log('Red actualizada:', updatedNetworkInfo);

    // 8. Eliminar la red
    console.log('\n🗑️ Eliminando red...');
    const deleteResult = await client.deleteNetwork('ejemplo-red');
    console.log('Red eliminada:', deleteResult);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Ejecutar ejemplo si se llama directamente
if (require.main === module) {
  example();
}

export { BesuNetworkClient, type BesuNode, type CreateNetworkRequest };