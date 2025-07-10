// Note: These imports will be available when the lib is properly linked
// For now, we'll define interfaces to match the besu-network-lib
import { BesuNetwork, BesuNodeDefinition, NetworkConnectivity, BesuNetworkConfig } from '@/types/besu';
import { networkStore } from '@/lib/network-store';

// Mock BesuLib interface for development
interface BesuLib {
  create(options: { nodes: BesuNodeDefinition[] }): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  destroy(): Promise<void>;
  getNetworkConnectivity(): Promise<unknown[]>;
  getConfig(): BesuNetworkConfig;
  getNodes(): BesuNodeDefinition[];
}

// Mock BesuNetwork constructor
class MockBesuNetwork implements BesuLib {
  constructor(private config: BesuNetworkConfig) {}

  async create(options: { nodes: BesuNodeDefinition[] }): Promise<void> {
    // Mock implementation
    console.log('Creating network with config:', this.config);
    console.log('Nodes:', options.nodes);
  }

  async start(): Promise<void> {
    console.log('Starting network:', this.config.name);
  }

  async stop(): Promise<void> {
    console.log('Stopping network:', this.config.name);
  }

  async destroy(): Promise<void> {
    console.log('Destroying network:', this.config.name);
  }

  async getNetworkConnectivity(): Promise<unknown[]> {
    // Mock connectivity data
    return [
      { nodeName: 'bootnode1', isActive: true, blockNumber: 1, peerCount: 2 },
      { nodeName: 'miner1', isActive: true, blockNumber: 1, peerCount: 2 },
      { nodeName: 'rpc1', isActive: true, blockNumber: 1, peerCount: 2 }
    ];
  }

  getConfig(): BesuNetworkConfig {
    return this.config;
  }

  getNodes(): BesuNodeDefinition[] {
    // Mock nodes data
    return [
      { name: 'bootnode1', ip: '172.16.0.10', rpcPort: 8545, type: 'bootnode' },
      { name: 'miner1', ip: '172.16.0.11', rpcPort: 8546, type: 'miner' },
      { name: 'rpc1', ip: '172.16.0.12', rpcPort: 8547, type: 'rpc' }
    ];
  }
}

/**
 * Service class for managing Besu networks using the besu-network-lib
 */
export class BesuNetworkService {
  private networks = new Map<string, BesuLib>();
  
  constructor() {
    // Initialize the service by syncing with the network store
    this.syncWithNetworkStore();
  }
  
  /**
   * Synchronize the service with the network store to ensure
   * all persisted networks are available in the service
   */
  syncWithNetworkStore(): void {
    try {
      // Get all networks from the store
      const storedNetworks = networkStore.getAllNetworks();
      
      console.log(`Syncing BesuNetworkService with ${storedNetworks.length} networks from store`);
      
      // Create BesuLib instances for each stored network
      for (const network of storedNetworks) {
        if (!this.networks.has(network.id)) {
          console.log(`Creating BesuLib instance for network ${network.id}`);
          this.networks.set(
            network.id, 
            new MockBesuNetwork({
              name: network.config.name,
              chainId: network.config.chainId,
              subnet: network.config.subnet,
              consensus: network.config.consensus,
              gasLimit: network.config.gasLimit,
              blockTime: network.config.blockTime,
              signerAccounts: network.config.signerAccounts
            })
          );
        }
      }
    } catch (error) {
      console.error('Error syncing with network store:', error);
    }
  }
  
  /**
   * Ensure network is available in the service
   * This will attempt to recreate the network from store data if needed
   */
  private ensureNetwork(id: string): BesuLib {
    // First sync with network store
    this.syncWithNetworkStore();
    
    let network = this.networks.get(id);
    
    // If still not found after sync, try to recreate it from the store
    if (!network) {
      const storedNetwork = networkStore.getNetwork(id);
      if (storedNetwork) {
        console.log(`Recreating network ${id} from store data`);
        network = new MockBesuNetwork({
          name: storedNetwork.config.name,
          chainId: storedNetwork.config.chainId,
          subnet: storedNetwork.config.subnet,
          consensus: storedNetwork.config.consensus,
          gasLimit: storedNetwork.config.gasLimit,
          blockTime: storedNetwork.config.blockTime,
          signerAccounts: storedNetwork.config.signerAccounts
        });
        this.networks.set(id, network);
        return network;
      } else {
        throw new Error(`Network ${id} not found in service or store`);
      }
    }
    
    return network;
  }

