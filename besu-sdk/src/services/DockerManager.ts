/**
 * Docker management service for the Besu SDK
 * 
 * 💡 Manages only Docker resources labeled besu-sdk=true for clean, isolated Besu network operations.
 * 
 * This service provides a high-level interface to Docker operations required
 * by the SDK. It uses Dockerode for direct Docker API communication, ensuring
 * cross-platform compatibility and robust error handling. 
 * 
 */

import Docker from 'dockerode';
import { DockerOperationError, BesuImageNotFoundError, NetworkAlreadyExistsError, NetworkNotFoundError, ContainerStateTimeoutError, UnexpectedContainerStateError } from '../errors';
import { logger } from '../utils/logger';
import { ContainerOptions } from '../types';

/**
 * Docker container state information
 */
interface ContainerState {
  running: boolean;
  paused: boolean;
  restarting: boolean;
  dead: boolean;
  status: string;
}

/**
 * DockerManager handles all Docker operations for the Besu network
 * 
 * Responsibilities include:
 * - Creating and managing Docker networks
 * - Creating and managing Besu containers
 * - Pulling required images
 * - Health checking and monitoring
 */
export class DockerManager {
  private docker: Docker;
  private readonly log = logger.child('DockerManager');
  private readonly besuImage = 'hyperledger/besu:latest';
  
  constructor() {
    this.docker = new Docker();
    this.log.debug('DockerManager initialized with local Docker');
  }
  
  /**
   * Get the Docker client instance
   * Useful for system validation and advanced operations
   */
  getClient(): Docker {
    return this.docker;
  }
  
  /**
   * Create a Docker network for node communication
   * 
   * @param name Network name
   * @param subnet Subnet in CIDR notation (e.g., '172.16.0.0/16')
   * @returns Created network object
   * @throws DockerOperationError on failure
   * @throws NetworkAlreadyExistsError if network exists
   */
  async createNetwork(name: string, subnet: string): Promise<Docker.Network> {
    try {
      // Check if network already exists
      const exists = await this.networkExists(name);
      if (exists) {
        throw new NetworkAlreadyExistsError(name);
      }
      
      this.log.info(`Creating Docker network: ${name} with subnet ${subnet}`);
      
      const network = await this.docker.createNetwork({
        Name: name,
        Driver: 'bridge',
        CheckDuplicate: true,
        IPAM: {
          Driver: 'default',
          Config: [{
            Subnet: subnet,
            Gateway: this.getGatewayIP(subnet)
          }]
        },
        Labels: {
          'besu-sdk': 'true',
          'created-by': 'besu-sdk',
          'network-type': 'blockchain',
          'created-at': new Date().toISOString()
        }
      });
      
      this.log.success(`Created Docker network: ${name}`);
      return network;
    } catch (error) {
      if (error instanceof NetworkAlreadyExistsError) {
        throw error;
      }
      this.log.error(`Failed to create Docker network: ${name}`, error);
      throw new DockerOperationError('createNetwork', `Network ${name}`, error as Error);
    }
  }
  
  /**
   * Adopt an existing Docker network for Besu SDK management
   * 
   * 💡 This method allows the SDK to manage nodes within an existing Docker network
   * instead of creating a new one. The network will be verified and returned for
   * SDK management. Cleanup operations will target containers with SDK labels.
   * 
   * @param networkName Name of the existing Docker network to adopt
   * @returns The adopted network object with its configuration
   * @throws DockerOperationError if network doesn't exist or can't be adopted
   */
  async adoptNetwork(networkName: string): Promise<{ network: Docker.Network; subnet: string; gateway: string }> {
    try {
      this.log.info(`Adopting existing Docker network: ${networkName}`);
      
      // Get network object and verify it exists
      const network = this.docker.getNetwork(networkName);
      const inspectInfo = await network.inspect();
      
      // Extract network configuration
      const ipamConfig = inspectInfo.IPAM?.Config?.[0];
      if (!ipamConfig?.Subnet) {
        throw new DockerOperationError(
          'adoptNetwork',
          `Network ${networkName}`,
          new Error('Network does not have a valid subnet configuration')
        );
      }
      
      const subnet = ipamConfig.Subnet;
      const gateway = ipamConfig.Gateway || this.getGatewayIP(subnet);
      
      this.log.success(
        `Successfully adopted network: ${inspectInfo.Name} (${inspectInfo.Id}) ` +
        `with subnet ${subnet} and gateway ${gateway}`
      );
      
      return {
        network,
        subnet,
        gateway
      };
    } catch (error) {
      // Handle network not found
      if ((error as any).statusCode === 404) {
        this.log.error(`Network '${networkName}' not found`);
        throw new NetworkNotFoundError(networkName);
      }
      
      // Handle other Docker operation errors
      if (error instanceof DockerOperationError) {
        throw error;
      }
      
      this.log.error(`Failed to adopt Docker network: ${networkName}`, error);
      throw new DockerOperationError('adoptNetwork', `Network ${networkName}`, error as Error);
    }
  }
  
