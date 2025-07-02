import { NextRequest, NextResponse } from 'next/server';
import { networkManagerService, createNetworkConfig, createNodeConfig } from '@/lib/networkManager';
import type { BesuNetworkConfig } from '@/lib/networkManager';

/**
 * GET /api/networks - List all networks
 */
export async function GET() {
  try {
    const networks = await networkManagerService.listNetworks();
    
    // Convert Map objects to plain objects for JSON serialization
    const serializedNetworks = networks.map(network => ({
      networkId: network.networkId,
      config: network.config,
      dockerNetworkId: network.dockerNetworkId,
      status: network.status,
      createdAt: network.createdAt.toISOString(),
      subnet: network.subnet,
      nodeCount: network.nodes.size,
      nodes: Array.from(network.nodes.entries()).map(([id, node]) => ({
        id: node.id,
        type: node.type,
        ip: node.ip,
        status: node.status,
        containerId: node.containerId,
        containerName: node.containerName,
        createdAt: node.createdAt.toISOString()
      }))
    }));

    return NextResponse.json({
      success: true,
      networks: serializedNetworks,
      count: serializedNetworks.length
    });

  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list networks',
        networks: [],
        count: 0
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/networks - Create a new network
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.networkId) {
      return NextResponse.json(
        { success: false, error: 'networkId is required' },
        { status: 400 }
      );
    }

    if (!body.chainId) {
      return NextResponse.json(
        { success: false, error: 'chainId is required' },
        { status: 400 }
      );
    }

    // Create network configuration
    const networkConfig: BesuNetworkConfig = {
      networkId: body.networkId,
      chainId: body.chainId,
      subnet: body.subnet || '172.25.0.0/24',
      name: body.name || `besu-${body.networkId}`,
      besuVersion: body.besuVersion || 'latest',
      nodes: [],
      genesis: body.genesis || {},
      env: body.env || {}
    };

    // Add initial nodes if provided
    if (body.nodes && Array.isArray(body.nodes)) {
      networkConfig.nodes = body.nodes.map((node: any) => 
        createNodeConfig(
          node.id,
          node.type,
          {
            rpcPort: node.rpcPort,
            p2pPort: node.p2pPort,
            mining: node.mining,
            env: node.env,
            extraArgs: node.extraArgs
          }
        )
      );
    }

    // Create the network
    const networkInfo = await networkManagerService.createNetwork(networkConfig);
    
    // Serialize the response
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
        createdAt: node.createdAt.toISOString()
      }))
    };

    return NextResponse.json({
      success: true,
      message: 'Network created successfully',
      network: serializedNetwork
    });

  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create network'
      },
      { status: 500 }
    );
  }
}
