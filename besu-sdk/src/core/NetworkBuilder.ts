/**
 * NetworkBuilder - Fluent API for constructing Besu networks
 * 
 * This class provides an elegant builder pattern interface for creating
 * Besu networks. It ensures all required configuration is provided before
 * allowing network creation, making it impossible to create invalid configurations.
 */

import { NetworkConfig, NodeConfig } from '../types';
import { validateNetworkConfig } from '../validators/config';
import { Network } from './Network';
import { DockerManager } from '../services/DockerManager';
import { FileManager } from '../services/FileManager';
import { SystemValidator } from '../services/SystemValidator';
import { 
  ConfigurationValidationError, 
  ChainIdConflictError, 
  SubnetConflictError, 
  DuplicateNodeNameError, 
  IPAddressConflictError 
} from '../errors';
import { logger } from '../utils/logger';
import * as path from 'path';

/**
 * Builder state to track which required fields have been set
 */
interface BuilderState {
  chainId?: number;
  blockPeriodSeconds?: number;
  networkName?: string;
  subnet?: string;
  nodes: NodeConfig[];
  baseDataDir?: string;
  // Removed: dockerOptions - always use local Docker
}

/**
 * Options for adding a node to the network
 */
interface AddNodeOptions {
  /** Enable JSON-RPC interface */
  rpc?: boolean;
  
  /** Host port for RPC mapping */
  rpcPort?: number;
  
  /** Optional seed to generate a deterministic identity for this node */
  identitySeed?: string;
  
  /** Initial balance to fund the node with, specified in Ether */
  initialBalance?: string;
}

/**
 * BesuNetworkBuilder provides a fluent API for network configuration
 *
 * Example usage:
 * ```typescript
 * const network = await new BesuNetworkBuilder()
 *   .withChainId(1337) [required]
 *   .withBlockPeriod(5) [required]
 *   .withNetworkName('funded-network') [optional]
 *       // 💡 if no name is provided, a default name will be generated
 *       // 💡 auto-detect pre-existing Docker networks
 *   .withSubnet('172.20.0.0/16') [required]
 *   .addValidator('validator-rich', '172.20.0.10', { identitySeed: 'my-seed', initialBalance: '1000' }) [optional] 
 *     // 💡 if no seed is provided, a random identity will be generated
 *     // 💡 WARNING: Never use predictable seeds or reuse seeds in production environments.
 *   .addNode('rpc-node', '172.20.0.11', { rpc: true, rpcPort: 8545, initialBalance: '2.5' }) [optional]
 *     .addRpcNode('rpc-2', '172.20.0.12', 8545, { initialBalance: '10' }) [optional] // alternatively to .addNode
 *   .withDataDirectory('./my-network-data') [optional]

 *   .build();
 * ```
 */
export class BesuNetworkBuilder {
  private state: BuilderState = {
    nodes: []
  };
  private readonly log = logger.child('NetworkBuilder');
  
  /**
   * Set the Ethereum chain ID
   * 
   * @param chainId Unique chain identifier
   * @returns Builder instance for chaining
   */
  withChainId(chainId: number): this {
    if (!Number.isInteger(chainId) || chainId <= 0) {
      throw new ConfigurationValidationError(
        'chainId',
        'Must be a positive integer',
        chainId
      );
    }
    
    this.state.chainId = chainId;
    return this;
  }
  
  /**
   * Set the block creation period for Clique consensus
   * 
   * @param seconds Time between blocks in seconds
   * @returns Builder instance for chaining
   */
  withBlockPeriod(seconds: number): this {
    if (!Number.isInteger(seconds) || seconds < 1) {
      throw new ConfigurationValidationError(
        'blockPeriodSeconds',
        'Must be a positive integer (minimum 1)',
        seconds
      );
    }
    
    this.state.blockPeriodSeconds = seconds;
    return this;
  }
  
  /**
   * Set the Docker network name
   * 
   * @param name Name for the Docker network
   * @returns Builder instance for chaining
   */
  withNetworkName(name: string): this {
    if (!name || typeof name !== 'string') {
      throw new ConfigurationValidationError(
        'networkName',
        'Must be a non-empty string',
        name
      );
    }
    
    const networkNameRegex = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;
    if (!networkNameRegex.test(name)) {
      throw new ConfigurationValidationError(
        'networkName',
        'Must start with alphanumeric and contain only alphanumeric, underscore, period, or hyphen',
        name
      );
    }
    
    this.state.networkName = name;
    return this;
  }
  
