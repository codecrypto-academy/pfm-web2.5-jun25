import { NextRequest, NextResponse } from 'next/server';
import { getNetworkManager } from '@/lib/networkManager';

/**
 * DELETE /api/networks/[id]/nodes/[nodeId] - Remove a node from the network
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
  try {
    const networkManager = getNetworkManager();
    const { id: networkId, nodeId } = await params;

    // Check if network exists
    const networkInfo = networkManager.getNetworkInfo(networkId);
    if (!networkInfo) {
      return NextResponse.json(
        { error: 'Network not found', networkId },
        { status: 404 }
      );
    }

    // Check if node exists
    const nodeInfo = networkManager.getNodeInfo(networkId, nodeId);
    if (!nodeInfo) {
      return NextResponse.json(
        { error: 'Node not found', networkId, nodeId },
        { status: 404 }
      );
    }

    // Remove the node
    await networkManager.removeNode(networkId, nodeId);

    return NextResponse.json({
      message: 'Node removed successfully',
      networkId,
      nodeId
    });

  } catch (error) {
    console.error('Error removing node:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to remove node',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/networks/[id]/nodes/[nodeId] - Get node details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
  try {
    const networkManager = getNetworkManager();
    const { id: networkId, nodeId } = await params;

    // Check if network exists
    const networkInfo = networkManager.getNetworkInfo(networkId);
    if (!networkInfo) {
      return NextResponse.json(
        { error: 'Network not found', networkId },
        { status: 404 }
      );
    }

    // Check if node exists
    const nodeInfo = await networkManager.getNodeInfo(networkId, nodeId);
    if (!nodeInfo) {
      return NextResponse.json(
        { error: 'Node not found', networkId, nodeId },
        { status: 404 }
      );
    }

    return NextResponse.json({
      networkId,
      node: {
        id: nodeInfo.id,
        type: nodeInfo.type,
        containerId: nodeInfo.containerId,
        containerName: nodeInfo.containerName,
        ip: nodeInfo.ip,
        status: nodeInfo.status,
        createdAt: nodeInfo.createdAt,
        credentials: {
          address: nodeInfo.credentials.address,
          publicKey: nodeInfo.credentials.publicKey
        },
        config: nodeInfo.config
      }
    });

  } catch (error) {
    console.error('Error getting node info:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get node information',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
