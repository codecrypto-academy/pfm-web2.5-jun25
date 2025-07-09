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
      node_id, // allow custom node id from request
      memoryLimit,
      cpuLimit,
      labels,
      env
    } = body;

    // Validate node type (allow validator)
    if (!['miner', 'rpc', 'validator'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Node type must be "miner", "validator", or "rpc"' },
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

    // Use custom node_id if provided, otherwise generate
    const nodeId = node_id && typeof node_id === 'string' && node_id.trim() !== ''
      ? node_id.trim()
      : NODE_ID_GENERATION.DYNAMIC_PATTERN(nodeIdPrefix);

    // Remove any stale container for this node before proceeding
    const staleContainer = await dockerManager.findNodeContainer(networkId, nodeId);
    if (staleContainer && staleContainer.Id) {
      try {
        // Try to remove, if fails with 304 (already stopped), call remove() directly
        try {
          await dockerManager.removeContainer(staleContainer.Id);
          console.info(`Removed stale container for node ${nodeId} in network ${networkId}`);
        } catch (err: any) {
          if (err?.statusCode === 304) {
            // Container already stopped, try remove directly
            try {
              const docker = dockerManager.docker;
              const containerObj = docker.getContainer(staleContainer.Id);
              await containerObj.remove();
              console.info(`Force-removed stopped container for node ${nodeId}`);
            } catch (removeErr) {
              console.warn(`Failed to force-remove stopped container for node ${nodeId}:`, removeErr);
            }
          } else {
            throw err;
          }
        }
      } catch (err) {
        console.warn(`Failed to remove stale container for node ${nodeId}:`, err);
      }
    }

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

    // Create node directory and write key files BEFORE starting container
    const nodePath = await NetworkStorage.createNodeDirectory(networkId, nodeId);
    await fs.promises.mkdir(nodePath, { recursive: true });
    // Ensure no directory exists at the file paths before writing
    const keyFile = path.join(nodePath, FILE_NAMING.NODE_FILES.PRIVATE_KEY);
    const addressFile = path.join(nodePath, FILE_NAMING.NODE_FILES.ADDRESS);
    const enodeFile = path.join(nodePath, FILE_NAMING.NODE_FILES.ENODE);
    for (const filePath of [keyFile, addressFile, enodeFile]) {
      try {
        const stat = await fs.promises.lstat(filePath).catch(() => null);
        if (stat && stat.isDirectory()) {
          await fs.promises.rm(filePath, { recursive: true, force: true });
        }
      } catch {}
    }
    // Write private key (validator/miner/rpc): must be 64 hex chars, no 0x
    const privKey = credentials.privateKey.startsWith('0x') ? credentials.privateKey.slice(2) : credentials.privateKey;
    if (!/^[0-9a-fA-F]{64}$/.test(privKey)) {
      throw new Error('Generated private key is not a valid 64-character hex string');
    }
    await fs.promises.writeFile(keyFile, privKey);
    await fs.promises.writeFile(addressFile, credentials.address);
    await fs.promises.writeFile(enodeFile, credentials.enode);

    try {
      // Add node to Docker network (will fail if port conflict, etc.)
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
      // Clean up node directory and DB entry if Docker fails
      try { await fs.promises.rm(nodePath, { recursive: true, force: true }); } catch {}
      try { await NetworkStorage.removeNodeFromNetwork(networkId, nodeId); } catch {}
      throw error;
    }

  } catch (error: any) {
    console.error('Failed to add node:', error);
    let errorMsg = 'Failed to add node to network';
    // Docker port conflict error message
    if (typeof error?.message === 'string' && error.message.includes('Bind for 0.0.0.0')) {
      const portMatch = error.message.match(/Bind for 0.0.0.0:(\d+)/);
      if (portMatch) {
        errorMsg = `Port ${portMatch[1]} is already in use by another container. Please choose a different port or remove the conflicting container.`;
      } else {
        errorMsg = 'Port conflict: a required port is already in use by another container.';
      }
    } else if (error?.json?.message) {
      errorMsg = error.json.message;
    } else if (error?.message) {
      errorMsg = error.message;
    }
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
