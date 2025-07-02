import { NextRequest, NextResponse } from 'next/server';
import { getNetworkManager } from '@/lib/networkManager';
import type { BesuNodeConfig, NodeInfo } from 'besu-network-manager';

/**
 * POST /api/networks/[id]/nodes - Add a new node to the network
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const networkManager = getNetworkManager();
    const { id: networkId } = await params;

    // Check if network exists
    const networkInfo = await networkManager.getNetworkInfoAsync(networkId);
    if (!networkInfo) {
      return NextResponse.json(
        { error: 'Network not found', networkId },
        { status: 404 }
      );
    }

    // Parse request body
    const nodeConfig: BesuNodeConfig = await request.json();

    // Validate required fields
    if (!nodeConfig.id) {
      return NextResponse.json(
        { error: 'Node ID is required' },
        { status: 400 }
      );
    }

    if (!nodeConfig.type) {
      return NextResponse.json(
        { error: 'Node type is required (bootnode, miner, rpc, validator)' },
        { status: 400 }
      );
    }

    // Check if node ID already exists
    const existingNode = await networkManager.getNodeInfo(networkId, nodeConfig.id);
    if (existingNode) {
      return NextResponse.json(
        { error: 'Node with this ID already exists', nodeId: nodeConfig.id },
        { status: 409 }
      );
    }

    // Add the node
    const nodeInfo = await networkManager.addNode(networkId, nodeConfig);

    return NextResponse.json({
      message: 'Node added successfully',
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
    console.error('Error adding node:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to add node',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/networks/[id]/nodes - List all nodes in the network
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const networkManager = getNetworkManager();
    const { id: networkId } = await params;

    // Check if network exists
    const networkInfo = await networkManager.getNetworkInfoAsync(networkId);
    if (!networkInfo) {
      return NextResponse.json(
        { error: 'Network not found', networkId },
        { status: 404 }
      );
    }

    // Convert nodes Map to array with serializable data
    const nodes = Array.from(networkInfo.nodes.values()).map((node) => ({
      id: node.id,
      type: node.type,
      containerId: node.containerId,
      containerName: node.containerName,
      ip: node.ip,
      status: node.status,
      createdAt: node.createdAt,
      credentials: {
        address: node.credentials.address,
        publicKey: node.credentials.publicKey
      },
      config: node.config
    }));

    return NextResponse.json({
      networkId,
      nodes,
      nodeCount: nodes.length
    });

  } catch (error) {
    console.error('Error listing nodes:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to list nodes',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
