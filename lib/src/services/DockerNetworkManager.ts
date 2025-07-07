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
   * Recupera los contenedores dentro de una red determinada (incluyendo contenedores detenidos)
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

      // Obtener todos los contenedores (incluyendo detenidos)
      const allContainers = await this.docker.listContainers({ all: true });
      const containers: ContainerInfo[] = [];
      const seenContainerIds = new Set<string>();
      
      // Primero, obtener contenedores actualmente conectados a la red
      const networkDetails = await this.docker.inspectNetwork(networkId);
      if (networkDetails && networkDetails.Containers) {
        for (const containerId of Object.keys(networkDetails.Containers)) {
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
      }
      
      // Luego, buscar contenedores detenidos que pertenecen a esta red
      for (const container of allContainers) {
        if (seenContainerIds.has(container.Id)) {
          continue;
        }
        
        // Inspeccionar el contenedor para ver sus configuraciones de red
         try {
           const containerDetails = await this.docker.inspectContainer(container.Id);
          
          // Verificar si el contenedor está configurado para esta red
          if (containerDetails.NetworkSettings && containerDetails.NetworkSettings.Networks) {
            const networks = Object.keys(containerDetails.NetworkSettings.Networks);
            if (networks.includes(networkName) || networks.includes(networkId)) {
              const containerInfo = await this.docker.getContainerInfo(container.Names[0]);
              if (containerInfo) {
                seenContainerIds.add(container.Id);
                containers.push(containerInfo);
              }
            }
          }
        } catch (error) {
          // Ignorar errores al inspeccionar contenedores individuales
          continue;
        }
      }

      return containers;
    } catch (error) {
      console.error(`Error obteniendo contenedores de la red ${networkName}:`, error);
      return [];
    }
  }






}