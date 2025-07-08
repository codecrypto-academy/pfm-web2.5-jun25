/**
 * Network Nodes API
 * GET /api/networks/[id]/nodes - List nodes in network
 * POST /api/networks/[id]/nodes - Add node to network
 */
import { NextRequest, NextResponse } from 'next/server';
import { DockerManager, KeyGenerator, BesuNodeConfig } from 'besu-network-manager';
import { NetworkStorage } from '@/lib/databaseStorage';
import { generateNodeIPs } from '@/lib/networkUtils';
import { PORT_DEFAULTS, NODE_ID_GENERATION, FILE_NAMING } from '@/lib/config';
import type { AddNodeRequest } from '@/lib/types';
import * as path from 'path';
import * as fs from 'fs';

const dockerManager = new DockerManager();
const keyGenerator = new KeyGenerator();

/**
 * GET /api/networks/[id]/nodes
 * List all nodes in a network
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

    // Get Docker container status for each node
    const nodesWithStatus = [];
    
    for (const node of networkData.nodes) {
      const container = await dockerManager.findNodeContainer(networkId, node.id);
      nodesWithStatus.push({
        id: node.id,
        type: node.type,
        ip: node.ip,
        rpcPort: node.rpcPort,
        p2pPort: node.p2pPort,
        address: node.address,
        enode: node.enode,
        containerStatus: container ? {
          containerId: container.Id,
          state: container.State,
          status: container.Status
        } : null
      });
    }

    return NextResponse.json({
      success: true,
      networkId,
      nodes: nodesWithStatus
    });

  } catch (error) {
    console.error('Failed to list nodes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list nodes' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/networks/[id]/nodes
 * Add a new node to an existing network
 * 
 * Body: {
 *   type: 'miner' | 'rpc',
 *   ip?: string,
 *   rpcPort?: number,
 *   p2pPort?: number,
 *   ipOffset?: number,
 *   portStrategy?: 'sequential' | 'random',
 *   nodeIdPrefix?: string,
 *   memoryLimit?: string,
 *   cpuLimit?: string,
 *   labels?: Record<string, string>,
 *   env?: Record<string, string>
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: networkId } = await params;
    const body: AddNodeRequest = await request.json();
    
    const networkData = await NetworkStorage.loadNetwork(networkId);
    if (!networkData) {
      return NextResponse.json(
        { success: false, error: 'Network not found' },
        { status: 404 }
      );
    }

    // Check if Docker network exists
    if (!await dockerManager.networkExists(networkId)) {
      return NextResponse.json(
        { success: false, error: 'Docker network not found' },
        { status: 404 }
      );
    }

    const { 
      type = 'miner',
      ip,
      rpcPort,
      p2pPort,
      ipOffset = 10,
      portStrategy = 'sequential',
      nodeIdPrefix = 'node',
      memoryLimit,
      cpuLimit,
      labels,
      env
    } = body;

    // Validate node type
    if (!['miner', 'rpc'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Node type must be "miner" or "rpc"' },
        { status: 400 }
      );
    }

    // Generate default values if not provided
    const nextNodeIndex = networkData.nodes.length;
    
    // Use network subnet to generate appropriate IP if not provided
    let nodeIp = ip;
    if (!nodeIp) {
      const availableIPs = generateNodeIPs(networkData.config.subnet, nextNodeIndex + 1, ipOffset);
      nodeIp = availableIPs[nextNodeIndex];
    }
    
    // Get used ports for conflict checking
    const usedRpcPorts = networkData.nodes.map(node => node.rpcPort);
    const usedP2pPorts = networkData.nodes.map(node => node.p2pPort);
    
    // Auto-assign ports only if not provided by user
    let nodeRpcPort = rpcPort;
    let nodeP2pPort = p2pPort;
    
    if (!nodeRpcPort) {
      // Find next available RPC port starting from configured base
      let candidatePort = PORT_DEFAULTS.BASE_RPC_PORT;
      while (usedRpcPorts.includes(candidatePort)) {
        candidatePort++;
      }
      nodeRpcPort = candidatePort;
    }
    
    if (!nodeP2pPort) {
      // Find next available P2P port starting from configured base
      let candidatePort = PORT_DEFAULTS.BASE_P2P_PORT;
      while (usedP2pPorts.includes(candidatePort)) {
        candidatePort++;
      }
      nodeP2pPort = candidatePort;
    }

    // Check for port conflicts (if user provided specific ports)
    if (usedRpcPorts.includes(nodeRpcPort)) {
      return NextResponse.json(
        { success: false, error: `RPC port ${nodeRpcPort} is already in use` },
        { status: 400 }
      );
    }
    
    if (usedP2pPorts.includes(nodeP2pPort)) {
      return NextResponse.json(
        { success: false, error: `P2P port ${nodeP2pPort} is already in use` },
        { status: 400 }
      );
    }

    // Generate node credentials
    const nodeId = NODE_ID_GENERATION.DYNAMIC_PATTERN(nodeIdPrefix);
    const credentials = keyGenerator.generateKeyPair(nodeIp, nodeP2pPort);

    // Find existing bootnodes
    const bootnodes = networkData.nodes
      .filter(node => node.type === 'bootnode')
      .map(node => node.enode)
      .filter(Boolean) as string[];

    const nodeConfig: BesuNodeConfig = {
      id: nodeId,
      type,
      ip: nodeIp,
      rpcPort: nodeRpcPort,
      p2pPort: nodeP2pPort,
      address: credentials.address,
      enode: credentials.enode,
      bootnodes: bootnodes.length > 0 ? bootnodes : undefined
    };

    // Create node directory and save keys
    const nodePath = await NetworkStorage.createNodeDirectory(networkId, nodeId);
    
    await fs.promises.writeFile(
      path.join(nodePath, FILE_NAMING.NODE_FILES.PRIVATE_KEY), 
      credentials.privateKey.slice(2)
    );
    await fs.promises.writeFile(
      path.join(nodePath, FILE_NAMING.NODE_FILES.ADDRESS), 
      credentials.address
    );
    await fs.promises.writeFile(
      path.join(nodePath, FILE_NAMING.NODE_FILES.ENODE), 
      credentials.enode
    );

    // Add node to Docker network
    const container = await dockerManager.addNodeToNetwork(
      networkData.config,
      nodeConfig,
      nodePath
    );

    // Update network metadata
    await NetworkStorage.addNodeToNetwork(networkId, nodeConfig);

    return NextResponse.json({
      success: true,
      node: {
        id: nodeId,
        type,
        ip: nodeIp,
        rpcPort: nodeRpcPort,
        p2pPort: nodeP2pPort,
        address: credentials.address,
        enode: credentials.enode,
        containerId: container.containerId,
        containerName: container.containerName
      }
    });

  } catch (error) {
    console.error('Failed to add node:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add node to network' },
      { status: 500 }
    );
  }
}
