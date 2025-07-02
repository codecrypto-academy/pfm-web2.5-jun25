import Docker from 'dockerode';
import { EventEmitter } from 'events';
import { 
  BesuNetworkConfig, 
  BesuNodeConfig, 
  NetworkInfo,
  NodeInfo,
  NetworkStatus,
  BesuNetworkManagerConfig,
  ValidationOptions
} from './types.js';
import { KeyGenerator } from './KeyGenerator.js';
import { GenesisGenerator } from './GenesisGenerator.js';
import { ConfigGenerator } from './ConfigGenerator.js';
import { NetworkManagerHelper } from './NetworkManagerHelper.js';
import { ValidationHelper } from './ValidationHelper.js';
import { DockerCleanupHelper } from './DockerCleanupHelper.js';
import { 
  DEFAULT_VALIDATION_OPTIONS,
  DOCKER_LABELS,
  NAMING_PATTERNS,
  DISCOVERY_CONFIG,
  NODE_STATUS
} from './constants.js';

/**
 * Main class for managing Hyperledger Besu networks with Clique consensus
 */
export class NetworkManager extends EventEmitter {
  private docker: Docker;
  private keyGenerator: KeyGenerator;
  private genesisGenerator: GenesisGenerator;
  private configGenerator: ConfigGenerator;
  private networks: Map<string, NetworkInfo> = new Map();
  private ipPools: Map<string, Set<string>> = new Map();
  private dockerAvailable: boolean = false;
  private validationOptions: ValidationOptions;

  constructor(config?: BesuNetworkManagerConfig) {
    super();
    this.docker = config?.dockerSocket ? new Docker({ socketPath: config.dockerSocket }) : new Docker();
    this.keyGenerator = new KeyGenerator();
    this.genesisGenerator = new GenesisGenerator();
    this.configGenerator = new ConfigGenerator();
    
    // Set up validation options with defaults
    this.validationOptions = {
      ...DEFAULT_VALIDATION_OPTIONS,
      ...config?.validation
    };
    
    // Test Docker availability on initialization
    this.checkDockerAvailability();
  }

  /**
   * Create a new Besu network
   */
  async createNetwork(config: BesuNetworkConfig): Promise<NetworkInfo> {
    // Apply defaults before validation
    const configWithDefaults = NetworkManagerHelper.applyConfigDefaults(config);
    await ValidationHelper.validateConfig(configWithDefaults, this.validationOptions, this.networks, this.docker);
    
    // Check Docker availability first
    if (!this.dockerAvailable) {
      await this.refreshDockerStatus();
      if (!this.dockerAvailable) {
        throw new Error(
          'Docker is not available. Please ensure Docker is installed and running. ' +
          'Use NetworkManager.isDockerAvailable() to check status.'
        );
      }
    }

    // Ensure Besu Docker image exists
    const besuImage = `hyperledger/besu:${configWithDefaults.besuVersion}`;
    await NetworkManagerHelper.ensureImageExists(this.docker, besuImage);
    
    // Perform comprehensive cleanup of any existing resources
    await DockerCleanupHelper.performNetworkCleanup(this.docker, configWithDefaults.networkId);
    
    // Clean up any existing network info in our internal storage
    if (this.networks.has(configWithDefaults.networkId)) {
      console.info(`Removing existing network info for: ${configWithDefaults.networkId}`);
      this.networks.delete(configWithDefaults.networkId);
      this.ipPools.delete(configWithDefaults.networkId);
    }
    
    try {
      // Create Docker network
      const dockerNetwork = await this.createDockerNetwork(configWithDefaults);
      
      // Generate subnet IP pool
      const ipPool = NetworkManagerHelper.generateIpPool(configWithDefaults.subnet);
      this.ipPools.set(configWithDefaults.networkId, ipPool);
      
      // Generate genesis block
      const genesis = this.genesisGenerator.generateGenesis(configWithDefaults);
      
      // Create network info
      const networkInfo: NetworkInfo = {
        networkId: configWithDefaults.networkId,
        config: configWithDefaults,
        dockerNetworkId: dockerNetwork.id,
        nodes: new Map(),
        genesis,
        status: 'creating',
        createdAt: new Date(),
        subnet: configWithDefaults.subnet
      };
      
      this.networks.set(configWithDefaults.networkId, networkInfo);
      
      // Create bootnode first
      const bootnodeConfig = NetworkManagerHelper.createBootnodeConfig(configWithDefaults);
      await this.addNode(configWithDefaults.networkId, bootnodeConfig);
      
      // Create initial nodes
      for (const nodeConfig of configWithDefaults.nodes || []) {
        await this.addNode(configWithDefaults.networkId, nodeConfig);
      }
      
      networkInfo.status = 'running';
      this.emit('networkCreated', networkInfo);
      
      return networkInfo;
    } catch (error) {
      this.emit('error', error);
      throw new Error(`Failed to create network: ${error}`);
    }
  }

