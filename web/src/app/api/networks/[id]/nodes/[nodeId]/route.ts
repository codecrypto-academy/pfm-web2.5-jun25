import { NextRequest, NextResponse } from 'next/server';
import { DockerManager } from 'besu-network-manager';
import * as fs from 'fs';
import * as path from 'path';

const networksDataDir = '/tmp/besu-networks';
const dockerManager = new DockerManager();

interface StoredNetworkData {
  config: any;
  nodes: any[];
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

// DELETE /api/simple-networks/[id]/nodes/[nodeId] - Remove specific node from network
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
  try {
    const { id: networkId, nodeId } = await params;

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

    // Don't allow removing the bootnode
    if (node.type === 'bootnode') {
      return NextResponse.json(
        { success: false, error: 'Cannot remove bootnode' },
        { status: 400 }
      );
    }

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
