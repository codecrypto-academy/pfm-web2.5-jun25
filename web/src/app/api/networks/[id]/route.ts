/**
 * Individual Network API
 * GET /api/networks/[id] - Get network details
 * DELETE /api/networks/[id] - Delete network
 */
import { NextRequest, NextResponse } from 'next/server';
import { DockerManager } from 'besu-network-manager';
import { NetworkStorage } from '@/lib/databaseStorage';

const dockerManager = new DockerManager();

/**
 * GET /api/networks/[id]
 * Get network details
 */
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

    // Get Docker container status
    const containers = await dockerManager.findNetworkContainers(networkId);
    const containerStatus = containers.map(container => ({
      id: container.Id,
      name: container.Names?.[0] || 'unknown',
      state: container.State,
      status: container.Status
    }));

    return NextResponse.json({
      success: true,
      network: {
        networkId,
        chainId: networkData.config.chainId,
        subnet: networkData.config.subnet,
        gateway: networkData.config.gateway,
        dockerNetworkId: networkData.dockerNetworkId,
        createdAt: networkData.createdAt,
        updatedAt: networkData.updatedAt,
        nodes: networkData.nodes.map(node => ({
          id: node.id,
          type: node.type,
          ip: node.ip,
          rpcPort: node.rpcPort,
          p2pPort: node.p2pPort,
          address: node.address,
          enode: node.enode
        })),
        containers: containerStatus
      }
    });

  } catch (error) {
    console.error('Failed to get network details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get network details' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/networks/[id]
 * Delete network and cleanup all resources
 */
export async function DELETE(
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

    // 1. Remove all containers in the network
    const containers = await dockerManager.findNetworkContainers(networkId);
    let removedContainers = 0;
    
    for (const container of containers) {
      try {
        await dockerManager.removeContainer(container.Id);
        removedContainers++;
      } catch (error) {
        console.warn(`Failed to remove container ${container.Id}:`, error);
      }
    }

    // 2. Remove Docker network
    try {
      await dockerManager.removeDockerNetwork(networkId);
    } catch (error) {
      console.warn(`Failed to remove Docker network ${networkId}:`, error);
    }

    // 3. Clean up files and metadata
    await NetworkStorage.cleanupNetwork(networkId);

    return NextResponse.json({
      success: true,
      cleanup: {
        networkId,
        containersRemoved: removedContainers,
        dockerNetworkRemoved: true,
        filesCleanedUp: true
      }
    });

  } catch (error) {
    console.error('Failed to delete network:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete network' },
      { status: 500 }
    );
  }
}
