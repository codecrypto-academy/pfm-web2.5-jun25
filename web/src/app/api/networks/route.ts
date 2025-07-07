/**
 * Networks API - Main endpoint for network management
 * GET /api/networks - List all networks
 * POST /api/networks - Create a new network
 * 
 * @example POST /api/networks
 * {
 *   "networkId": "my-test-network",
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
 *     "networkId": "my-test-network",
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
  NetworkConfig,
  BesuNodeConfig 
} from 'besu-network-manager';
import { NetworkStorage, StoredNetworkData } from '@/lib/storage';
import { 
  generateNodeIPs, 
  generateNodePorts, 
  generateNodeTypes, 
  validateNetworkConfig 
} from '@/lib/networkUtils';
import { 
  NETWORK_DEFAULTS, 
  PORT_DEFAULTS, 
  getBesuImage,
  DOCKER_DEFAULTS,
  NODE_ID_GENERATION,
  FILE_NAMING
} from '@/lib/config';
import type { 
  CreateNetworkRequest, 
  CreateNetworkResponse,
  ListNetworksResponse,
  NetworkListQuery
} from '@/lib/types';
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
    const networkIds = NetworkStorage.listNetworks();
    const networks = networkIds.map(id => {
      const data = NetworkStorage.loadNetwork(id);
      if (!data) return null;
      
      return {
        networkId: id,
        chainId: data.config.chainId,
        subnet: data.config.subnet,
        nodesCount: data.nodes.length,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };
    }).filter(Boolean);

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
 *   networkId: string,
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
  try {
    const body = await request.json();
    const { 
      networkId, 
      chainId, 
      nodeCount = NETWORK_DEFAULTS.NODE_COUNT,
      subnet = NETWORK_DEFAULTS.SUBNET,
      gateway = NETWORK_DEFAULTS.GATEWAY,
      baseRpcPort = PORT_DEFAULTS.BASE_RPC_PORT,
      baseP2pPort = PORT_DEFAULTS.BASE_P2P_PORT,
      bootnodeCount = NETWORK_DEFAULTS.BOOTNODE_COUNT,
      minerCount,
      besuImage = DOCKER_DEFAULTS.BESU_IMAGE,
      memoryLimit = DOCKER_DEFAULTS.MEMORY_LIMIT,
      cpuLimit = DOCKER_DEFAULTS.CPU_LIMIT,
      labels = {},
      env = {}
    } = body;

    // Validate input
    const validation = validateNetworkConfig({
      networkId,
      chainId,
      nodeCount,
      subnet,
      gateway
    });

    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // Check if network already exists
    if (NetworkStorage.loadNetwork(networkId)) {
      return NextResponse.json(
        { success: false, error: 'Network already exists' },
        { status: 409 }
      );
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
      gateway,
      nodes: []
    };

    // 2. Generate dynamic node configurations
    const nodeIPs = generateNodeIPs(subnet, nodeCount);
    const { rpcPorts, p2pPorts } = generateNodePorts(nodeCount, baseRpcPort, baseP2pPort);
    const nodeTypes = generateNodeTypes(nodeCount, bootnodeCount, minerCount);
    
    const nodeCredentials = [];
    const validators = [];

    for (let i = 0; i < nodeCount; i++) {
      const ip = nodeIPs[i];
      const rpcPort = rpcPorts[i];
      const p2pPort = p2pPorts[i];
      const nodeType = nodeTypes[i];
      
      const credentials = keyGenerator.generateKeyPair(ip, p2pPort);
      
      const nodeConfig: BesuNodeConfig = {
        id: NODE_ID_GENERATION.NETWORK_PATTERN(i),
        type: nodeType as 'bootnode' | 'miner' | 'rpc',
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

      networkConfig.nodes.push(nodeConfig);
      nodeCredentials.push(credentials);

      if (nodeConfig.type === 'miner') {
        validators.push(credentials.address);
      }
    }

    // 3. Generate genesis file
    const genesis = GenesisGenerator.generateGenesis({
      chainId,
      validators
    });

    // 4. Create Docker network
    const dockerNetworkId = await dockerManager.createDockerNetwork(networkConfig);

    // 5. Create network directory structure
    const networkPath = await NetworkStorage.createNetworkDirectory(networkId);

    // 6. Save node keys and files
    for (let i = 0; i < networkConfig.nodes.length; i++) {
      const node = networkConfig.nodes[i];
      const credentials = nodeCredentials[i];
      
      // Create node directory
      const nodePath = await NetworkStorage.createNodeDirectory(networkId, node.id);
      
      // Save node files
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
    const containers = [];
    for (const node of networkConfig.nodes) {
      const nodePath = NetworkStorage.getNodePath(networkId, node.id);
      const container = await dockerManager.createBesuContainer(
        networkConfig,
        node,
        nodePath
      );
      containers.push(container);
    }

    // 8. Save network metadata
    const networkData: StoredNetworkData = {
      config: networkConfig,
      nodes: networkConfig.nodes,
      genesis,
      dockerNetworkId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    NetworkStorage.saveNetwork(networkId, networkData);

    return NextResponse.json({
      success: true,
      network: {
        networkId,
        chainId,
        dockerNetworkId,
        subnet,
        gateway,
        containersCreated: containers.length,
        nodes: networkConfig.nodes.map(n => ({
          id: n.id,
          type: n.type,
          ip: n.ip,
          rpcPort: n.rpcPort,
          p2pPort: n.p2pPort,
          address: n.address
        }))
      }
    });

  } catch (error) {
    console.error('Network creation failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create network' },
      { status: 500 }
    );
  }
}
