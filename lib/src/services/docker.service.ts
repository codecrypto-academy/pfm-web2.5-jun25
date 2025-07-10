import Docker from 'dockerode';
import { DockerContainer, NodeConfig } from '../types';

export class DockerService {
  private docker: Docker;

  constructor() {
    this.docker = new Docker();
  }

  /**
   * Verifica si Docker está disponible
   */
  async isDockerAvailable(): Promise<boolean> {
    try {
      await this.docker.ping();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Crea una red de Docker
   */
  async createNetwork(name: string, subnet: string): Promise<void> {
    try {
      await this.docker.createNetwork({
        Name: name,
        Driver: 'bridge',
        IPAM: {
          Config: [
            {
              Subnet: subnet
            }
          ]
        }
      });
    } catch (error) {
      if ((error as any).statusCode !== 409) { // 409 = network already exists
        throw error;
      }
    }
  }

  /**
   * Elimina una red de Docker
   */
  async removeNetwork(name: string): Promise<void> {
    try {
      const network = this.docker.getNetwork(name);
      await network.remove();
    } catch (error) {
      // Network might not exist, ignore error
    }
  }

  /**
   * Crea un contenedor de Besu
   */
  async createBesuContainer(
    name: string,
    nodeConfig: NodeConfig,
    networkName: string,
    volumePath: string
  ): Promise<string> {
    const container = await this.docker.createContainer({
      Image: 'hyperledger/besu:latest',
      name,
      Hostname: name,
      Env: [
        'BESU_OPTS=-Xmx4g'
      ],
      Cmd: [
        '--config-file=/data/config.toml',
        '--data-path=/data/data',
        '--node-private-key-file=/data/key'
      ],
      HostConfig: {
        Binds: [`${volumePath}:/data`],
        NetworkMode: networkName,
        PortBindings: {
          [`${nodeConfig.port}/tcp`]: [{ HostPort: nodeConfig.port.toString() }],
          ...(nodeConfig.rpcPort && {
            [`${nodeConfig.rpcPort}/tcp`]: [{ HostPort: nodeConfig.rpcPort.toString() }]
          })
        }
      },
      Labels: {
        'network': networkName,
        'type': nodeConfig.type
      }
    });

    return container.id;
  }

  /**
   * Inicia un contenedor
   */
  async startContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);
    await container.start();
  }

  /**
   * Detiene un contenedor
   */
  async stopContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);
    await container.stop();
  }

  /**
   * Elimina un contenedor
   */
  async removeContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);
    await container.remove({ force: true });
  }

  /**
   * Obtiene el estado de los contenedores
   */
  async getContainers(): Promise<DockerContainer[]> {
    const containers = await this.docker.listContainers({ all: true });
    return containers.map(container => ({
      id: container.Id,
      name: container.Names[0]?.replace('/', '') || '',
      status: container.State,
      ports: container.Ports?.map(port => `${port.IP}:${port.PublicPort}->${port.PrivatePort}/${port.Type}`) || []
    }));
  }

  /**
   * Obtiene los logs de un contenedor
   */
  async getContainerLogs(containerId: string, tail: number = 100): Promise<string> {
    const container = this.docker.getContainer(containerId);
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail
    });
    return logs.toString();
  }

  /**
   * Espera a que un contenedor esté listo
   */
  async waitForContainerReady(containerId: string, timeout: number = 30000): Promise<boolean> {
    const container = this.docker.getContainer(containerId);
    
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), timeout);
      
      container.wait((err, data) => {
        clearTimeout(timer);
        resolve(!err && data?.StatusCode === 0);
      });
    });
  }

  /**
   * Limpia todos los contenedores de una red
   */
  async cleanupNetworkContainers(networkName: string): Promise<void> {
    const containers = await this.docker.listContainers({ all: true });
    
    for (const container of containers) {
      if (container.Labels?.network === networkName) {
        try {
          const containerInstance = this.docker.getContainer(container.Id);
          await containerInstance.remove({ force: true });
        } catch (error) {
          console.warn(`Failed to remove container ${container.Id}:`, error);
        }
      }
    }
  }
} 