  /**
   * Remove a Docker network (automatically removes all containers in the network first)
   * 
   * @param network Network object or name
   * @throws DockerOperationError on failure
   */
  async removeNetwork(network: Docker.Network | string): Promise<void> {
    try {
      const networkObj = typeof network === 'string' 
        ? this.docker.getNetwork(network)
        : network;
        
      const info = await networkObj.inspect();
      const networkName = info.Name;
      
      this.log.info(`Removing Docker network: ${networkName}`);
      
      // First remove all containers from this network
      await this.removeContainers(networkName);
      
      // Then remove the network itself
      await networkObj.remove();
      this.log.success(`Removed Docker network: ${networkName}`);
    } catch (error) {
      const name = typeof network === 'string' ? network : 'unknown';
      // Ignore if network doesn't exist
      if ((error as any).statusCode === 404) {
        this.log.debug(`Network ${name} already removed`);
        return;
      }
      this.log.error(`Failed to remove Docker network: ${name}`, error);
      throw new DockerOperationError('removeNetwork', `Network ${name}`, error as Error);
    }
  }
  
  /**
   * Check if a network exists
   * 
   * @param name Network name
   * @returns True if network exists
   */
  async networkExists(name: string): Promise<boolean> {
    try {
      const networks = await this.docker.listNetworks({
        filters: { name: [name] }
      });
      return networks.some(net => net.Name === name);
    } catch (error) {
      this.log.error('Failed to list networks', error);
      return false;
    }
  }
  
  /**
   * Pull the Besu image if not present in local docker
   * 
   * @param imageName Image name (default: hyperledger/besu:latest)
   * @throws BesuImageNotFoundError if pull fails
   */
  async pullImageIfNeeded(imageName: string = this.besuImage): Promise<void> {
    try {
      // Check if image exists
      const image = this.docker.getImage(imageName);
      await image.inspect();
      this.log.debug(`Image ${imageName} already present`);
    } catch (error) {
      // Image doesn't exist, pull it
      this.log.info(`Pulling Docker image: ${imageName}`);
      
      try {
        const stream = await this.docker.pull(imageName);
        
        // Wait for pull to complete
        await new Promise((resolve, reject) => {
          this.docker.modem.followProgress(stream, (err: Error | null, output: any[]) => {
            if (err) {
              reject(err);
            } else {
              this.log.success(`Successfully pulled image: ${imageName}`);
              resolve(output);
            }
          }, (event: any) => {
            // Log pull progress
            if (event.status && event.id) {
              this.log.debug(`${event.id}: ${event.status} ${event.progress || ''}`);
            }
          });
        });
      } catch (pullError) {
        this.log.error(`Failed to pull image: ${imageName}`, pullError);
        throw new BesuImageNotFoundError(imageName);
      }
    }
  }
  
  /**
   * Create a Besu container with specified options
   * 
   * @param options Container configuration
   * @returns Created container object
   * @throws DockerOperationError on failure
   */
  async createContainer(options: ContainerOptions): Promise<Docker.Container> {
    try {
      this.log.info(`Creating container: ${options.name}`);
      
      // Ensure image is available
      await this.pullImageIfNeeded(options.image);
      
      // Build Docker container options
      const createOptions: Docker.ContainerCreateOptions = {
        name: options.name,
        Image: options.image,
        Env: options.env,
        HostConfig: {
          Binds: options.volumes,
          NetworkMode: options.networkMode,
          RestartPolicy: {
            Name: 'unless-stopped'
          },
          // Resource limits
          Memory: 1024 * 1024 * 1024, // 1GB per node
          CpuShares: 512,
          // Logging configuration
          LogConfig: {
            Type: 'json-file',
            Config: {
              'max-size': '10m',
              'max-file': '3'
            }
          }
        },
        NetworkingConfig: {
          EndpointsConfig: options.networks as any
        },
        Labels: {
          'besu-sdk': 'true',
          'created-by': 'besu-sdk',
          'created-at': new Date().toISOString()
        }
      };
      
      // Add port bindings if specified
      if (options.ports) {
        createOptions.HostConfig!.PortBindings = {};
        for (const [containerPort, config] of Object.entries(options.ports)) {
          createOptions.HostConfig!.PortBindings[`${containerPort}/tcp`] = [{
            HostPort: config.hostPort.toString()
          }];
        }
      }
      
      const container = await this.docker.createContainer(createOptions);
      this.log.success(`Created container: ${options.name}`);
      return container;
    } catch (error) {
      this.log.error(`Failed to create container: ${options.name}`, error);
      throw new DockerOperationError('createContainer', options.name, error as Error);
    }
  }
  
