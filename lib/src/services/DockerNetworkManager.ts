import { LogLevel, Logger } from '../utils/Logger';

import { DockerService } from './DockerService';

export interface ContainerInfo {
  id: string;
  name: string;
  state: 'running' | 'stopped' | 'exited' | 'unknown';
  ipAddress?: string;
  ports?: Record<string, string>;
}

export interface DockerNetworkInfo {
  Id: string;
  Name: string;
  Driver: string;
  Containers: Record<string, {
    Name: string;
    IPv4Address: string;
  }>;
}

export class DockerNetworkManager {
  private docker: DockerService;

  constructor(logLevel: LogLevel = LogLevel.INFO) {
    const logger = new Logger({ level: logLevel });
    this.docker = new DockerService({}, logger);
  }

  /**
   * Genera una red de docker
   * @param name Nombre de la red
   * @returns ID de la red creada
   */
  async createNetwork(name: string): Promise<string> {
    return await this.docker.createNetwork(name);
  }

  /**
   * Recupera las redes actuales de docker
   * @returns Lista de redes docker
   */
  async getNetworks(): Promise<DockerNetworkInfo[]> {
    return await this.docker.listNetworks();
  }

  /**
   * Elimina una red de docker
   * @param name Nombre de la red
   */
  async removeNetwork(name: string): Promise<void> {
    await this.docker.removeNetwork(name);
  }

  /**
   * Recupera los contenedores dentro de una red determinada
   * @param networkName Nombre de la red
   * @returns Lista de contenedores en la red
   */
  async getNetworkContainers(networkName: string): Promise<ContainerInfo[]> {
    try {
      // Obtener el ID de la red
      const networkId = await this.docker.getNetworkId(networkName);
      if (!networkId) {
        return [];
      }

      // Inspeccionar la red para obtener información completa de contenedores
      const networkDetails = await this.docker.inspectNetwork(networkId);
      if (!networkDetails || !networkDetails.Containers) {
        return [];
      }

      const containers: ContainerInfo[] = [];
      const seenContainerIds = new Set<string>();
      
      for (const containerId of Object.keys(networkDetails.Containers)) {
        // Evitar duplicados basándose en el ID del contenedor
        if (seenContainerIds.has(containerId)) {
          continue;
        }
        
        const containerName = networkDetails.Containers[containerId].Name;
        const containerInfo = await this.docker.getContainerInfo(containerName);
        if (containerInfo) {
          seenContainerIds.add(containerId);
          containers.push(containerInfo);
        }
      }

      return containers;
    } catch (error) {
      console.error(`Error obteniendo contenedores de la red ${networkName}:`, error);
      return [];
    }
  }






}