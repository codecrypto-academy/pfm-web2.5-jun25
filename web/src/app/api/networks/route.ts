import { NextRequest, NextResponse } from 'next/server';
import { DockerManager, GenesisGenerator, KeyGenerator } from 'besu-network-manager';
import type { NetworkConfig, BesuNodeConfig } from 'besu-network-manager';
import * as fs from 'fs';
import * as path from 'path';

// Simple in-memory storage (will move to database later)
const networksDataDir = '/tmp/besu-networks';

// Ensure data directory exists
if (!fs.existsSync(networksDataDir)) {
  fs.mkdirSync(networksDataDir, { recursive: true });
}

const dockerManager = new DockerManager();

interface StoredNetworkData {
  config: NetworkConfig;
  nodes: BesuNodeConfig[];
  genesis: any;
  createdAt: string;
}

// Helper functions for file-based storage
function saveNetworkData(networkId: string, data: StoredNetworkData): void {
  const filePath = path.join(networksDataDir, `${networkId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function loadNetworkData(networkId: string): StoredNetworkData | null {
  const filePath = path.join(networksDataDir, `${networkId}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function deleteNetworkData(networkId: string): void {
  const filePath = path.join(networksDataDir, `${networkId}.json`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function listNetworkIds(): string[] {
  return fs.readdirSync(networksDataDir)
    .filter(file => file.endsWith('.json'))
    .map(file => file.replace('.json', ''));
}

// Helper function to generate IP addresses
function generateNodeIPs(subnet: string, count: number): string[] {
  // Simple IP generation - assumes /24 subnet
  const baseIP = subnet.split('/')[0].split('.').slice(0, 3).join('.');
  const ips: string[] = [];
  for (let i = 0; i < count; i++) {
    ips.push(`${baseIP}.${10 + i}`); // Start from .10
  }
  return ips;
}

// Helper function to allocate ports
function allocatePorts(nodeCount: number): { rpcPorts: number[], p2pPorts: number[] } {
  const rpcPorts: number[] = [];
  const p2pPorts: number[] = [];
  
  for (let i = 0; i < nodeCount; i++) {
    rpcPorts.push(8545 + i);
    p2pPorts.push(30303 + i);
  }
  
  return { rpcPorts, p2pPorts };
}

function getAllNetworks(): StoredNetworkData[] {
  const networkIds = listNetworkIds();
  const networks: StoredNetworkData[] = [];
  
  for (const networkId of networkIds) {
    const networkData = loadNetworkData(networkId);
    if (networkData) {
      networks.push(networkData);
    }
  }
  
  return networks;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { networkId, chainId, subnet = '172.20.0.0/24', nodes = [] } = body;

    // Validation
    if (!networkId || !chainId) {
      return NextResponse.json(
        { success: false, error: 'networkId and chainId are required' },
        { status: 400 }
      );
    }

    // Check if network already exists
    if (loadNetworkData(networkId)) {
      return NextResponse.json(
        { success: false, error: `Network ${networkId} already exists` },
        { status: 400 }
      );
    }

    // Check Docker availability
    if (!(await dockerManager.isDockerAvailable())) {
      return NextResponse.json(
        { success: false, error: 'Docker is not available' },
        { status: 500 }
      );
    }

    // Generate gateway IP
    const gateway = subnet.replace('/24', '').replace(/\d+$/, '1');

    const networkConfig: NetworkConfig = {
      networkId,
      chainId,
      subnet,
      gateway
    };

    // Create initial bootnode
    const bootnodeKeyPair = KeyGenerator.generateKeyPair();
    const nodeIPs = generateNodeIPs(subnet, 1 + nodes.length);
    const { rpcPorts, p2pPorts } = allocatePorts(1 + nodes.length);

    const bootnodeConfig: BesuNodeConfig = {
      id: 'bootnode',
      type: 'bootnode',
      rpcPort: rpcPorts[0],
      p2pPort: p2pPorts[0],
      ip: nodeIPs[0],
      privateKey: bootnodeKeyPair.privateKey,
      address: bootnodeKeyPair.address
    };

    // Prepare additional nodes
    const allNodes: BesuNodeConfig[] = [bootnodeConfig];
    for (let i = 0; i < nodes.length; i++) {
      const nodeKeyPair = KeyGenerator.generateKeyPair();
      const nodeConfig: BesuNodeConfig = {
        id: nodes[i].id || `node-${i + 1}`,
        type: nodes[i].type || 'miner',
        rpcPort: rpcPorts[i + 1],
        p2pPort: p2pPorts[i + 1],
        ip: nodeIPs[i + 1],
        privateKey: nodeKeyPair.privateKey,
        address: nodeKeyPair.address
      };
      allNodes.push(nodeConfig);
    }

    // Generate genesis with bootnode as validator
    const genesis = GenesisGenerator.generateGenesis({
      chainId,
      validators: [bootnodeKeyPair.address]
    });

    // Write genesis to file
    const genesisPath = GenesisGenerator.writeGenesisToFile(networkId, genesis);

    // Create Docker network
    await dockerManager.createDockerNetwork(networkConfig);

    console.log('About to create bootnode:', bootnodeConfig.id);
    // Create bootnode first
    await dockerManager.createBesuContainer(networkConfig, bootnodeConfig, genesisPath);
    console.log('Bootnode created successfully');

    // Wait a bit for bootnode to start
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('About to create additional nodes:', allNodes.slice(1).map(n => n.id));
    // Create other nodes
    for (const nodeConfig of allNodes.slice(1)) {
      console.log('Creating node:', nodeConfig.id);
      await dockerManager.createBesuContainer(networkConfig, nodeConfig, genesisPath);
      console.log('Node created:', nodeConfig.id);
    }

    // Save network data
    const networkData: StoredNetworkData = {
      config: networkConfig,
      nodes: allNodes,
      genesis,
      createdAt: new Date().toISOString()
    };
    saveNetworkData(networkId, networkData);

    console.info(`Network ${networkId} created successfully`);

    return NextResponse.json({
      success: true,
      network: {
        networkId,
        chainId,
        subnet,
        nodeCount: allNodes.length,
        nodes: allNodes.map(node => ({
          id: node.id,
          type: node.type,
          rpcPort: node.rpcPort,
          p2pPort: node.p2pPort,
          ip: node.ip,
          address: node.address
        }))
      }
    });

  } catch (error) {
    console.error('Failed to create network:', error);
    return NextResponse.json(
      { success: false, error: `Failed to create network: ${error}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const networkIds = listNetworkIds();
    const networks = [];

    for (const networkId of networkIds) {
      const data = loadNetworkData(networkId);
      if (data) {
        const dockerInfo = dockerManager.getNetworkInfo(networkId);
        networks.push({
          networkId,
          chainId: data.config.chainId,
          subnet: data.config.subnet,
          nodeCount: data.nodes.length,
          status: dockerInfo ? 'running' : 'stopped',
          createdAt: data.createdAt
        });
      }
    }

    return NextResponse.json({ success: true, networks });
  } catch (error) {
    console.error('Failed to list networks:', error);
    return NextResponse.json(
      { success: false, error: `Failed to list networks: ${error}` },
      { status: 500 }
    );
  }
}

// DELETE /api/networks - Delete all networks
export async function DELETE(request: NextRequest) {
  try {
    const networks = getAllNetworks();
    const results = [];
    
    for (const network of networks) {
      try {
        // Remove Docker network and all containers
        await dockerManager.removeDockerNetwork(network.config.networkId);
        
        // Remove network data file
        const filePath = path.join(networksDataDir, `${network.config.networkId}.json`);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        
        results.push({
          networkId: network.config.networkId,
          status: 'removed'
        });
      } catch (error) {
        console.error(`Failed to remove network ${network.config.networkId}:`, error);
        results.push({
          networkId: network.config.networkId,
          status: 'error',
          error: String(error)
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${networks.length} networks`,
      results
    });

  } catch (error) {
    console.error('Error deleting networks:', error);
    return NextResponse.json(
      { success: false, error: `Failed to delete networks: ${error}` },
      { status: 500 }
    );
  }
}