  /**
   * Start a container
   * 
   * @param container Container object
   * @throws DockerOperationError on failure
   */
  async startContainer(container: Docker.Container): Promise<void> {
    try {
      const info = await container.inspect();
      this.log.info(`Starting container: ${info.Name}`);
      
      await container.start();
      
      // Wait for container to be running
      await this.waitForContainerState(container, 'running', 30000);
      
      this.log.success(`Started container: ${info.Name}`);
    } catch (error) {
      this.log.error('Failed to start container', error);
      throw new DockerOperationError('startContainer', 'unknown', error as Error);
    }
  }
  
  /**
   * Stop a container
   * 
   * @param container Container object
   * @param timeout Stop timeout in seconds (default: 10)
   * @throws DockerOperationError on failure
   */
  async stopContainer(container: Docker.Container, timeout = 10): Promise<void> {
    try {
      const info = await container.inspect();
      this.log.info(`Stopping container: ${info.Name}`);
      
      await container.stop({ t: timeout });
      this.log.success(`Stopped container: ${info.Name}`);
    } catch (error) {
      // Ignore if container is already stopped
      if ((error as any).statusCode === 304) {
        this.log.debug('Container already stopped');
        return;
      }
      this.log.error('Failed to stop container', error);
      throw new DockerOperationError('stopContainer', 'unknown', error as Error);
    }
  }
  
  /**
   * Remove a container
   * 
   * @param container Container object
   * 💡 Users interact only with nodes — no need to adapt to access container name  
   * 💡 Used only in Node class, where container is accessible via this.container
   * @param force Force removal even if running
   * @throws DockerOperationError on failure
   */
  async removeContainer(container: Docker.Container, force = false): Promise<void> {
    try {
      const info = await container.inspect();
      this.log.info(`Removing container: ${info.Name}`);
      
      await container.remove({ force });
      this.log.success(`Removed container: ${info.Name}`);
    } catch (error) {
      // Ignore if container doesn't exist
      if ((error as any).statusCode === 404) {
        this.log.debug('Container already removed');
        return;
      }
      this.log.error('Failed to remove container', error);
      throw new DockerOperationError('removeContainer', 'unknown', error as Error);
    }
  }
  
  /**
   * Get container state information
   * @param container Container object
   * @returns Container state
   */
  async getContainerState(container: Docker.Container): Promise<ContainerState> {
    try {
      const info = await container.inspect();
      return {
        running: info.State.Running,
        paused: info.State.Paused,
        restarting: info.State.Restarting,
        dead: info.State.Dead,
        status: info.State.Status
      };
    } catch (error) {
      this.log.error('Failed to get container state', error);
      throw new DockerOperationError('getContainerState', 'unknown', error as Error);
    }
  }
  
