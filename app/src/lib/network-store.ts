import { BesuNetwork } from '@/types/besu';
import fs from 'fs';
import path from 'path';

// File path for persisting networks
const NETWORKS_FILE = path.join(process.cwd(), 'networks', 'networks-store.json');
console.log('Networks file path:', NETWORKS_FILE);

/**
 * Storage for Besu networks with persistence to a JSON file
 * In a production app, this would be replaced with a proper database
 */
class NetworkStore {
  private networks = new Map<string, BesuNetwork>();

  constructor() {
    this.loadNetworks();
  }

  /**
   * Load networks from file
   */
  loadNetworks(): void {
    try {
      // Clear the current networks map
      this.networks.clear();
      
      // Ensure the networks directory exists
      const networksDir = path.join(process.cwd(), 'networks');
      if (!fs.existsSync(networksDir)) {
        fs.mkdirSync(networksDir, { recursive: true });
      }

      if (fs.existsSync(NETWORKS_FILE)) {
        const data = fs.readFileSync(NETWORKS_FILE, 'utf8');
        const networks = JSON.parse(data);
        
        console.log(`Loading ${networks.length} networks from file: ${NETWORKS_FILE}`);
        
        // Convert plain objects to Map entries
        networks.forEach((network: BesuNetwork) => {
          // Convert string dates back to Date objects
          network.createdAt = new Date(network.createdAt);
          network.updatedAt = new Date(network.updatedAt);
          
          this.networks.set(network.id, network);
        });
        
        console.log(`Loaded ${networks.length} networks from file`);
      } else {
        console.log(`Network file does not exist: ${NETWORKS_FILE}`);
      }
    } catch (error) {
      console.error('Failed to load networks from file:', error);
    }
  }

  /**
   * Save networks to file
   */
  private saveNetworksToFile(): void {
    try {
      const networksArray = Array.from(this.networks.values());
      fs.writeFileSync(NETWORKS_FILE, JSON.stringify(networksArray, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to save networks to file:', error);
    }
  }

  /**
   * Save a network to the store and persist
   */
  saveNetwork(network: BesuNetwork): void {
    this.networks.set(network.id, {
      ...network,
      updatedAt: new Date()
    });
    
    this.saveNetworksToFile();
  }

  /**
   * Get a network by ID
   */
  getNetwork(id: string): BesuNetwork | undefined {
    this.loadNetworks(); // Always reload from file to ensure data is fresh
    return this.networks.get(id);
  }

  /**
   * Get all networks
   */
  getAllNetworks(): BesuNetwork[] {
    this.loadNetworks(); // Always reload from file to ensure data is fresh
    return Array.from(this.networks.values());
  }

  /**
   * Delete a network
   */
  deleteNetwork(id: string): boolean {
    const result = this.networks.delete(id);
    if (result) {
      this.saveNetworksToFile();
    }
    return result;
  }

  /**
   * Update network status
   */
  updateNetworkStatus(id: string, status: BesuNetwork['status']): void {
    const network = this.networks.get(id);
    if (network) {
      network.status = status;
      network.updatedAt = new Date();
      this.networks.set(id, network);
      this.saveNetworksToFile();
    }
  }

  /**
   * Check if network exists
   */
  hasNetwork(id: string): boolean {
    return this.networks.has(id);
  }

  /**
   * Get networks by status
   */
  getNetworksByStatus(status: BesuNetwork['status']): BesuNetwork[] {
    return Array.from(this.networks.values()).filter(network => network.status === status);
  }

  /**
   * Clear all networks (for testing)
   */
  clear(): void {
    this.networks.clear();
    this.saveNetworksToFile();
  }

  /**
   * Get network count
   */
  count(): number {
    return this.networks.size;
  }
}

// Singleton instance
export const networkStore = new NetworkStore();
