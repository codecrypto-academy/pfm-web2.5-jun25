/**
 * PostgreSQL-based storage implementation for Besu Network Manager
 * Drop-in replacement for the file-based storage system
 */
import { query, transaction, getClient } from './database';
import type { NetworkConfig, BesuNodeConfig } from 'besu-network-manager';

// Re-export the interface for compatibility
export interface StoredNetworkData {
  config: NetworkConfig;
  nodes: BesuNodeConfig[];
  genesis: any;
  dockerNetworkId: string;
  createdAt: string;
  updatedAt: string;
}

// Extended interface with database ID
export interface DatabaseNetworkData extends StoredNetworkData {
  id: number;
  status: 'running' | 'stopped' | 'partial' | 'error';
  nodesCount: number;
}

export class DatabaseStorage {
  /**
   * Save network metadata to database
   */
  static async saveNetwork(networkId: string, data: StoredNetworkData): Promise<void> {
    await transaction(async (client) => {
      // Check if network exists
      const existingNetwork = await client.query(
        'SELECT id FROM networks WHERE network_id = $1',
        [networkId]
      );

      let dbNetworkId: number;

      if (existingNetwork.rows.length > 0) {
        // Update existing network
        dbNetworkId = existingNetwork.rows[0].id;
        
        await client.query(`
          UPDATE networks SET 
            chain_id = $2,
            subnet = $3,
            gateway = $4,
            docker_network_id = $5,
            genesis_config = $6,
            updated_at = CURRENT_TIMESTAMP
          WHERE network_id = $1
        `, [
          networkId,
          data.config.chainId,
          data.config.subnet,
          data.config.gateway,
          data.dockerNetworkId,
          JSON.stringify(data.genesis)
        ]);
      } else {
        // Insert new network
        const result = await client.query(`
          INSERT INTO networks (
            network_id, chain_id, subnet, gateway, docker_network_id, 
            genesis_config, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id
        `, [
          networkId,
          data.config.chainId,
          data.config.subnet,
          data.config.gateway,
          data.dockerNetworkId,
          JSON.stringify(data.genesis),
          data.createdAt,
          data.updatedAt
        ]);
        
        dbNetworkId = result.rows[0].id;
      }

      // Delete existing nodes for this network
      await client.query('DELETE FROM nodes WHERE network_id = $1', [dbNetworkId]);

      // Insert all nodes
      for (const node of data.nodes) {
        await client.query(`
          INSERT INTO nodes (
            node_id, network_id, node_type, ip_address, rpc_port, p2p_port,
            ethereum_address, enode, bootnodes, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [
          node.id,
          dbNetworkId,
          node.type,
          node.ip,
          node.rpcPort,
          node.p2pPort,
          node.address,
          node.enode,
          JSON.stringify(node.bootnodes || [])
        ]);
      }
    });
  }

  /**
   * Load network metadata from database
   */
  static async loadNetwork(networkId: string): Promise<StoredNetworkData | null> {
    try {
      // Get network data
      const networkResult = await query(`
        SELECT 
          network_id, chain_id, subnet, gateway, docker_network_id,
          genesis_config, created_at, updated_at
        FROM networks 
        WHERE network_id = $1
      `, [networkId]);

      if (networkResult.rows.length === 0) {
        return null;
      }

      const network = networkResult.rows[0];

      // Get nodes data
      const nodesResult = await query(`
        SELECT 
          node_id, node_type, ip_address, rpc_port, p2p_port,
          ethereum_address, enode, bootnodes
        FROM nodes 
        WHERE network_id = (SELECT id FROM networks WHERE network_id = $1)
        ORDER BY created_at
      `, [networkId]);

      // Transform database rows to expected format
      const nodes: BesuNodeConfig[] = nodesResult.rows.map(row => ({
        id: row.node_id,
        type: row.node_type,
        ip: row.ip_address,
        rpcPort: row.rpc_port,
        p2pPort: row.p2p_port,
        address: row.ethereum_address,
        enode: row.enode,
        bootnodes: row.bootnodes || []
      }));

      const config: NetworkConfig = {
        networkId: network.network_id,
        chainId: network.chain_id,
        subnet: network.subnet,
        gateway: network.gateway,
        nodes: nodes,
        genesis: network.genesis_config
      };

      return {
        config,
        nodes,
        genesis: network.genesis_config,
        dockerNetworkId: network.docker_network_id,
        createdAt: network.created_at,
        updatedAt: network.updated_at
      };
    } catch (error) {
      console.error(`Error loading network ${networkId}:`, error);
      return null;
    }
  }

  /**
   * Delete network metadata from database
   */
  static async deleteNetwork(networkId: string): Promise<void> {
    await query('DELETE FROM networks WHERE network_id = $1', [networkId]);
    // Nodes will be automatically deleted due to CASCADE constraint
  }

  /**
   * List all network IDs
   */
  static async listNetworks(): Promise<string[]> {
    const result = await query('SELECT network_id FROM networks ORDER BY created_at DESC');
    return result.rows.map(row => row.network_id);
  }

  /**
   * Get network directory path (compatibility method - not used with database)
   */
  static getNetworkPath(networkId: string): string {
    // Use a project-relative path for network directories
    const path = require('path');
    const baseDir = process.env.BESU_DATA_DIR || path.join(process.cwd(), 'virtual', 'networks');
    return path.join(baseDir, networkId);
  }

  /**
   * Get node directory path (compatibility method - not used with database)
   */
  static getNodePath(networkId: string, nodeId: string): string {
    // Use a project-relative path for node directories
    const path = require('path');
    const baseDir = process.env.BESU_DATA_DIR || path.join(process.cwd(), 'virtual', 'networks');
    return path.join(baseDir, networkId, nodeId);
  }

  /**
   * Create network directory structure (compatibility method - no-op for database)
   */
  static async createNetworkDirectory(networkId: string): Promise<string> {
    // Use a project-relative path for network directories
    const path = require('path');
    const baseDir = process.env.BESU_DATA_DIR || path.join(process.cwd(), 'virtual', 'networks');
    return path.join(baseDir, networkId);
  }

  /**
   * Create node directory structure (compatibility method - no-op for database)
   */
  static async createNodeDirectory(networkId: string, nodeId: string): Promise<string> {
    // Use a project-relative path for node directories
    const path = require('path');
    const baseDir = process.env.BESU_DATA_DIR || path.join(process.cwd(), 'virtual', 'networks');
    return path.join(baseDir, networkId, nodeId);
  }

  /**
   * Clean up network files and directories (database implementation)
   */
  static async cleanupNetwork(networkId: string): Promise<void> {
    await this.deleteNetwork(networkId);
  }

  /**
   * Add node to network
   */
  static async addNodeToNetwork(networkId: string, node: BesuNodeConfig): Promise<void> {
    await transaction(async (client) => {
      // Get network database ID
      const networkResult = await client.query(
        'SELECT id FROM networks WHERE network_id = $1',
        [networkId]
      );

      if (networkResult.rows.length === 0) {
        throw new Error(`Network ${networkId} not found`);
      }

      const dbNetworkId = networkResult.rows[0].id;

      // Insert new node
      await client.query(`
        INSERT INTO nodes (
          node_id, network_id, node_type, ip_address, rpc_port, p2p_port,
          ethereum_address, enode, bootnodes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        node.id,
        dbNetworkId,
        node.type,
        node.ip,
        node.rpcPort,
        node.p2pPort,
        node.address,
        node.enode,
        JSON.stringify(node.bootnodes || [])
      ]);
    });
  }

  /**
   * Remove node from network
   */
  static async removeNodeFromNetwork(networkId: string, nodeId: string): Promise<void> {
    await query(`
      DELETE FROM nodes 
      WHERE node_id = $1 
      AND network_id = (SELECT id FROM networks WHERE network_id = $2)
    `, [nodeId, networkId]);
  }

  /**
   * Get detailed network information (extended functionality)
   */
  static async getNetworkDetails(networkId: string): Promise<DatabaseNetworkData | null> {
    const result = await query(`
      SELECT 
        n.id,
        n.network_id,
        n.chain_id,
        n.subnet,
        n.gateway,
        n.docker_network_id,
        n.genesis_config,
        n.status,
        n.nodes_count,
        n.created_at,
        n.updated_at
      FROM networks n
      WHERE n.network_id = $1
    `, [networkId]);

    if (result.rows.length === 0) {
      return null;
    }

    const network = result.rows[0];
    
    // Get nodes
    const nodesResult = await query(`
      SELECT 
        node_id, node_type, ip_address, rpc_port, p2p_port,
        ethereum_address, enode, bootnodes
      FROM nodes 
      WHERE network_id = $1
      ORDER BY created_at
    `, [network.id]);

    const nodes: BesuNodeConfig[] = nodesResult.rows.map(row => ({
      id: row.node_id,
      type: row.node_type,
      ip: row.ip_address,
      rpcPort: row.rpc_port,
      p2pPort: row.p2p_port,
      address: row.ethereum_address,
      enode: row.enode,
      bootnodes: row.bootnodes || []
    }));

    const config: NetworkConfig = {
      networkId: network.network_id,
      chainId: network.chain_id,
      subnet: network.subnet,
      gateway: network.gateway,
      nodes: nodes,
      genesis: network.genesis_config
    };

    return {
      id: network.id,
      config,
      nodes,
      genesis: network.genesis_config,
      dockerNetworkId: network.docker_network_id,
      status: network.status,
      nodesCount: network.nodes_count,
      createdAt: network.created_at,
      updatedAt: network.updated_at
    };
  }

  /**
   * Update network status
   */
  static async updateNetworkStatus(networkId: string, status: 'running' | 'stopped' | 'partial' | 'error'): Promise<void> {
    await query(`
      UPDATE networks 
      SET status = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE network_id = $2
    `, [status, networkId]);
  }

  /**
   * Update node container information
   */
  static async updateNodeContainer(
    networkId: string, 
    nodeId: string, 
    containerData: {
      containerId?: string;
      containerName?: string;
      status?: string;
      privateKey?: string;
      address?: string;
      enode?: string;
    }
  ): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (containerData.containerId !== undefined) {
      updates.push(`container_id = $${paramIndex++}`);
      values.push(containerData.containerId);
    }
    
    if (containerData.containerName !== undefined) {
      updates.push(`container_name = $${paramIndex++}`);
      values.push(containerData.containerName);
    }
    
    if (containerData.status !== undefined) {
      updates.push(`container_status = $${paramIndex++}`);
      values.push(containerData.status);
    }
    
    if (containerData.privateKey !== undefined) {
      updates.push(`private_key = $${paramIndex++}`);
      values.push(containerData.privateKey);
    }
    
    if (containerData.address !== undefined) {
      updates.push(`ethereum_address = $${paramIndex++}`);
      values.push(containerData.address);
    }
    
    if (containerData.enode !== undefined) {
      updates.push(`enode = $${paramIndex++}`);
      values.push(containerData.enode);
    }

    if (updates.length === 0) {
      return; // Nothing to update
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(nodeId, networkId);

    await query(`
      UPDATE nodes 
      SET ${updates.join(', ')}
      WHERE node_id = $${paramIndex++} 
      AND network_id = (SELECT id FROM networks WHERE network_id = $${paramIndex++})
    `, values);
  }

  /**
   * Get network summary for listing
   */
  static async getNetworkSummary(): Promise<Array<{
    networkId: string;
    chainId: number;
    subnet: string;
    gateway: string;
    nodesCount: number;
    status: string;
    runningNodes: number;
    createdAt: string;
    updatedAt: string;
  }>> {
    const result = await query(`
      SELECT 
        network_id,
        chain_id,
        subnet,
        gateway,
        nodes_count,
        status,
        (SELECT COUNT(*) FROM nodes WHERE network_id = networks.id AND container_status = 'running') as running_nodes,
        created_at,
        updated_at
      FROM networks 
      ORDER BY created_at DESC
    `);

    return result.rows.map(row => ({
      networkId: row.network_id,
      chainId: row.chain_id,
      subnet: row.subnet,
      gateway: row.gateway,
      nodesCount: row.nodes_count,
      status: row.status,
      runningNodes: row.running_nodes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  /**
   * Log network operation for audit trail
   */
  static async logOperation(
    networkId: string,
    operationType: 'create' | 'start' | 'stop' | 'delete' | 'add_node' | 'remove_node' | 'update',
    operationStatus: 'pending' | 'success' | 'failed' | 'cancelled',
    operationData?: any,
    errorMessage?: string,
    durationMs?: number
  ): Promise<void> {
    try {
      await query(`
        INSERT INTO network_operations (
          network_id, operation_type, operation_status, operation_data,
          error_message, duration_ms, started_at, completed_at
        ) VALUES (
          (SELECT id FROM networks WHERE network_id = $1),
          $2, $3, $4, $5, $6, CURRENT_TIMESTAMP,
          CASE WHEN $3 IN ('success', 'failed', 'cancelled') THEN CURRENT_TIMESTAMP ELSE NULL END
        )
      `, [
        networkId,
        operationType,
        operationStatus,
        operationData ? JSON.stringify(operationData) : null,
        errorMessage,
        durationMs
      ]);
    } catch (error) {
      console.error('Failed to log operation:', error);
      // Don't throw - logging failures shouldn't break main operations
    }
  }
}

// Export for backward compatibility
export const NetworkStorage = DatabaseStorage;