  /**
   * Wait for container to reach desired state
   * 💡 Without waiting, code may run before container is ready.
   * 
   * Behavior: Polls getContainerState() repeatedly until:
   * - Desired state is reached (e.g., 'running')
   * - Timeout occurs
   * - Container enters an error state
   * 
   * @param container Container object
   * @param desiredState Desired state (e.g., 'running')
   * @param timeout Timeout in milliseconds
   * @throws Error if timeout reached
   */
  private async waitForContainerState(
    container: Docker.Container,
    desiredState: string,
    timeout: number
  ): Promise<void> {
    const startTime = Date.now();
    const checkInterval = 500; // Check every 500ms
    
    // Get container name for better error messages
    const info = await container.inspect();
    const containerName = info.Name.startsWith('/') ? info.Name.slice(1) : info.Name;
    
    while (Date.now() - startTime < timeout) {
      const state = await this.getContainerState(container);
      
      if (state.status === desiredState) {
        return;
      }
      
      if (state.dead || (state.status === 'exited' && desiredState !== 'exited')) {
        throw new UnexpectedContainerStateError(containerName, state.status);
      }
      
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    throw new ContainerStateTimeoutError(containerName, desiredState, timeout);
  }
  
  /**
   * Get container logs
   * 
   * @param container Container object
   * @param options Log options
   * @returns Log content
   */
  async getContainerLogs(
    container: Docker.Container,
    options: { tail?: number; since?: number } = {}
  ): Promise<string> {
    try {
      const stream = await container.logs({
        stdout: true,
        stderr: true,
        tail: options.tail || 100,
        since: options.since || 0
      });
      
      // Convert stream to string
      return stream.toString('utf8');
    } catch (error) {
      this.log.error('Failed to get container logs', error);
      throw new DockerOperationError('getContainerLogs', 'unknown', error as Error);
    }
  }
  
  /**
   * Execute a command inside a container
   * 
   * @param container Container object
   * @param command Command array (e.g., ['besu', '--version'])
   * @returns Command output
   * 
   * Usage examples:
   * await executeSystemCommand(container, ['ps', 'aux']); // List running processes.
   * await executeSystemCommand(container, ['ls', '/opt/besu']); // List Besu files.
   * await executeSystemCommand(container, ['cat', '/var/log/besu.log']); // View system logs.
   * await executeSystemCommand(container, ['df', '-h']); // Check disk space.
   * await executeSystemCommand(container, ['besu', '--version']); // Get Besu CLI version.
   */
  async executeSystemCommand(container: Docker.Container, command: string[]): Promise<string> {
    try {
      const exec = await container.exec({
        Cmd: command,
        AttachStdout: true,
        AttachStderr: true
      });
      
      const stream = await exec.start({ Detach: false });
      
      return new Promise((resolve, reject) => {
        let output = '';
        stream.on('data', (chunk: Buffer) => {
          output += chunk.toString('utf8');
        });
        stream.on('end', () => resolve(output));
        stream.on('error', reject);
      });
    } catch (error) {
      this.log.error('Failed to execute command in container', error);
      throw new DockerOperationError('executeSystemCommand', command.join(' '), error as Error);
    }
  }
  
  /**
   * List all containers with besu-sdk label
   * 
   * @param networkName Optional network name to filter containers
   * @returns Array of container info
   */
  async listContainers(networkName?: string): Promise<Docker.ContainerInfo[]> {
    try {
      const containers = await this.docker.listContainers({
        all: true,
        filters: {
          label: ['besu-sdk=true']
        }
      });
      
      // Si no se especifica red, devuelve todos
      if (!networkName) {
        return containers;
      }
      
      // Si se especifica red, filtra por esa red
      return containers.filter(container => 
        container.NetworkSettings?.Networks && 
        Object.keys(container.NetworkSettings.Networks).includes(networkName)
      );
    } catch (error) {
      this.log.error('Failed to list Besu containers', error);
      return [];
    }
  }

  /**
   * List all networks with besu-sdk label
   * 
   * @returns Array of network info
   */
  async listNetworks(): Promise<any[]> {
    try {
      const networks = await this.docker.listNetworks({
        filters: { label: ['besu-sdk=true'] }
      });
      return networks;
    } catch (error) {
      this.log.error('Failed to list Besu networks', error);
      return [];
    }
  }

  /**
   * Remove containers with besu-sdk label
   * @param networkName Optional network name to filter containers. If not specified, removes containers from ALL networks
   */
  async removeContainers(networkName?: string): Promise<void> {
    if (networkName) {
      this.log.info(`Removing all containers from network: ${networkName}`);
    } else {
      this.log.info('Removing all besu-sdk containers from ALL networks');
    }
    
    // Use the enhanced listContainers with optional networkName
    const containers = await this.listContainers(networkName);
    
    for (const containerInfo of containers) {
      try {
        const container = this.docker.getContainer(containerInfo.Id);
        await this.removeContainer(container, true);
        
        if (networkName) {
          this.log.success(`Removed container from ${networkName}: ${containerInfo.Names[0]}`);
        } else {
          this.log.success(`Removed container: ${containerInfo.Names[0]}`);
        }
      } catch (error) {
        this.log.error(`Failed to remove container ${containerInfo.Names[0]}`, error);
      }
    }
    
    if (networkName) {
      this.log.success(`All containers removed from network: ${networkName}`);
    } else {
      this.log.success('All besu-sdk containers removed from ALL networks');
    }
  }



  /**
   * Remove all besu-sdk networks (and all their containers)
   */
  async removeAllNetworks(): Promise<void> {
    this.log.warn('Removing ALL besu-sdk networks and containers');
    
    // Get all besu-sdk networks
    const networks = await this.listNetworks();
    
    // Remove each network completely (containers + network)
    for (const networkInfo of networks) {
      try {
        await this.removeNetwork(networkInfo.Name);
      } catch (error) {
        this.log.error(`Failed to remove network ${networkInfo.Name}`, error);
      }
    }
    
    this.log.success('All besu-sdk networks and containers removed');
  }

  /**
   * Complete cleanup - removes all besu-sdk resources
   * Alias for removeAllNetworks() for backward compatibility
   */
  async cleanupAll(): Promise<void> {
    await this.removeAllNetworks();
  }
  
  /**
   * Calculate gateway IP from subnet
   * 
   * @param subnet Subnet in CIDR notation
   * @returns Gateway IP (first usable IP in subnet)
   */
  private getGatewayIP(subnet: string): string {
    const [network] = subnet.split('/');
    const octets = network.split('.').map(o => parseInt(o, 10));
    
    // Use .1 as gateway (first usable IP)
    octets[3] = 1;
    
    return octets.join('.');
  }


}