  /**
   * Set the subnet for the Docker network
   * 
   * @param subnet Subnet in CIDR notation (e.g., "172.20.0.0/16")
   * @returns Builder instance for chaining
   */
  withSubnet(subnet: string): this {
    // Basic format validation - full validation happens in validateNetworkConfig
    const subnetRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    if (!subnetRegex.test(subnet)) {
      throw new ConfigurationValidationError(
        'subnet',
        'Must be in CIDR notation (e.g., "172.20.0.0/16")',
        subnet
      );
    }
    
    this.state.subnet = subnet;
    return this;
  }
  
  /**
   * Add a validator node to the network
   * 
   * Validators participate in block production in Clique consensus.
   * At least one validator is required for the network to function.
   * 
   * 💡 The SDK automatically uses running validators as bootnodes for new nodes.
   * 💡 This abstracts the manual `--bootnodes` flag from `docker run` commands.
   * 
   * 💡 A 2-validator setup is inherently unstable and can lead to consensus stalls.
   * 💡 Recommended: Use 1 validator for simple tests, or 3+ for reliable networks.
   * 
   * @param name Unique name for the node
   * @param ip IP address within the subnet
   * @param options Additional node options (identity seed, initial balance)
   * @returns Builder instance for chaining
   */
  addValidator(name: string, ip: string, options?: { identitySeed?: string; initialBalance?: string }): this {
    this.validateNodeBasics(name, ip);
    
    this.state.nodes.push({
      name,
      ip,
      validator: true,
      identitySeed: options?.identitySeed,
      initialBalance: options?.initialBalance
    });
    
    return this;
  }
  
  /**
   * Add a regular (non-validator) node to the network.
   * 
   * Example usage:
   * .addNode('regular-node', '172.20.0.10') // Basic node (not validator, not RPC)
   * .addNode('rpc-node', '172.20.0.11', { rpc: true, rpcPort: 8545, initialBalance: '10' }) // Node with RPC and custom balance
   * .addNode('api-node', '172.20.0.12', { rpc: true, initialBalance: '5.5' }) // Enable RPC with specific balance
   * 
   * @param name Unique name for the node
   * @param ip IP address within the subnet
   * @param options Additional node options (RPC settings, initial balance)
   * @returns Builder instance for chaining
   */
  addNode(
    name: string,
    ip: string,
    options?: AddNodeOptions
  ): this {
    this.validateNodeBasics(name, ip);
    
    if (options?.rpcPort) {
      if (!Number.isInteger(options.rpcPort) || options.rpcPort < 1 || options.rpcPort > 65535) {
        throw new ConfigurationValidationError(
          'rpcPort',
          'Must be an integer between 1 and 65535',
          options.rpcPort
        );
      }
    }
    
    this.state.nodes.push({
      name,
      ip,
      validator: false,
      rpc: options?.rpc,
      rpcPort: options?.rpcPort,
      identitySeed: options?.identitySeed,
      initialBalance: options?.initialBalance
    });
    
    return this;
  }
  
  /**
   * Add an RPC node to the network
   * 
   * Convenience method that creates a non-validator node with RPC enabled.
   * 
   * @param name Unique name for the node
   * @param ip IP address within the subnet
   * @param port Host port for RPC (default: 8545)
   * @param options Additional node options (identity seed, initial balance)
   * @returns Builder instance for chaining
   */
  addRpcNode(name: string, ip: string, port = 8545, options?: { identitySeed?: string; initialBalance?: string }): this {
    return this.addNode(name, ip, { rpc: true, rpcPort: port, identitySeed: options?.identitySeed, initialBalance: options?.initialBalance });
  }
  
  /**
   * Set the base directory for network data
   * 
   * @param dir Directory path (default: ./besu-networks)
   * @returns Builder instance for chaining
   */
  withDataDirectory(dir: string): this {
    this.state.baseDataDir = dir;
    return this;
  }
  