  /**
   * Delete a network and all its nodes
   */
  async deleteNetwork(networkId: string): Promise<void> {
    const networkInfo = this.networks.get(networkId);
    if (!networkInfo) {
      throw new Error(`Network ${networkId} not found`);
    }

    try {
      networkInfo.status = 'deleting';
      
      // Stop and remove all containers
      for (const [nodeId] of networkInfo.nodes) {
        await this.removeNode(networkId, nodeId);
      }
      
      // Remove Docker network
      const dockerNetwork = this.docker.getNetwork(networkInfo.dockerNetworkId);
      await dockerNetwork.remove();
      
      // Clean up
      this.networks.delete(networkId);
      this.ipPools.delete(networkId);
      
      this.emit('networkDeleted', networkId);
    } catch (error) {
      this.emit('error', error);
      throw new Error(`Failed to delete network: ${error}`);
    }
  }

  /**
   * Add a new node to an existing network
   */
  async addNode(networkId: string, nodeConfig: BesuNodeConfig): Promise<NodeInfo> {
    const networkInfo = this.networks.get(networkId);
    if (!networkInfo) {
      throw new Error(`Network ${networkId} not found`);
    }

    // Ensure Besu Docker image exists
    const besuImage = `hyperledger/besu:${networkInfo.config.besuVersion || 'latest'}`;
    await NetworkManagerHelper.ensureImageExists(this.docker, besuImage);

    try {
      // Generate node credentials if not provided
      const credentials = nodeConfig.credentials || this.keyGenerator.generateKeyPair();
      
      // Assign IP address
      const ip = nodeConfig.ip || this.allocateIp(networkId);
      
      // Generate node configuration
      const containerConfig = this.configGenerator.generateNodeConfig(
        nodeConfig, 
        credentials, 
        networkInfo,
        ip
      );
      
      console.info(`Creating container with name: ${containerConfig.name}`);
      console.info(`Network config:`, containerConfig.NetworkingConfig);
      
      // Create and start container
      const container = await this.docker.createContainer(containerConfig);
      console.info(`Container created with ID: ${container.id}`);
      
      await container.start();
      console.info(`Container started successfully: ${containerConfig.name}`);
      
      // Container is already connected to network via NetworkingConfig
      
      const nodeInfo: NodeInfo = {
        id: nodeConfig.id,
        type: nodeConfig.type,
        containerId: container.id,
        containerName: containerConfig.name,
        ip,
        credentials,
        config: nodeConfig,
        status: 'running',
        createdAt: new Date()
      };
      
      networkInfo.nodes.set(nodeConfig.id, nodeInfo);
      this.emit('nodeAdded', networkId, nodeInfo);
      
      return nodeInfo;
    } catch (error) {
      this.emit('error', error);
      throw new Error(`Failed to add node: ${error}`);
    }
  }

  /**
   * Remove a node from the network
   */
  async removeNode(networkId: string, nodeId: string): Promise<void> {
    const networkInfo = this.networks.get(networkId);
    if (!networkInfo) {
      throw new Error(`Network ${networkId} not found`);
    }

    const nodeInfo = networkInfo.nodes.get(nodeId);
    if (!nodeInfo) {
      throw new Error(`Node ${nodeId} not found in network ${networkId}`);
    }

    try {
      // Stop and remove container
      const container = this.docker.getContainer(nodeInfo.containerId);
      await container.stop();
      await container.remove();
      
      // Free IP address
      this.freeIp(networkId, nodeInfo.ip);
      
      // Remove from network
      networkInfo.nodes.delete(nodeId);
      
      this.emit('nodeRemoved', networkId, nodeId);
    } catch (error) {
      this.emit('error', error);
      throw new Error(`Failed to remove node: ${error}`);
    }
  }

  /**
   * Get network information
   */
  getNetworkInfo(networkId: string): NetworkInfo | undefined {
    return this.networks.get(networkId);
  }

  /**
   * List all networks
   */
  listNetworks(): NetworkInfo[] {
    return Array.from(this.networks.values());
  }

  /**
   * Get node information
   */
  getNodeInfo(networkId: string, nodeId: string): NodeInfo | undefined {
    const networkInfo = this.networks.get(networkId);
    return networkInfo?.nodes.get(nodeId);
  }

