/**
 * Network Status API
 * GET /api/networks/[id]/status - Get network status and health information
 * 
 * @param {string} id - Network ID
 * @returns {Object} Response object
 * @returns {boolean} response.success - Whether the request was successful
 * @returns {Object} response.network - Network status information
 * @returns {string} response.network.networkId - Network identifier
 * @returns {string} response.network.status - Overall network status ('running'|'stopped'|'partial'|'error')
 * @returns {number} response.network.totalNodes - Total number of nodes in the network
 * @returns {number} response.network.runningNodes - Number of currently running nodes
 * @returns {number} response.network.stoppedNodes - Number of stopped nodes
 * @returns {Array} response.network.nodes - Detailed node status information
 * @returns {string} response.network.nodes[].id - Node ID
 * @returns {string} response.network.nodes[].type - Node type
 * @returns {string} response.network.nodes[].status - Node status
 * @returns {string} response.network.nodes[].ip - Node IP address
 * @returns {number} response.network.nodes[].rpcPort - RPC port
 * @returns {number} response.network.nodes[].p2pPort - P2P port
 * @returns {Object} response.network.dockerNetwork - Docker network information
 * @returns {string} response.network.dockerNetwork.id - Docker network ID
 * @returns {string} response.network.dockerNetwork.status - Docker network status
 * @returns {string} response.network.health - Network health status
 * @returns {string} response.network.lastUpdated - Last update timestamp
 * 
 * @example
 * // GET /api/networks/test-network/status
 * {
 *   "success": true,
 *   "network": {
 *     "networkId": "test-network",
 *     "status": "running",
 *     "totalNodes": 3,
 *     "runningNodes": 2,
 *     "stoppedNodes": 1,
 *     "nodes": [
 *       {
 *         "id": "node-0",
 *         "type": "bootnode",
 *         "status": "running",
 *         "ip": "172.20.0.10",
 *         "rpcPort": 8545,
 *         "p2pPort": 30303
 *       }
 *     ],
 *     "dockerNetwork": {
 *       "id": "abc123",
 *       "status": "active"
 *     },
 *     "health": "healthy",
 *     "lastUpdated": "2025-07-07T12:00:00.000Z"
 *   }
 * }
 */
import { NextRequest, NextResponse } from 'next/server';
import { DockerManager } from 'besu-network-manager';
import { NetworkStorage } from '@/lib/databaseStorage';

const dockerManager = new DockerManager();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: networkId } = await params;
    
    const networkData = await NetworkStorage.loadNetwork(networkId);
    if (!networkData) {
      return NextResponse.json(
        { success: false, error: 'Network not found' },
        { status: 404 }
      );
    }

    // Get Docker container statuses
    const containers = await dockerManager.findNetworkContainers(networkId);
    const containerMap = new Map();
    containers.forEach(container => {
      const nodeId = container.Labels?.['besu.node.id'];
      if (nodeId) {
        containerMap.set(nodeId, container);
      }
    });

    // Analyze node statuses
    const nodeStatuses = networkData.nodes.map(node => {
      const container = containerMap.get(node.id);
      let status = 'stopped';
      
      if (container) {
        switch (container.State) {
          case 'running':
            status = 'running';
            break;
          case 'exited':
            status = 'stopped';
            break;
          case 'restarting':
            status = 'restarting';
            break;
          case 'paused':
            status = 'paused';
            break;
          default:
            status = 'error';
        }
      }

      return {
        id: node.id,
        type: node.type,
        status,
        ip: node.ip,
        rpcPort: node.rpcPort,
        p2pPort: node.p2pPort,
        containerInfo: container ? {
          containerId: container.Id,
          state: container.State,
          status: container.Status,
          created: container.Created
        } : null
      };
    });

    // Calculate overall network status
    const totalNodes = nodeStatuses.length;
    const runningNodes = nodeStatuses.filter(n => n.status === 'running').length;
    const stoppedNodes = nodeStatuses.filter(n => n.status === 'stopped').length;
    const errorNodes = nodeStatuses.filter(n => n.status === 'error').length;

    let networkStatus = 'stopped';
    if (runningNodes === totalNodes) {
      networkStatus = 'running';
    } else if (runningNodes > 0) {
      networkStatus = 'partial';
    } else if (errorNodes > 0) {
      networkStatus = 'error';
    }

    // Check Docker network status
    const dockerNetworkId = networkData.dockerNetworkId;
    let dockerNetworkStatus = 'unknown';
    try {
      const network = dockerManager.docker.getNetwork(dockerNetworkId);
      const networkInfo = await network.inspect();
      dockerNetworkStatus = networkInfo ? 'active' : 'inactive';
    } catch (error) {
      dockerNetworkStatus = 'missing';
    }

    // Determine network health
    let health = 'unhealthy';
    if (networkStatus === 'running' && dockerNetworkStatus === 'active') {
      health = 'healthy';
    } else if (networkStatus === 'partial' && dockerNetworkStatus === 'active') {
      health = 'degraded';
    }

    return NextResponse.json({
      success: true,
      network: {
        networkId,
        status: networkStatus,
        totalNodes,
        runningNodes,
        stoppedNodes,
        errorNodes,
        nodes: nodeStatuses,
        dockerNetwork: {
          id: dockerNetworkId,
          status: dockerNetworkStatus
        },
        health,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Failed to get network status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get network status' },
      { status: 500 }
    );
  }
}
