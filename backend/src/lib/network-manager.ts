import { BesuDeployer, BesuNodeConfig, BesuNetworkConfig } from 'devisrael-docker-manager';
import { NetworkInfo, NodeStatus } from '@/types/api';

export class NetworkManager {
  private activeNetworks: Map<string, BesuDeployer> = new Map();

  /**
   * Crea una nueva red Besu
   */
  async createNetwork(
    networkName: string,
    subnet: string,
    nodes: BesuNodeConfig[],
    dataPath: string = './besu-networks'
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      // Verificar si la red ya existe
      if (this.activeNetworks.has(networkName)) {
        return {
          success: false,
          error: `La red '${networkName}' ya existe`
        };
      }

      // Crear configuración de red
      const networkConfig: BesuNetworkConfig = {
        networkName,
        subnet,
        dataPath: `${dataPath}/${networkName}`
      };

      // Crear deployer
      const deployer = new BesuDeployer(networkConfig);

      // Desplegar la red
      await deployer.deployBesuNetwork(nodes);

      // Guardar en el registro de redes activas
      this.activeNetworks.set(networkName, deployer);

      return {
        success: true,
        message: `Red '${networkName}' creada exitosamente con ${nodes.length} nodos`
      };
    } catch (error) {
      return {
        success: false,
        error: `Error creando la red: ${(error as Error).message}`
      };
    }
  }

  /**
   * Elimina una red existente
   */
  async deleteNetwork(networkName: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const deployer = this.activeNetworks.get(networkName);
      
      if (!deployer) {
        return {
          success: false,
          error: `La red '${networkName}' no existe`
        };
      }

      // Eliminar la red (esto también elimina los contenedores)
      await deployer.removeNetwork(networkName, true);

      // Remover del registro
      this.activeNetworks.delete(networkName);

      return {
        success: true,
        message: `Red '${networkName}' eliminada exitosamente`
      };
    } catch (error) {
      return {
        success: false,
        error: `Error eliminando la red: ${(error as Error).message}`
      };
    }
  }

  /**
   * Agrega un nodo a una red existente
   */
  async addNode(networkName: string, node: BesuNodeConfig): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const deployer = this.activeNetworks.get(networkName);
      
      if (!deployer) {
        return {
          success: false,
          error: `La red '${networkName}' no existe`
        };
      }

      // TODO: Implementar lógica para agregar un nodo individual
      // Por ahora, esto requeriría extender la librería para soportar
      // agregar nodos dinámicamente a una red existente
      
      return {
        success: false,
        error: 'Agregar nodos dinámicamente aún no está implementado'
      };
    } catch (error) {
      return {
        success: false,
        error: `Error agregando nodo: ${(error as Error).message}`
      };
    }
  }

  /**
   * Remueve un nodo de una red existente
   */
  async removeNode(networkName: string, nodeName: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const deployer = this.activeNetworks.get(networkName);
      
      if (!deployer) {
        return {
          success: false,
          error: `La red '${networkName}' no existe`
        };
      }

      // Remover el contenedor del nodo
      await deployer.removeContainer(nodeName, true);

      return {
        success: true,
        message: `Nodo '${nodeName}' removido de la red '${networkName}'`
      };
    } catch (error) {
      return {
        success: false,
        error: `Error removiendo nodo: ${(error as Error).message}`
      };
    }
  }

  /**
   * Obtiene información de una red
   */
  async getNetworkInfo(networkName: string): Promise<{ success: boolean; data?: NetworkInfo; error?: string }> {
    try {
      const deployer = this.activeNetworks.get(networkName);
      
      if (!deployer) {
        return {
          success: false,
          error: `La red '${networkName}' no existe`
        };
      }

      const status = await deployer.getNetworkStatus();
      
      const networkInfo: NetworkInfo = {
        networkName: status.network.name,
        subnet: status.network.subnet,
        totalNodes: status.network.totalNodes,
        nodes: status.nodes.map((node: any) => ({
          name: node.name,
          ip: node.ip,
          type: this.getNodeType(node.name),
          status: 'running' // TODO: Obtener estado real del contenedor
        }))
      };

      return {
        success: true,
        data: networkInfo
      };
    } catch (error) {
      return {
        success: false,
        error: `Error obteniendo información de la red: ${(error as Error).message}`
      };
    }
  }

  /**
   * Lista todas las redes activas
   */
  async listNetworks(): Promise<{ success: boolean; data?: string[]; error?: string }> {
    try {
      const networks = Array.from(this.activeNetworks.keys());
      
      return {
        success: true,
        data: networks
      };
    } catch (error) {
      return {
        success: false,
        error: `Error listando redes: ${(error as Error).message}`
      };
    }
  }

  /**
   * Obtiene los logs de un nodo específico
   */
  async getNodeLogs(networkName: string, nodeName: string): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      const deployer = this.activeNetworks.get(networkName);
      
      if (!deployer) {
        return {
          success: false,
          error: `La red '${networkName}' no existe`
        };
      }

      const logs = await deployer.getNodeLogs(nodeName);

      return {
        success: true,
        data: logs
      };
    } catch (error) {
      return {
        success: false,
        error: `Error obteniendo logs del nodo: ${(error as Error).message}`
      };
    }
  }

  /**
   * Obtiene el tipo de nodo basado en su nombre
   */
  private getNodeType(nodeName: string): string {
    if (nodeName.includes('bootnode')) return 'bootnode';
    if (nodeName.includes('rpc')) return 'rpc';
    if (nodeName.includes('miner')) return 'miner';
    return 'validator';
  }

  /**
   * Obtiene la instancia singleton del NetworkManager
   */
  private static instance: NetworkManager;
  
  static getInstance(): NetworkManager {
    if (!NetworkManager.instance) {
      NetworkManager.instance = new NetworkManager();
    }
    return NetworkManager.instance;
  }
}