  /**
   * Update node configuration
   */
  async updateNode(networkId: string, nodeId: string, updates: Partial<BesuNodeConfig>): Promise<NodeInfo> {
    const nodeInfo = this.getNodeInfo(networkId, nodeId);
    if (!nodeInfo) {
      throw new Error(`Node ${nodeId} not found in network ${networkId}`);
    }

    // For now, we'll remove and recreate the node with new config
    // In a production environment, you might want to implement hot-reloading
    await this.removeNode(networkId, nodeId);
    
    const updatedConfig = { ...nodeInfo.config, ...updates };
    return await this.addNode(networkId, updatedConfig);
  }

  /**
   * Get network status
   */
  async getNetworkStatus(networkId: string): Promise<NetworkStatus> {
    const networkInfo = this.networks.get(networkId);
    if (!networkInfo) {
      throw new Error(`Network ${networkId} not found`);
    }

    const nodeStatuses = new Map<string, string>();
    
    for (const [nodeId, nodeInfo] of networkInfo.nodes) {
      try {
        const container = this.docker.getContainer(nodeInfo.containerId);
        const inspectData = await container.inspect();
        nodeStatuses.set(nodeId, inspectData.State.Status);
      } catch (error) {
        nodeStatuses.set(nodeId, 'error');
      }
    }

    return {
      networkId,
      status: networkInfo.status,
      nodeCount: networkInfo.nodes.size,
      nodeStatuses,
      uptime: Date.now() - networkInfo.createdAt.getTime()
    };
  }

  /**
   * Check if Docker daemon is available
   */
  private async checkDockerAvailability(): Promise<void> {
    try {
      await this.docker.ping();
      this.dockerAvailable = true;
      this.emit('dockerConnected');
    } catch (error: any) {
      this.dockerAvailable = false;
      this.emit('dockerUnavailable', {
        code: error.code,
        message: error.message,
        suggestions: NetworkManagerHelper.getDockerErrorSuggestions(error.code)
      });
    }
  }

  /**
   * Check if Docker is available
   */
  isDockerAvailable(): boolean {
    return this.dockerAvailable;
  }

  /**
   * Force Docker availability check
   */
  async refreshDockerStatus(): Promise<boolean> {
    await this.checkDockerAvailability();
    return this.dockerAvailable;
  }

