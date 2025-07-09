/**
 * Simple file-based storage for network metadata
 * In production, this should be replaced with a proper database
 */
import * as fs from 'fs';
import * as path from 'path';
import type { NetworkConfig, BesuNodeConfig } from 'besu-network-manager';

const STORAGE_DIR = '/tmp/besu-networks';

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

export interface StoredNetworkData {
  config: NetworkConfig;
  nodes: BesuNodeConfig[];
  genesis: any;
  dockerNetworkId: string;
  createdAt: string;
  updatedAt: string;
}

export class NetworkStorage {
  /**
   * Save network metadata
   */
  static saveNetwork(networkId: string, data: StoredNetworkData): void {
    const filePath = path.join(STORAGE_DIR, `${networkId}.json`);
    data.updatedAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  /**
   * Load network metadata
   */
  static loadNetwork(networkId: string): StoredNetworkData | null {
    const filePath = path.join(STORAGE_DIR, `${networkId}.json`);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  /**
   * Delete network metadata
   */
  static deleteNetwork(networkId: string): void {
    const filePath = path.join(STORAGE_DIR, `${networkId}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  /**
   * List all network IDs
   */
  static listNetworks(): string[] {
    return fs.readdirSync(STORAGE_DIR)
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''));
  }

  /**
   * Get network directory path
   */
  static getNetworkPath(networkId: string): string {
    return path.join(STORAGE_DIR, networkId);
  }

  /**
   * Get node directory path
   */
  static getNodePath(networkId: string, nodeId: string): string {
    return path.join(STORAGE_DIR, networkId, nodeId);
  }

  /**
   * Create network directory structure
   */
  static async createNetworkDirectory(networkId: string): Promise<string> {
    const networkPath = this.getNetworkPath(networkId);
    await fs.promises.mkdir(networkPath, { recursive: true });
    return networkPath;
  }

  /**
   * Create node directory structure
   */
  static async createNodeDirectory(networkId: string, nodeId: string): Promise<string> {
    const nodePath = this.getNodePath(networkId, nodeId);
    await fs.promises.mkdir(nodePath, { recursive: true });
    return nodePath;
  }

  /**
   * Clean up network files and directories
   */
  static async cleanupNetwork(networkId: string): Promise<void> {
    // Remove metadata file
    this.deleteNetwork(networkId);
    
    // Remove network directory
    const networkPath = this.getNetworkPath(networkId);
    if (fs.existsSync(networkPath)) {
      await fs.promises.rm(networkPath, { recursive: true, force: true });
    }
  }

  /**
   * Update network data with new node
   */
  static addNodeToNetwork(networkId: string, node: BesuNodeConfig): void {
    const data = this.loadNetwork(networkId);
    if (data) {
      data.nodes.push(node);
      this.saveNetwork(networkId, data);
    }
  }

  /**
   * Remove node from network data
   */
  static removeNodeFromNetwork(networkId: string, nodeId: string): void {
    const data = this.loadNetwork(networkId);
    if (data) {
      data.nodes = data.nodes.filter(node => node.id !== nodeId);
      this.saveNetwork(networkId, data);
    }
  }
}