  /**
   * Build and optionally start the network
   * 
   * @param autoStart Whether to immediately start the network (default: true)
   * @returns Configured Network instance
   * @throws ConfigurationValidationError if configuration is incomplete or invalid
   */
  async build(autoStart = true): Promise<Network> {
    this.log.info('Building Besu network configuration...');
    
    // Check all required fields are set
    if (!this.state.chainId) {
      throw new ConfigurationValidationError('chainId', 'Chain ID is required');
    }
    
    if (!this.state.blockPeriodSeconds) {
      throw new ConfigurationValidationError('blockPeriodSeconds', 'Block period is required');
    }
    
    // Validate chainId uniqueness across existing networks
    await this.validateChainIdUnique(this.state.chainId);
    
    if (this.state.nodes.length === 0) {
      throw new ConfigurationValidationError('nodes', 'At least one node is required');
    }

    // Create service instances
    const dockerManager = new DockerManager();
    const fileManager = new FileManager();

    // Determina el nombre de la red (lo genera si es necesario)
    const networkName = this.getNetworkName();
    let subnet: string;

    // Lógica unificada: intentar adoptar primero, si no, crear.
    const networkExists = await dockerManager.networkExists(networkName);

    if (networkExists) {
      // La red existe, la adoptamos.
      this.log.info(`Network '${networkName}' already exists, automatically adopting it.`);
      const adoptedNetwork = await dockerManager.adoptNetwork(networkName);
      subnet = adoptedNetwork.subnet;

      // Actualizamos el estado con la subred detectada.
      this.state.subnet = subnet;
      this.log.info(`Detected network configuration - Subnet: ${subnet}`);
    } else {
      // La red no existe, la creamos.
      this.log.info(`Network '${networkName}' not found, proceeding to create it.`);
      // Para crear una red nueva, la subred es obligatoria.
      if (!this.state.subnet) {
        throw new ConfigurationValidationError('subnet', 'Subnet is required to create a new network.');
      }
      subnet = this.state.subnet;
      
      // Enforces unique subnets to avoid hidden network conflicts Docker silently allows.
      const existingSubnets = await this.getExistingSubnets(dockerManager);
      const conflictingNetwork = existingSubnets.find((existing: { networkName: string; subnet: string }) => existing.subnet === subnet);
      
      if (conflictingNetwork) {
        throw new SubnetConflictError(subnet, conflictingNetwork.networkName);
      }
    }
    
    // Build complete configuration
    const config: NetworkConfig = {
      chainId: this.state.chainId,
      blockPeriodSeconds: this.state.blockPeriodSeconds,
      network: {
        name: networkName,
        subnet: subnet
      },
      nodes: this.state.nodes
    };
    
    // Validate complete configuration (from validators/config.ts)
    validateNetworkConfig(config);
    
    // Validate system prerequisites (from services/SystemValidator.ts)
    await SystemValidator.checkPrerequisites(
      dockerManager.getClient(),
      config.nodes.length
    );
    
    // Create network instance
    const network = new Network(
      config,
      dockerManager,
      fileManager,
      this.state.baseDataDir
    );
    
    // Auto-start if requested
    if (autoStart) {
      this.log.info('Auto-starting network...');
      await network.setup();
    }
    
    return network;
  }
  
  /**
   * Get the network name to use, generating a default if none provided
   * 
   * @returns Network name to use
   */
  private getNetworkName(): string {
    // Si se especificó un nombre, úsalo.
    if (this.state.networkName) {
      return this.state.networkName;
    }
    
    // Si no, genera un nombre por defecto.
    const timestamp = Date.now().toString();
    const defaultName = `besu-network-${timestamp}`;
    
    this.log.info(`No network name provided, generating default: ${defaultName}`);
    this.state.networkName = defaultName; // Guardamos el nombre generado en el estado
    return defaultName;
  }
  
  /**
   * Validate that the chainId is unique across all existing networks
   * 
   * 💡 This prevents blockchain-level conflicts where transactions could 
   * be replayed across networks, wallets get confused about which network 
   * to connect to, and nonce management becomes inconsistent. Each network 
   * must have a unique chain ID for proper isolation.
   * 
   * @param chainId Chain ID to validate
   * @throws ConfigurationValidationError if chainId is already in use
   */
  private async validateChainIdUnique(chainId: number): Promise<void> {
    const fileManager = new FileManager();
    const baseDir = this.state.baseDataDir || './besu-networks';
    
    try {
      // Check if base directory exists
      const baseExists = await fileManager.exists(baseDir);
      if (!baseExists) {
        // No existing networks, chainId is unique
        return;
      }
      
      // Get all network directories
      const networkDirs = await fileManager.listDirectories(baseDir);
      
      // Check metadata of each network
      for (const networkDir of networkDirs) {
        const metadataPath = path.join(baseDir, networkDir, 'network.json');
        
        try {
          const metadataExists = await fileManager.exists(metadataPath);
          if (!metadataExists) {
            continue; // Skip networks without metadata
          }
          
          const metadata = await fileManager.readJSON(metadataPath) as any;
          
          if (metadata.chainId === chainId) {
            throw new ChainIdConflictError(chainId, metadata.name);
          }
        } catch (error) {
          // If it's our validation error, re-throw it
          if (error instanceof ConfigurationValidationError) {
            throw error;
          }
          
          // Otherwise, log warning and continue (corrupted metadata file)
          this.log.warn(`Could not read metadata for network ${networkDir}`, error);
        }
      }
      
      this.log.debug(`Chain ID ${chainId} is unique across existing networks`);
    } catch (error) {
      // If it's our validation error, re-throw it
      if (error instanceof ConfigurationValidationError) {
        throw error;
      }
      
      // For other errors (like base directory not accessible), log warning
      this.log.warn('Could not validate chainId uniqueness, proceeding with creation', error);
    }
  }