  /**
   * Discover and restore networks from existing Docker resources
   */
  async discoverExistingNetworks(): Promise<void> {
    try {
      console.info('Discovering existing Besu networks...');
      
      // Find all Docker networks with our naming pattern
      const networks = await this.docker.listNetworks({
        filters: { name: [DISCOVERY_CONFIG.NETWORK_FILTER_PREFIX] }
      });

      for (const networkInfo of networks) {
        if (!networkInfo.Name || !networkInfo.Name.startsWith(DISCOVERY_CONFIG.NETWORK_FILTER_PREFIX)) continue;
        
        const networkId = networkInfo.Name.replace(DISCOVERY_CONFIG.NETWORK_FILTER_PREFIX, '');
        
        // Skip if we already have this network in memory
        if (this.networks.has(networkId)) continue;
        
        console.info(`Discovering network: ${networkId}`);
        
        // Get detailed network information
        const network = this.docker.getNetwork(networkInfo.Id);
        const details = await network.inspect();
        
        // Find containers in this network
        const containers = await this.docker.listContainers({
          all: true,
          filters: {
            network: [networkInfo.Name]
          }
        });
        
        // Reconstruct network info
        const nodes = new Map<string, NodeInfo>();
        
        for (const containerInfo of containers) {
          if (!containerInfo.Names?.[0]?.includes(`${DISCOVERY_CONFIG.NETWORK_FILTER_PREFIX}${networkId}-`)) continue;
          
          try {
            const container = this.docker.getContainer(containerInfo.Id);
            const containerDetails = await container.inspect();
            
            // Extract node information from container labels or names
            const nodeId = containerDetails.Config.Labels?.[DOCKER_LABELS.NODE_ID] || 
                          containerInfo.Names?.[0]?.split('-').slice(-2)[0] || 'unknown'; // fallback parsing
            const nodeType = containerDetails.Config.Labels?.[DOCKER_LABELS.NODE_TYPE] || 'rpc';
            
            // Get IP address from network settings
            const networkSettings = containerDetails.NetworkSettings.Networks[networkInfo.Name];
            const ip = networkSettings?.IPAddress || DISCOVERY_CONFIG.DEFAULT_IP;
            
            const nodeInfo: NodeInfo = {
              id: nodeId,
              type: nodeType as any,
              containerId: containerInfo.Id,
              containerName: containerInfo.Names?.[0]?.replace('/', '') || `container-${containerInfo.Id.slice(0, 12)}`,
              ip,
              credentials: {
                address: DISCOVERY_CONFIG.PLACEHOLDER_ADDRESS,
                privateKey: DISCOVERY_CONFIG.PLACEHOLDER_PRIVATE_KEY,
                publicKey: DISCOVERY_CONFIG.PLACEHOLDER_PUBLIC_KEY
              },
              config: {
                id: nodeId,
                type: nodeType as any,
                rpcPort: 8545,
                p2pPort: 30303
              },
              status: (containerInfo.State === 'running' ? NODE_STATUS.RUNNING : NODE_STATUS.STOPPED) as any,
              createdAt: new Date(containerInfo.Created * 1000)
            };
            
            nodes.set(nodeId, nodeInfo);
          } catch (error) {
            console.warn(`Failed to inspect container ${containerInfo.Names[0]}:`, error);
          }
        }
        
        // Try to extract configuration from existing resources
        const extractedConfig = await this.extractNetworkConfig(networkInfo, details, containers);
        
        // Create network info with extracted or default values
        const restoredNetworkInfo: NetworkInfo = {
          networkId,
          config: {
            networkId,
            chainId: extractedConfig.chainId,
            subnet: extractedConfig.subnet,
            name: extractedConfig.name,
            besuVersion: extractedConfig.besuVersion,
            nodes: [],
            genesis: extractedConfig.genesis || {},
            env: extractedConfig.env || {}
          },
          dockerNetworkId: networkInfo.Id,
          nodes,
          genesis: extractedConfig.genesis || {},
          status: 'running',
          createdAt: new Date(details.Created),
          subnet: extractedConfig.subnet
        };
        
        this.networks.set(networkId, restoredNetworkInfo);
        
        // Restore IP pool and mark used IPs
        const ipPool = NetworkManagerHelper.generateIpPool(restoredNetworkInfo.subnet);
        
        // Mark discovered IPs as used
        for (const [nodeId, nodeInfo] of nodes) {
          if (nodeInfo.ip && ipPool.has(nodeInfo.ip)) {
            ipPool.delete(nodeInfo.ip);
            console.info(`Marked IP ${nodeInfo.ip} as used by node ${nodeId}`);
          }
        }
        
        this.ipPools.set(networkId, ipPool);
        
        console.info(`Restored network ${networkId} with ${nodes.size} nodes`);
      }
      
      console.info(`Discovery complete. Found ${this.networks.size} networks.`);
    } catch (error) {
      console.error('Failed to discover existing networks:', error);
    }
  }

