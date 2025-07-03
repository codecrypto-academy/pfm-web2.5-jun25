import { DockerService } from './DockerService';
import { Logger, LogLevel } from '../utils/Logger';

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
    const networks = await this.docker.listNetworks();
    const network = networks.find(n => n.Name === networkName);
    if (!network || !network.Containers) {
      return [];
    }

    const containers: ContainerInfo[] = [];
    for (const containerId of Object.keys(network.Containers)) {
      const containerInfo = await this.docker.getContainerInfo(network.Containers[containerId].Name);
      if (containerInfo) {
        containers.push(containerInfo);
      }
    }

    return containers;
  }

  /**
   * Crea un contenedor con un nodo besu dentro de una red determinada
   * @param options Opciones del contenedor
   * @returns ID del contenedor creado
   */
  async createBesuContainer(options: {
    name: string;
    network: string;
    rpcPort: string;
    p2pPort: string;
    volumes?: string[];
    additionalOptions?: Record<string, string>;
  }): Promise<string> {
    const containerOptions = {
      name: options.name,
      image: 'hyperledger/besu:latest',
      network: options.network,
      volumes: options.volumes || [],
      ports: {
        [options.rpcPort]: '8545',
        [options.p2pPort]: '30303'
      },
      command: [
        '--data-path=/data',
        '--rpc-http-enabled',
        '--rpc-http-host=0.0.0.0',
        '--host-allowlist=*',
        '--rpc-http-cors-origins=*'
      ],
      environment: options.additionalOptions
    };

    return await this.docker.runContainer(containerOptions);
  }

  /**
   * Elimina un contenedor de una red docker
   * @param containerName Nombre del contenedor
   */
  async removeContainer(containerName: string): Promise<void> {
    await this.docker.stopContainer(containerName);
  }

  /**
   * Recupera la información de un contenedor determinado
   * @param containerName Nombre del contenedor
   * @returns Información del contenedor
   */
  async getContainerInfo(containerName: string): Promise<ContainerInfo | null> {
    return await this.docker.getContainerInfo(containerName);
  }
}