  /**
   * Create a new Besu network
   */
  async createNetwork(
    id: string,
    config: BesuNetworkConfig,
    nodes: BesuNodeDefinition[]
  ): Promise<BesuNetwork> {
    try {
      // Create BesuNetwork instance
      const network = new MockBesuNetwork(config);
      
      // Store the network instance
      this.networks.set(id, network);

      // Create the network
      await network.create({ nodes });

      const besuNetwork: BesuNetwork = {
        id,
        config,
        nodes,
        status: 'stopped',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return besuNetwork;
    } catch (error) {
      throw new Error(`Failed to create network: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Start a Besu network
   */
  async startNetwork(id: string): Promise<void> {
    const network = this.ensureNetwork(id);

    try {
      // Attempt to start the network
      await network.start();
      console.log(`Network ${id} started successfully`);
    } catch (error) {
      console.error(`Error starting network ${id}:`, error);
      throw new Error(`Failed to start network: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stop a Besu network
   */
  async stopNetwork(id: string): Promise<void> {
    const network = this.ensureNetwork(id);

    try {
      // Attempt to stop the network
      await network.stop();
      console.log(`Network ${id} stopped successfully`);
    } catch (error) {
      console.error(`Error stopping network ${id}:`, error);
      throw new Error(`Failed to stop network: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a Besu network
   */
  async deleteNetwork(id: string): Promise<void> {
    const network = this.ensureNetwork(id);

    try {
      try {
        await network.stop();
      } catch (stopError) {
        console.warn(`Error stopping network ${id}:`, stopError);
        // Continue with deletion even if stop fails
      }
      
      try {
        await network.destroy();
      } catch (destroyError) {
        console.warn(`Error destroying network ${id}:`, destroyError);
        // Continue with deletion even if destroy fails
      }
      
      // Remove from our tracking map regardless of success/failure of operations
      this.networks.delete(id);
    } catch (error) {
      throw new Error(`Failed to delete network: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get network connectivity status
   */
  async getNetworkConnectivity(id: string): Promise<NetworkConnectivity[]> {
    const network = this.ensureNetwork(id);

    try {
      const connectivity = await network.getNetworkConnectivity();
      return connectivity.map((node: unknown): NetworkConnectivity => {
        const nodeData = node as Record<string, unknown>;
        return {
          nodeName: String(nodeData.nodeName || ''),
          isActive: Boolean(nodeData.isActive),
          blockNumber: typeof nodeData.blockNumber === 'number' ? nodeData.blockNumber : undefined,
          peerCount: typeof nodeData.peerCount === 'number' ? nodeData.peerCount : undefined,
          error: typeof nodeData.error === 'string' ? nodeData.error : undefined
        };
      });
    } catch (error) {
      throw new Error(`Failed to get network connectivity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update network configuration
   */
  async updateNetwork(
    id: string,
    newConfig?: Partial<BesuNetworkConfig>,
    newNodes?: BesuNodeDefinition[]
  ): Promise<BesuNetwork> {
    const network = this.ensureNetwork(id);

    try {
      // Save the current config and nodes before stopping/deleting
      const currentConfig = network.getConfig();
      const currentNodes = network.getNodes();
      
      // Merge configs and prepare nodes
      const updatedConfig = { ...currentConfig, ...newConfig };
      
      // Ensure subnet is preserved if not explicitly changed
      if (!newConfig?.subnet && currentConfig.subnet) {
        updatedConfig.subnet = currentConfig.subnet;
      }
      
      // If we have new nodes, make sure their IPs are within the subnet
      let nodesToUse = newNodes || currentNodes;
      
      // Log the update operation
      console.log(`Updating network ${id}:`, {
        subnet: updatedConfig.subnet,
        nodeCount: nodesToUse.length,
        nodeIps: nodesToUse.map(n => n.ip)
      });
      
      // For now, updating a network requires recreating it
      // This is a limitation of the current besu-network-lib
      try {
        await this.stopNetwork(id);
        await this.deleteNetwork(id);
      } catch (deleteError) {
        console.warn(`Error while stopping/deleting network during update: ${deleteError}`);
        // Continue with recreating the network even if deletion fails
      }

      // Recreate the network
      return await this.createNetwork(id, updatedConfig, nodesToUse);
    } catch (error) {
      throw new Error(`Failed to update network: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get network instance
   */
  getNetwork(id: string): BesuLib | undefined {
    return this.networks.get(id);
  }

  /**
   * Check if network exists
   */
  hasNetwork(id: string): boolean {
    return this.networks.has(id);
  }

  /**
   * Cleanup all networks (for testing/maintenance)
   */
  async cleanupAllNetworks(): Promise<void> {
    try {
      // Stop and destroy all managed networks
      for (const [id, network] of this.networks.entries()) {
        try {
          await network.stop();
          await network.destroy();
        } catch (error) {
          console.warn(`Failed to cleanup network ${id}:`, error);
        }
      }

      // Clear the networks map
      this.networks.clear();

      // Note: cleanupTestNetworks would be called here when lib is properly linked
      console.log('All networks cleaned up');
    } catch (error) {
      throw new Error(`Failed to cleanup networks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all network IDs
   */
  getAllNetworkIds(): string[] {
    return Array.from(this.networks.keys());
  }
}

// Singleton instance
export const besuNetworkService = new BesuNetworkService();
