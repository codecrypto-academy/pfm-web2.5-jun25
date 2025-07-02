import { NextRequest, NextResponse } from 'next/server';
import { networkManagerService } from '@/lib/networkManager';

/**
 * GET /api/networks/[id] - Get network details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: networkId } = await params;
    const networkInfo = await networkManagerService.getNetworkInfoAsync(networkId);
    
    if (!networkInfo) {
      return NextResponse.json(
        { success: false, error: 'Network not found' },
        { status: 404 }
      );
    }

    // Serialize the network info
    const serializedNetwork = {
      networkId: networkInfo.networkId,
      config: networkInfo.config,
      dockerNetworkId: networkInfo.dockerNetworkId,
      status: networkInfo.status,
      createdAt: networkInfo.createdAt.toISOString(),
      subnet: networkInfo.subnet,
      nodeCount: networkInfo.nodes.size,
      nodes: Array.from(networkInfo.nodes.entries()).map(([id, node]) => ({
        id: node.id,
        type: node.type,
        ip: node.ip,
        status: node.status,
        containerId: node.containerId,
        containerName: node.containerName,
        address: node.credentials.address,
        rpcPort: node.config.rpcPort,
        p2pPort: node.config.p2pPort,
        mining: node.config.mining,
        createdAt: node.createdAt.toISOString()
      }))
    };

    return NextResponse.json({
      success: true,
      network: serializedNetwork
    });

  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get network details'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/networks/[id] - Delete a network
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: networkId } = await params;
    
    // Check if network exists
    const networkInfo = await networkManagerService.getNetworkInfoAsync(networkId);
    if (!networkInfo) {
      return NextResponse.json(
        { success: false, error: 'Network not found' },
        { status: 404 }
      );
    }

    // Delete the network
    await networkManagerService.deleteNetwork(networkId);

    return NextResponse.json({
      success: true,
      message: `Network ${networkId} deleted successfully`
    });

  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete network'
      },
      { status: 500 }
    );
  }
}
