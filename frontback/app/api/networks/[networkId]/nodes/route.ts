import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getNetwork } from '../../../../../lib/networkManager';
import { initializeDefaultNetwork } from '../../../../../lib/initializeDefaultNetwork';

interface NodeInfo {
  name: string;
  address: string;
  balance: string;
  type: 'validator' | 'rpc' | 'normal' | 'bootnode';
  status: 'RUNNING' | 'STOPPED' | 'ERROR' | 'STARTING' | 'STOPPING' | 'CREATED';
  rpcUrl?: string;
}

// Función para asegurar que la red por defecto esté inicializada
async function ensureDefaultNetworkInitialized() {
  try {
    await initializeDefaultNetwork();
  } catch (error) {
    console.error('Error ensuring default network initialization:', error);
  }
}


// GET /api/networks/[networkId]/nodes
export async function GET(
  request: NextRequest,
  { params }: { params: { networkId: string } }
) {
  try {
    // Asegurar que la red por defecto esté inicializada
    await ensureDefaultNetworkInitialized();
    
    // Obtener la red desde el networkManager
    const network = getNetwork(params.networkId);
    if (!network) {
      return NextResponse.json(
        { error: 'Network not found' },
        { status: 404 }
      );
    }

    const nodeInfos: NodeInfo[] = [];

    // Usar el SDK para obtener los nodos de la red
    const nodes = (network as any).getNodes();
    const nodeEntries = Array.from((nodes as any).entries()) as [string, any][];
    
    for (const [nodeName, node] of nodeEntries) {
      // Obtener información del nodo usando el SDK
      const nodeInfo: NodeInfo = {
        name: (node as any).getName(),
        address: (node as any).getAddress(),
        balance: '0.0', // Por ahora, lo calcularemos después
        type: (node as any).isValidator() ? 'validator' : ((node as any).getRpcUrl() ? 'rpc' : 'normal'),
        status: (node as any).getStatus() as any,
        rpcUrl: (node as any).getRpcUrl() || undefined
      };
      
      // Intentar obtener el balance usando ethers.js
      try {
        const rpcUrl = (node as any).getRpcUrl();
        if (rpcUrl) {
          const provider = new ethers.JsonRpcProvider(rpcUrl);
          const balance = await provider.getBalance((node as any).getAddress());
          nodeInfo.balance = ethers.formatEther(balance);
        }
      } catch (error) {
        console.error(`Error getting balance for node ${nodeName}:`, error);
        nodeInfo.balance = '0.0';
      }
      
      nodeInfos.push(nodeInfo);
    }

    return NextResponse.json(nodeInfos);
  } catch (error) {
    console.error('Error fetching nodes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nodes' },
      { status: 500 }
    );
  }
}

// POST /api/networks/[networkId]/nodes
export async function POST(
  request: NextRequest,
  { params }: { params: { networkId: string } }
) {
  try {
    // Asegurar que la red por defecto esté inicializada
    await ensureDefaultNetworkInitialized();
    
    // Obtener la red desde el networkManager
    const network = getNetwork(params.networkId);
    if (!network) {
      return NextResponse.json(
        { error: 'Network not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, nodeType, isRpc, initialBalance, rpcPort, ip } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Check if node name already exists
    const existingNodes = (network as any).getNodes();
    if (existingNodes.has(name)) {
      return NextResponse.json(
        { error: 'Node with this name already exists' },
        { status: 409 }
      );
    }

    // Generate IP if not provided
    let nodeIp = ip ? `172.20.0.${ip}` : '';
    if (!nodeIp) {
      // Auto-generate IP in network subnet
      const existingIps = Array.from(existingNodes.values()).map((node: any) => {
        const config = node.getConfig();
        return config.ip;
      });
      let lastOctet = 10;
      while (existingIps.includes(`172.20.0.${lastOctet}`)) {
        lastOctet++;
      }
      nodeIp = `172.20.0.${lastOctet}`;
    }

    // Create node options for the SDK
    const nodeOptions: any = {
      name,
      ip: nodeIp,
      initialBalance: initialBalance || '10.0'
    };

    // Configure based on node type
    if (nodeType === 'validator') {
      nodeOptions.validator = true;
    }
    
    if (isRpc) {
      nodeOptions.rpc = true;
      nodeOptions.rpcPort = rpcPort || 8545;
    }

    // Use the SDK to add the node to the network
    const newNode = await (network as any).addNode(nodeOptions);

    // Return node info
    const nodeInfo: NodeInfo = {
      name: (newNode as any).getName(),
      address: (newNode as any).getAddress(),
      balance: '0.0', // Balance inicial
      type: (newNode as any).isValidator() ? 'validator' : ((newNode as any).getRpcUrl() ? 'rpc' : 'normal'),
      status: (newNode as any).getStatus() as any,
      rpcUrl: (newNode as any).getRpcUrl() || undefined
    };

    return NextResponse.json(nodeInfo, { status: 201 });
  } catch (error) {
    console.error('Error creating node:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create node' },
      { status: 500 }
    );
  }
}

// DELETE /api/networks/[networkId]/nodes?name=nodeName
export async function DELETE(
  request: NextRequest,
  { params }: { params: { networkId: string } }
) {
  try {
    // Asegurar que la red por defecto esté inicializada
    await ensureDefaultNetworkInitialized();
    
    // Obtener la red desde el networkManager
    const network = getNetwork(params.networkId);
    if (!network) {
      return NextResponse.json(
        { error: 'Network not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const nodeName = searchParams.get('name');

    if (!nodeName) {
      return NextResponse.json(
        { error: 'Node name is required' },
        { status: 400 }
      );
    }

    // Check if node exists
    const existingNodes = (network as any).getNodes();
    if (!existingNodes.has(nodeName)) {
      return NextResponse.json(
        { error: 'Node not found' },
        { status: 404 }
      );
    }

    // Use the SDK to remove the node from the network
    await (network as any).removeNode(nodeName);

    return NextResponse.json({ message: 'Node deleted successfully' });
  } catch (error) {
    console.error('Error deleting node:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete node' },
      { status: 500 }
    );
  }
}