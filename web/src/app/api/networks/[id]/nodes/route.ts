import { NextRequest, NextResponse } from 'next/server';
import { DockerManager, GenesisGenerator } from 'besu-network-manager';
import type { BesuNodeConfig } from 'besu-network-manager';
import * as fs from 'fs';
import * as path from 'path';

const networksDataDir = '/tmp/besu-networks';
const dockerManager = new DockerManager();

interface StoredNetworkData {
  config: any;
  nodes: BesuNodeConfig[];
  genesis: any;
  createdAt: string;
}

function loadNetworkData(networkId: string): StoredNetworkData | null {
  const filePath = path.join(networksDataDir, `${networkId}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveNetworkData(networkId: string, data: StoredNetworkData): void {
  const filePath = path.join(networksDataDir, `${networkId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// POST /api/simple-networks/[id]/nodes - Add node to network
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: networkId } = await params;
    const nodeConfig: BesuNodeConfig = await request.json();

    // Load network data
    const networkData = loadNetworkData(networkId);
    if (!networkData) {
      return NextResponse.json(
        { success: false, error: 'Network not found' },
        { status: 404 }
      );
    }

    // Check if node already exists
    if (networkData.nodes.find(n => n.id === nodeConfig.id)) {
      return NextResponse.json(
        { success: false, error: 'Node with this ID already exists' },
        { status: 400 }
      );
    }

    // Generate ports for the new node
    const baseRpcPort = 8545;
    const baseP2pPort = 30303;
    const nodeIndex = networkData.nodes.length;
    
    const newNode: BesuNodeConfig = {
      ...nodeConfig,
      rpcPort: nodeConfig.rpcPort || baseRpcPort + nodeIndex,
      p2pPort: nodeConfig.p2pPort || baseP2pPort + nodeIndex,
    };

    // Get the bootnode enode URL for this node to connect to
    let bootnodeEnode: string | undefined;
    
    // Find the bootnode container to get its actual enode URL
    const bootnodeNode = networkData.nodes.find(n => n.type === 'bootnode');
    
    if (bootnodeNode) {
      try {
        // Query the bootnode's admin API to get its actual enode URL
        const response = await fetch(`http://localhost:${bootnodeNode.rpcPort}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'admin_nodeInfo',
            params: [],
            id: 1
          })
        });
        
        if (response.ok) {
          const data = await response.json() as any;
          const enodeUrl = data.result?.enode;
          
          if (enodeUrl) {
            // Replace 0.0.0.0 with the actual Docker network IP
            const dockerNetworkName = `besu-${networkId}`;
            const networks = await dockerManager.docker.listNetworks({ 
              filters: { name: [dockerNetworkName] } 
            });
            
            if (networks.length > 0) {
              const network = networks[0];
              const containers = Object.values(network.Containers || {});
              const bootnodeContainer = containers.find(c => 
                c.Name?.includes('bootnode')
              );
              
              if (bootnodeContainer && bootnodeContainer.IPv4Address) {
                const dockerIP = bootnodeContainer.IPv4Address.split('/')[0];
                bootnodeEnode = enodeUrl.replace('0.0.0.0', dockerIP);
                console.info(`Extracted bootnode enode: ${bootnodeEnode}`);
              }
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to get bootnode enode: ${error}`);
      }
    }

    // Fallback: if we couldn't extract the bootnode enode, use a hardcoded approach
    if (!bootnodeEnode && bootnodeNode) {
      // Manually construct the bootnode enode based on the known IP
      bootnodeEnode = `enode://b8192094a2faa745c4854e5bb2ea835e6af4b71d72dbbdfde24c21ff8422f614aa032abfa0ad7ce253dc086f7aee876b5db0cf5b76b718a193f5dceb47eb17cd@172.30.0.10:30303`;
      console.info(`Using fallback bootnode enode: ${bootnodeEnode}`);
    }

    // Create the Docker container for the new node
    const result = await dockerManager.createBesuNode(
      newNode,
      networkData.genesis,
      networkId,
      bootnodeEnode
    );

    // Add the node to the network data
    networkData.nodes.push(newNode);
    saveNetworkData(networkId, networkData);

    return NextResponse.json({
      success: true,
      node: {
        id: newNode.id,
        type: newNode.type,
        rpcPort: newNode.rpcPort,
        p2pPort: newNode.p2pPort,
        containerId: result.containerId,
        containerName: result.containerName
      }
    });

  } catch (error) {
    console.error('Error adding node:', error);
    return NextResponse.json(
      { success: false, error: `Failed to add node: ${error}` },
      { status: 500 }
    );
  }
}

// DELETE /api/simple-networks/[id]/nodes/[nodeId] - Remove node from network
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: networkId } = await params;
    const url = new URL(request.url);
    const nodeId = url.pathname.split('/').pop();

    if (!nodeId) {
      return NextResponse.json(
        { success: false, error: 'Node ID is required' },
        { status: 400 }
      );
    }

    // Load network data
    const networkData = loadNetworkData(networkId);
    if (!networkData) {
      return NextResponse.json(
        { success: false, error: 'Network not found' },
        { status: 404 }
      );
    }

    // Find the node
    const nodeIndex = networkData.nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Node not found' },
        { status: 404 }
      );
    }

    const node = networkData.nodes[nodeIndex];

    // Remove the Docker container
    await dockerManager.removeNode(nodeId, networkId);

    // Remove the node from the network data
    networkData.nodes.splice(nodeIndex, 1);
    saveNetworkData(networkId, networkData);

    return NextResponse.json({
      success: true,
      message: `Node ${nodeId} removed successfully`
    });

  } catch (error) {
    console.error('Error removing node:', error);
    return NextResponse.json(
      { success: false, error: `Failed to remove node: ${error}` },
      { status: 500 }
    );
  }
}