  /**
   * Get all existing subnets from Docker networks
   * 
   * 💡 This prevents hard-to-debug container communication errors by enforcing a "no duplicate subnets" policy. The SDK is intentionally stricter than Docker, which allows this anti-pattern.
   * 
   * @param dockerManager DockerManager instance
   * @returns Array of objects with network name and subnet
   */
  private async getExistingSubnets(dockerManager: DockerManager): Promise<{ networkName: string; subnet: string }[]> {
    try {
      const networks = await dockerManager.getClient().listNetworks();
      const subnets: { networkName: string; subnet: string }[] = [];
      
      for (const network of networks) {
        if (network.IPAM?.Config) {
          for (const config of network.IPAM.Config) {
            if (config.Subnet) {
              subnets.push({
                networkName: network.Name,
                subnet: config.Subnet
              });
            }
          }
        }
      }
      
      return subnets;
    } catch (error) {
      this.log.warn('Could not retrieve existing subnets', error);
      return [];
    }
  }

  /**
   * Create a copy of the current builder state
   * 
   * Useful for creating variations of a base configuration.
   * 
   * @returns New builder instance with copied state
   * 
   * @example
   * // Base para tests de consenso
   * const consensusTestBase = new BesuNetworkBuilder()
   *   .withChainId(9999)
   *   .withSubnet('172.21.0.0/16')
   *   .addValidator('val-1', '172.21.0.10')
   *   .addValidator('val-2', '172.21.0.11')
   *   .addValidator('val-3', '172.21.0.12');
   * 
   * // Test con bloques rápidos
   * const fastBlocksNetwork = await consensusTestBase
   *   .clone()
   *   .withNetworkName('fast-blocks')
   *   .withBlockPeriod(1)  // 1 segundo
   *   .build();
   */
  clone(): BesuNetworkBuilder {
    const newBuilder = new BesuNetworkBuilder();
    newBuilder.state = {
      ...this.state,
      nodes: [...this.state.nodes]
    };
    return newBuilder;
  }
  
  /**
   * Reset the builder to initial state
   * 
   * @returns Builder instance for chaining
   */
  reset(): this {
    this.state = {
      nodes: []
    };
    return this;
  }
  
  /**
   * Get the current configuration (for inspection)
   * 
   * @returns Current partial configuration
   */
  getConfig(): Partial<NetworkConfig> {
    return {
      chainId: this.state.chainId,
      blockPeriodSeconds: this.state.blockPeriodSeconds,
      network: this.state.networkName && this.state.subnet ? {
        name: this.state.networkName,
        subnet: this.state.subnet
      } : undefined as any,
      nodes: [...this.state.nodes]
    };
  }
  
  /**
   * Validate basic node properties
   */
  private validateNodeBasics(name: string, ip: string): void {
    // Validate name
    if (!name || typeof name !== 'string') {
      throw new ConfigurationValidationError(
        'nodeName',
        'Must be a non-empty string',
        name
      );
    }
    
    const nodeNameRegex = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;
    if (!nodeNameRegex.test(name)) {
      throw new ConfigurationValidationError(
        'nodeName',
        'Must start with alphanumeric and contain only alphanumeric, underscore, period, or hyphen',
        name
      );
    }
    
    // Check for duplicate names
    if (this.state.nodes.some(n => n.name === name)) {
      throw new DuplicateNodeNameError(name);
    }
    
    // Validate IP format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
      throw new ConfigurationValidationError(
        'nodeIp',
        'Must be a valid IPv4 address',
        ip
      );
    }
    
    // Check for duplicate IPs
    if (this.state.nodes.some(n => n.ip === ip)) {
      const existingNode = this.state.nodes.find(n => n.ip === ip);
      throw new IPAddressConflictError(ip, existingNode?.name || 'unknown');
    }
  }
}