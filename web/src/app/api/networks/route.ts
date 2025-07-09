/**
 * Networks API - Main endpoint for network management
 * GET /api/networks - List all networks
 * POST /api/networks - Create a new network
 *
 * @example POST /api/networks
 * {
 *   "id": "my-test-network",
 *   "chainId": 1337,
 *   "nodeCount": 3,
 *   "subnet": "172.21.0.0/24",
 *   "gateway": "172.21.0.1",
 *   "baseRpcPort": 8545,
 *   "baseP2pPort": 30303,
 *   "bootnodeCount": 1,
 *   "minerCount": 2,
 *   "besuImage": "hyperledger/besu:latest",
 *   "memoryLimit": "2g",
 *   "cpuLimit": "1.0"
 * }
 *
 * @example Response
 * {
 *   "success": true,
 *   "network": {
 *     "id": "my-test-network",
 *     "chainId": 1337,
 *     "dockerNetworkId": "abc123",
 *     "subnet": "172.21.0.0/24",
 *     "gateway": "172.21.0.1",
 *     "containersCreated": 3,
 *     "nodes": [...]
 *   }
 * }
 */
import { NextRequest, NextResponse } from 'next/server';
import { 
  DockerManager, 
  GenesisGenerator, 
  KeyGenerator,
  NetworkConfig
} from 'besu-network-manager';

// Extend BesuNodeConfig locally to allow 'validator' type
type BesuNodeConfig = {
  id: string;
  type: 'bootnode' | 'miner' | 'validator' | 'rpc';
  rpcPort: number;
  p2pPort: number;
  ip: string;
  enode?: string;
  address?: string;
  bootnodes?: string[];
};
import { NetworkStorage, StoredNetworkData } from '@/lib/databaseStorage';
import { 
  generateNodeIPs, 
  generateNodePorts, 
  generateNodeTypes, 
  validateNetworkConfig,
  calculateGateway 
} from '@/lib/networkUtils';
import { 
  NETWORK_DEFAULTS, 
  PORT_DEFAULTS,
  DOCKER_DEFAULTS,
  NODE_ID_GENERATION,
  FILE_NAMING
} from '@/lib/config';
import * as path from 'path';
import * as fs from 'fs';

// Initialize SDK components
const dockerManager = new DockerManager();
const keyGenerator = new KeyGenerator();

/**
 * GET /api/networks
 * List all networks
 */