  /**
   * Extract network configuration from existing Docker resources
   */
  private async extractNetworkConfig(
    networkInfo: any, 
    networkDetails: any, 
    containers: any[]
  ): Promise<{
    chainId: number;
    subnet: string;
    name: string;
    besuVersion: string;
    genesis?: any;
    env?: Record<string, string>;
  }> {
    // Extract subnet from Docker network details
    const subnet = networkDetails.IPAM?.Config?.[0]?.Subnet || '172.20.0.0/24';
    
    // Extract network name (prefer original name or use Docker network name)
    const name = networkInfo.Name;
    
    // Try to extract configuration from network labels first
    let chainId: number | undefined;
    let besuVersion: string | undefined;
    let genesis: any = {};
    let env: Record<string, string> = {};
    
    // Check network labels first (preferred source)
    const networkLabels = networkDetails.Labels || {};
    if (networkLabels[DOCKER_LABELS.NETWORK_CHAIN_ID]) {
      const labelChainId = parseInt(networkLabels[DOCKER_LABELS.NETWORK_CHAIN_ID]);
      if (!isNaN(labelChainId)) {
        chainId = labelChainId;
      }
    }
    if (networkLabels[DOCKER_LABELS.BESU_VERSION]) {
      besuVersion = networkLabels[DOCKER_LABELS.BESU_VERSION];
    }
    
    // If network labels don't have the info, check containers for configuration hints
    if (!chainId || !besuVersion) {
      for (const containerInfo of containers) {
        try {
          const container = this.docker.getContainer(containerInfo.Id);
          const containerDetails = await container.inspect();
          
          // Extract chainId from container labels
          if (!chainId) {
            const labelChainId = containerDetails.Config.Labels?.[DOCKER_LABELS.NETWORK_CHAIN_ID];
            if (labelChainId && !isNaN(parseInt(labelChainId))) {
              chainId = parseInt(labelChainId);
            }
          }
          
          // Extract besuVersion from image tag
          if (!besuVersion) {
            const image = containerDetails.Config.Image;
            if (image && image.includes('hyperledger/besu:')) {
              const version = image.split(':')[1];
              if (version && version !== 'latest') {
                besuVersion = version;
              }
            }
          }
          
          // Extract chainId from environment variables
          if (!chainId) {
            const envVars = containerDetails.Config.Env || [];
            for (const envVar of envVars) {
              if (!envVar) continue;
              const [key, value] = envVar.split('=');
              if (!key || !value) continue;
              
              if (key === 'CHAIN_ID' || key === 'NETWORK_ID') {
                const numValue = parseInt(value);
                if (!isNaN(numValue)) {
                  chainId = numValue;
                }
              }
              env[key] = value;
            }
          }
          
          // Try to extract chainId from Besu command arguments
          if (!chainId) {
            const cmd = containerDetails.Config.Cmd || [];
            for (let i = 0; i < cmd.length; i++) {
              const currentArg = cmd[i];
              if (currentArg && (currentArg.includes('--network-id') || currentArg.includes('--chain-id'))) {
                const nextArg = cmd[i + 1];
                if (nextArg && !isNaN(parseInt(nextArg))) {
                  chainId = parseInt(nextArg);
                  break;
                }
                // Handle combined argument like --network-id=1337
                if (currentArg.includes('=')) {
                  const value = currentArg.split('=')[1];
                  if (value && !isNaN(parseInt(value))) {
                    chainId = parseInt(value);
                    break;
                  }
                }
              }
            }
          }
          
          // If we found both chainId and besuVersion, we can stop checking containers
          if (chainId && besuVersion) {
            break;
          }
          
        } catch (error) {
          console.warn(`Failed to extract config from container ${containerInfo.Names?.[0]}:`, error);
        }
      }
    }
    
    return {
      chainId: chainId ?? 1337, // Use default only if not extracted
      subnet,
      name,
      besuVersion: besuVersion ?? 'latest', // Use default only if not extracted
      genesis,
      env
    };
  }

  /**
   * Create Docker network with configuration
   */
  private async createDockerNetwork(config: Required<BesuNetworkConfig>): Promise<any> {
    const networkConfig = {
      Name: NAMING_PATTERNS.NETWORK_NAME(config.networkId),
      Driver: 'bridge',
      IPAM: {
        Config: [{
          Subnet: config.subnet
        }]
      },
      Labels: {
        [DOCKER_LABELS.NETWORK_ID]: config.networkId,
        [DOCKER_LABELS.NETWORK_TYPE]: 'clique',
        [DOCKER_LABELS.NETWORK_CHAIN_ID]: config.chainId.toString(),
        [DOCKER_LABELS.NETWORK_SUBNET]: config.subnet,
        [DOCKER_LABELS.BESU_VERSION]: config.besuVersion,
        [DOCKER_LABELS.NETWORK_NAME]: config.name
      }
    };

    return await this.docker.createNetwork(networkConfig);
  }

  /**
   * Allocate an IP from the network pool
   */
  private allocateIp(networkId: string): string {
    const ipPool = this.ipPools.get(networkId);
    if (!ipPool) {
      throw new Error(`IP pool not found for network ${networkId}`);
    }
    return NetworkManagerHelper.allocateIp(ipPool, networkId);
  }

  /**
   * Free an IP back to the network pool
   */
  private freeIp(networkId: string, ip: string): void {
    const ipPool = this.ipPools.get(networkId);
    if (ipPool) {
      NetworkManagerHelper.freeIp(ipPool, ip);
    }
  }

  /**
   * Update validation configuration
   */
  setValidationOptions(options: Partial<ValidationOptions>): void {
    this.validationOptions = {
      ...this.validationOptions,
      ...options
    };
  }

  /**
   * Get current validation configuration
   */
  getValidationOptions(): ValidationOptions {
    return { ...this.validationOptions };
  }

  /**
   * Create a new Besu network with optional validation overrides
   */
  async createNetworkWithValidation(
    config: BesuNetworkConfig, 
    validationOverrides?: Partial<ValidationOptions>
  ): Promise<NetworkInfo> {
    // Temporarily override validation options if provided
    const originalOptions = this.validationOptions;
    if (validationOverrides) {
      this.validationOptions = { ...this.validationOptions, ...validationOverrides };
    }

    try {
      return await this.createNetwork(config);
    } finally {
      // Restore original validation options
      this.validationOptions = originalOptions;
    }
  }
}
