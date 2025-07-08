/**
 * Individual Node API
 * GET /api/networks/[id]/nodes/[nodeId] - Get node details
 * DELETE /api/networks/[id]/nodes/[nodeId] - Remove node from network
 */
import { NextRequest, NextResponse } from 'next/server';
import { DockerManager } from 'besu-network-manager';
import { NetworkStorage } from '@/lib/databaseStorage';
import { FILE_NAMING } from '@/lib/config';
import * as fs from 'fs';

const dockerManager = new DockerManager();

/**
 * GET /api/networks/[id]/nodes/[nodeId]
 * Get detailed information about a specific node
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
  try {
    const { id: networkId, nodeId } = await params;
    
    const networkData = await NetworkStorage.loadNetwork(networkId);
    if (!networkData) {
      return NextResponse.json(
        { success: false, error: 'Network not found' },
        { status: 404 }
      );
    }

    const node = networkData.nodes.find(n => n.id === nodeId);
    if (!node) {
      return NextResponse.json(
        { success: false, error: 'Node not found' },
        { status: 404 }
      );
    }

    // Get Docker container information
    const container = await dockerManager.findNodeContainer(networkId, nodeId);
    
    // Read node files if they exist
    const nodePath = NetworkStorage.getNodePath(networkId, nodeId);
    let nodeFiles = {};
    
    try {
      if (fs.existsSync(nodePath)) {
        const keyPath = `${nodePath}/${FILE_NAMING.NODE_FILES.PRIVATE_KEY}`;
        const addressPath = `${nodePath}/${FILE_NAMING.NODE_FILES.ADDRESS}`;
        const enodePath = `${nodePath}/${FILE_NAMING.NODE_FILES.ENODE}`;
        
        nodeFiles = {
          hasKeyFile: fs.existsSync(keyPath),
          hasAddressFile: fs.existsSync(addressPath),
          hasEnodeFile: fs.existsSync(enodePath)
        };
      }
    } catch (error) {
      console.warn('Could not read node files:', error);
    }

    return NextResponse.json({
      success: true,
      node: {
        id: node.id,
        type: node.type,
        ip: node.ip,
        rpcPort: node.rpcPort,
        p2pPort: node.p2pPort,
        address: node.address,
        enode: node.enode,
        bootnodes: node.bootnodes || [],
        files: nodeFiles,
        container: container ? {
          containerId: container.Id,
          names: container.Names,
          state: container.State,
          status: container.Status,
          ports: container.Ports
        } : null
      }
    });

  } catch (error) {
    console.error('Failed to get node details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get node details' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/networks/[id]/nodes/[nodeId]
 * Remove a node from the network
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
  try {
    const { id: networkId, nodeId } = await params;
    
    const networkData = await NetworkStorage.loadNetwork(networkId);
    if (!networkData) {
      return NextResponse.json(
        { success: false, error: 'Network not found' },
        { status: 404 }
      );
    }

    const node = networkData.nodes.find(n => n.id === nodeId);
    if (!node) {
      return NextResponse.json(
        { success: false, error: 'Node not found' },
        { status: 404 }
      );
    }

    // Don't allow removing the last bootnode
    const bootnodes = networkData.nodes.filter(n => n.type === 'bootnode');
    if (node.type === 'bootnode' && bootnodes.length === 1) {
      return NextResponse.json(
        { success: false, error: 'Cannot remove the last bootnode' },
        { status: 400 }
      );
    }

    // Remove Docker container
    await dockerManager.removeNodeFromNetwork(networkId, nodeId);

    // Remove node directory
    const nodePath = NetworkStorage.getNodePath(networkId, nodeId);
    if (fs.existsSync(nodePath)) {
      await fs.promises.rm(nodePath, { recursive: true, force: true });
    }

    // Update network metadata
    await NetworkStorage.removeNodeFromNetwork(networkId, nodeId);

    return NextResponse.json({
      success: true,
      removed: {
        nodeId,
        containerRemoved: true,
        filesRemoved: true,
        metadataUpdated: true
      }
    });

  } catch (error) {
    console.error('Failed to remove node:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove node' },
      { status: 500 }
    );
  }
}
