
import Docker from 'dockerode';
import { 
  NetworkCreateOptions, 
  ContainerOptions, 
  NetworkInfo,
  ContainerInfo
} from './types';

/**
 * Clase para gestionar contenedores y redes Docker
 */
export class DockerManager {
  private docker: Docker;

  /**
   * Constructor de la clase DockerManager
   * @param options Opciones de conexión a Docker (opcional)
   */
  constructor(options?: Docker.DockerOptions) {
    this.docker = new Docker(options);
  }

  /**
   * Crea una nueva red Docker
   * @param options Opciones para crear la red
   * @returns Promise con el ID de la red creada
   */
  async createNetwork(options: NetworkCreateOptions): Promise<string> {
    const { name, subnet, labels = {} } = options;

    const networkOptions: Docker.NetworkCreateOptions = {
      Name: name,
      CheckDuplicate: true,
      Driver: 'bridge',
      IPAM: {
        Driver: 'default',
        Config: [
          {
            Subnet: subnet
          }
        ]
      },
      Labels: labels
    };

    try {
      const network = await this.docker.createNetwork(networkOptions);
      return network.id;
    } catch (error) {
      throw new Error(`Error al crear la red: ${(error as Error).message}`);
    }
  }

  /**
   * Crea un nuevo contenedor Docker
   * @param options Opciones para crear el contenedor
   * @returns Promise con el ID del contenedor creado
   */
  async createContainer(options: ContainerOptions): Promise<string> {
    const { name, ip, networkName, ...containerOptions } = options;

    try {
      // Crear el contenedor
      const container = await this.docker.createContainer({
        ...containerOptions,
        name
      });

      const containerId = container.id;

      // Si se especifica una red, conectar el contenedor a ella
      if (networkName) {
        const network = this.docker.getNetwork(networkName);
        
        const networkConnectOptions: Docker.NetworkConnectOptions = {
          Container: containerId
        };

        // Si se especifica una IP, configurarla
        if (ip) {
          networkConnectOptions.EndpointConfig = {
            IPAddress: ip
          };
        }

        await network.connect(networkConnectOptions);
      }

      // Iniciar el contenedor
      await container.start();
      
      return containerId;
    } catch (error) {
      throw new Error(`Error al crear el contenedor: ${(error as Error).message}`);
    }
  }

  /**
   * Elimina un contenedor Docker
   * @param nameOrId Nombre o ID del contenedor a eliminar
   * @param force Si es true, fuerza la eliminación incluso si está en ejecución
   * @returns Promise que se resuelve cuando el contenedor ha sido eliminado
   */
  async removeContainer(nameOrId: string, force: boolean = true): Promise<void> {
    try {
      const container = this.docker.getContainer(nameOrId);
      await container.remove({ force });
    } catch (error) {
      throw new Error(`Error al eliminar el contenedor: ${(error as Error).message}`);
    }
  }

  /**
   * Elimina todos los contenedores conectados a una red específica
   * @param networkNameOrId Nombre o ID de la red
   * @returns Promise que se resuelve cuando todos los contenedores han sido eliminados
   */
  async removeContainersInNetwork(networkNameOrId: string): Promise<void> {
    try {
      // Obtener información de la red
      const network = this.docker.getNetwork(networkNameOrId);
      const networkInfo = await network.inspect();
      
      // Obtener los contenedores conectados a la red
      const containerIds = Object.keys(networkInfo.Containers || {});
      
      // Eliminar cada contenedor
      for (const containerId of containerIds) {
        await this.removeContainer(containerId);
      }
    } catch (error) {
      throw new Error(`Error al eliminar los contenedores de la red: ${(error as Error).message}`);
    }
  }

  /**
   * Elimina una red Docker y opcionalmente todos sus contenedores
   * @param networkNameOrId Nombre o ID de la red a eliminar
   * @param removeContainers Si es true, elimina todos los contenedores conectados a la red
   * @returns Promise que se resuelve cuando la red ha sido eliminada
   */
  async removeNetwork(networkNameOrId: string, removeContainers: boolean = true): Promise<void> {
    try {
      // Si se solicita, eliminar primero los contenedores
      if (removeContainers) {
        await this.removeContainersInNetwork(networkNameOrId);
      }
      
      // Eliminar la red
      const network = this.docker.getNetwork(networkNameOrId);
      await network.remove();
    } catch (error) {
      throw new Error(`Error al eliminar la red: ${(error as Error).message}`);
    }
  }

  /**
   * Obtiene información detallada de una red Docker
   * @param networkNameOrId Nombre o ID de la red
   * @returns Promise con la información de la red
   */
  async getNetworkInfo(networkNameOrId: string): Promise<NetworkInfo> {
    try {
      const network = this.docker.getNetwork(networkNameOrId);
      const info = await network.inspect();
      
      const containers = await Promise.all(
        Object.entries(info.Containers || {}).map(async ([id, container]) => {
          const containerInfo = await this.docker.getContainer(id).inspect();
          return {
            id,
            name: containerInfo.Name.replace(/^\//, ''),
            ip: (container as any).IPv4Address?.split('/')[0]
          };
        })
      );

      return {
        id: info.Id,
        name: info.Name,
        config: {
          subnet: info.IPAM?.Config?.[0]?.Subnet,
          gateway: info.IPAM?.Config?.[0]?.Gateway
        },
        containers
      };
    } catch (error) {
      throw new Error(`Error al obtener información de la red: ${(error as Error).message}`);
    }
  }

  /**
   * Obtiene información detallada de un contenedor Docker
   * @param containerNameOrId Nombre o ID del contenedor
   * @returns Promise con la información del contenedor
   */
  async getContainerInfo(containerNameOrId: string): Promise<ContainerInfo> {
    try {
      const container = this.docker.getContainer(containerNameOrId);
      const info = await container.inspect();
      
      const networks = Object.entries(info.NetworkSettings.Networks || {}).map(([name, network]) => ({
        name,
        ip: network.IPAddress
      }));

      return {
        id: info.Id,
        name: info.Name.replace(/^\//, ''),
        state: info.State.Status,
        networks
      };
    } catch (error) {
      throw new Error(`Error al obtener información del contenedor: ${(error as Error).message}`);
    }
  }
} 