export async function GET() {
  try {
    const networkIds = await NetworkStorage.listNetworks();
    const networkPromises = networkIds.map(async id => {
      const data = await NetworkStorage.loadNetwork(id);
      if (!data) return null;
      
      return {
        networkId: id,
        chainId: data.config.chainId,
        subnet: data.config.subnet,
        nodesCount: data.nodes.length,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };
    });
    
    const networks = (await Promise.all(networkPromises)).filter(Boolean);

    return NextResponse.json({
      success: true,
      networks
    });
  } catch (error) {
    console.error('Failed to list networks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list networks' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/networks
 * Create a new network
 *
 * Body: {
 *   id: string,
 *   chainId: number,
 *   nodeCount: number,
 *   subnet?: string,
 *   gateway?: string,
 *   baseRpcPort?: number,
 *   baseP2pPort?: number,
 *   bootnodeCount?: number,
 *   minerCount?: number
 * }
 */
export async function POST(request: NextRequest) {
  let dockerNetworkCreated = false;
  let dockerNetworkId = null;
  let createdContainers: any[] = [];
  try {
    const body = await request.json();
    const { 
      networkId, 
      chainId, 
      nodeCount = NETWORK_DEFAULTS.NODE_COUNT,
      subnet = NETWORK_DEFAULTS.SUBNET,
      gateway,
      baseRpcPort = PORT_DEFAULTS.BASE_RPC_PORT,
      baseP2pPort = PORT_DEFAULTS.BASE_P2P_PORT,
      bootnodeCount = NETWORK_DEFAULTS.BOOTNODE_COUNT,
      minerCount,
      besuImage = DOCKER_DEFAULTS.BESU_IMAGE,
      memoryLimit = DOCKER_DEFAULTS.MEMORY_LIMIT,
      cpuLimit = DOCKER_DEFAULTS.CPU_LIMIT,
      labels = {},
      env = {},
    } = body;

    // Calculate gateway if not provided
    const finalGateway = gateway || calculateGateway(subnet);

    // Validate input
    const validation = validateNetworkConfig({
      networkId,
      chainId,
      nodeCount,
      subnet,
      gateway: finalGateway
    });

    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // Check if network already exists in DB
    const existingNetwork = await NetworkStorage.loadNetwork(networkId);
    if (existingNetwork) {
      // Try to delete it (cleanup DB and Docker)
      try {
        const containers = await dockerManager.findNetworkContainers(networkId);
        for (const container of containers) {
          try { await dockerManager.removeContainer(container.Id); } catch {}
        }
        await dockerManager.removeDockerNetwork(networkId);
        await NetworkStorage.cleanupNetwork(networkId);
      } catch (cleanupErr) {
        return NextResponse.json(
          { success: false, error: 'Network already exists and could not be cleaned up automatically. Please remove it manually.' },
          { status: 409 }
        );
      }
    }

    // Check Docker availability
    if (!await dockerManager.isDockerAvailable()) {
      return NextResponse.json(
        { success: false, error: 'Docker is not available' },
        { status: 500 }
      );
    }

    // 1. Generate network configuration
    const networkConfig: NetworkConfig = {
      networkId,
      chainId,
      subnet,
      gateway: finalGateway,
      nodes: [] // will assign SDK-compatible nodes later
    };


    // 2. Generate dynamic node configurations (legacy: only bootnode, miner, rpc)
    const nodeIPs = generateNodeIPs(subnet, nodeCount);
    const { rpcPorts, p2pPorts } = generateNodePorts(nodeCount, baseRpcPort, baseP2pPort);
    // Compose nodeTypes array: bootnode, miner, rpc
    const rpcCount = nodeCount - bootnodeCount - (minerCount || 0);
    const nodeTypes: string[] = [];
    for (let i = 0; i < bootnodeCount; i++) nodeTypes.push('bootnode');
    for (let i = 0; i < (minerCount || 0); i++) nodeTypes.push('miner');
    for (let i = 0; i < rpcCount; i++) nodeTypes.push('rpc');

    const nodeCredentials = [];
    const allNodeAddresses: string[] = [];
    const allNodeConfigs: BesuNodeConfig[] = [];

    for (let i = 0; i < nodeCount; i++) {
      const ip = nodeIPs[i];
      const rpcPort = rpcPorts[i];
      const p2pPort = p2pPorts[i];
      const nodeType = nodeTypes[i];
      const credentials = keyGenerator.generateKeyPair(ip, p2pPort);
      const nodeConfig: BesuNodeConfig = {
        id: NODE_ID_GENERATION.NETWORK_PATTERN(i),
        type: nodeType as BesuNodeConfig['type'],
        ip,
        rpcPort,
        p2pPort,
        address: credentials.address,
        enode: credentials.enode
      };
      // Set bootnodes for non-bootnode nodes
      if (nodeConfig.type !== 'bootnode' && nodeCredentials.length > 0) {
        // Use all bootnode enodes as bootnodes
        const bootnodeEnodes = nodeCredentials
          .slice(0, bootnodeCount)
          .map(cred => cred.enode);
        nodeConfig.bootnodes = bootnodeEnodes;
      }
      allNodeConfigs.push(nodeConfig);
      nodeCredentials.push(credentials);
      allNodeAddresses.push(credentials.address);
    }

    // Only assign SDK-compatible nodes to networkConfig.nodes
    networkConfig.nodes = allNodeConfigs.filter(n => n.type === 'bootnode' || n.type === 'miner' || n.type === 'rpc') as any;

    // Use all miners for genesis validators
    const validators = allNodeConfigs
      .filter(n => n.type === 'miner')
      .map(n => n.address)
      .filter((addr): addr is string => Boolean(addr));

    // 3. Generate genesis file
    const genesis = GenesisGenerator.generateGenesis({
      chainId,
      validators
    });

    // 4. Create Docker network
    try {
      dockerNetworkId = await dockerManager.createDockerNetwork(networkConfig);
      dockerNetworkCreated = true;
    } catch (err: any) {
      if (err.statusCode === 409) {
        return NextResponse.json({ success: false, error: `Docker network with name besu-${networkId} already exists. Please remove it or choose a different networkId.` }, { status: 409 });
      }
      throw err;
    }

    // 5. Create network directory structure
    const networkPath = await NetworkStorage.createNetworkDirectory(networkId);

    // 6. Save node keys and files
    for (let i = 0; i < allNodeConfigs.length; i++) {
      const node = allNodeConfigs[i];
      const credentials = nodeCredentials[i];
      // Create node directory
      const nodePath = await NetworkStorage.createNodeDirectory(networkId, node.id);
      // Ensure node directory exists before writing files
      await fs.promises.mkdir(nodePath, { recursive: true });
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
    }

    // Save genesis file
    await fs.promises.writeFile(
      path.join(networkPath, FILE_NAMING.NETWORK_FILES.GENESIS),
      JSON.stringify(genesis, null, 2)
    );


    // 7. Create and start containers
    createdContainers = [];
    for (const node of allNodeConfigs) {
      // Only create containers for SDK-supported node types
      if (node.type === 'bootnode' || node.type === 'miner' || node.type === 'rpc') {
        const nodePath = NetworkStorage.getNodePath(networkId, node.id);
        try {
          // Only start mining for 'miner' nodes (legacy SDK: no mining flag)
          const container = await dockerManager.createBesuContainer(
            networkConfig,
            node as any,
            nodePath
          );
          createdContainers.push(container);
        } catch (err: any) {
          // Clean up all created containers and network if any container fails
          for (const c of createdContainers) {
            try { await dockerManager.removeContainer(c.containerId); } catch {}
          }
          if (dockerNetworkCreated && dockerNetworkId) {
            try { await dockerManager.removeDockerNetwork(networkId); } catch {}
          }
          return NextResponse.json({ success: false, error: `Failed to create container for node ${node.id}: ${err.message || err}` }, { status: 500 });
        }
      }
    }

    // 8. Save network metadata
    // Store all nodes for UI, but only SDK-compatible nodes in config/nodes
    const sdkNodes = allNodeConfigs.filter(n => n.type === 'bootnode' || n.type === 'miner' || n.type === 'rpc') as any;
    const networkData: StoredNetworkData & { allNodes?: BesuNodeConfig[] } = {
      config: { ...networkConfig, nodes: sdkNodes },
      nodes: sdkNodes,
      allNodes: allNodeConfigs, // for UI/metadata only
      genesis,
      dockerNetworkId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await NetworkStorage.saveNetwork(networkId, networkData);

    return NextResponse.json({
      success: true,
      network: {
        networkId,
        chainId,
        dockerNetworkId,
        subnet,
        gateway,
        containersCreated: createdContainers.length,
        nodes: allNodeConfigs.map(n => ({
          id: n.id,
          type: n.type,
          ip: n.ip,
          rpcPort: n.rpcPort,
          p2pPort: n.p2pPort,
          address: n.address
        }))
      }
    });

  } catch (error: any) {
    // Clean up on error
    if (createdContainers.length > 0) {
      for (const c of createdContainers) {
        try { await dockerManager.removeContainer(c.containerId); } catch {}
      }
    }
    if (dockerNetworkCreated && dockerNetworkId && typeof dockerNetworkId === 'string') {
      try { await dockerManager.removeDockerNetwork(dockerNetworkId); } catch {}
    }
    let errorMsg = error?.message || error?.toString() || 'Failed to create network';
    if (error?.json?.message) errorMsg = error.json.message;
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
