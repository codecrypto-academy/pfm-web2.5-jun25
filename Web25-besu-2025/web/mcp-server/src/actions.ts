// mcp-server/src/besu-network-manager.ts
// Interface MCP <-> lib-besu

import { 
  getNetworks, 
  getNetworkById,
  getNetworkByName, 
  createNetwork, 
  updateNetwork, 
  deleteNetwork,
  getNodes,
  getNodeById,
  createNode,
  updateNode,
  deleteNode,
  initializeDatabase
} from './data';
import { Network, Node, NodeType } from './types';
import * as besuManager from './besuManager';

// Initialize the database when the server starts
initializeDatabase().catch(error => {
  console.error('Failed to initialize database:', error);
});

// Network actions
export async function fetchNetworks() {
  return getNetworks();
}

export async function fetchNetworkById(id: string) {
  return getNetworkById(id);
}

export async function createNetworkAction(data: Omit<Network, "id" | "createdAt" | "updatedAt">) {
  const network = await createNetwork(data);
  return network;
}

export async function updateNetworkAction(id: string, data: Partial<Omit<Network, "id" | "createdAt" | "updatedAt" | "nodes">>) {
  const network = await updateNetwork(id, data);
  return network;
}

export async function deleteNetworkAction(id: string) {
  const success = await deleteNetwork(id);
  return success;
}

// Node actions
export async function fetchNodes(networkId: string) {
  return getNodes(networkId);
}

export async function fetchNodeById(networkId: string, nodeName: string) {
  return getNodeById(networkId, nodeName);
}

export async function createNodeAction(networkId: string, node: Node) {
  const nodes = await createNode(networkId, node);
  return nodes;
}

export async function updateNodeAction(networkId: string, nodeName: string, data: Partial<Node>) {
  const node = await updateNode(networkId, nodeName, data);
  return node;
}

export async function deleteNodeAction(networkId: string, nodeName: string) {
  const success = await deleteNode(networkId, nodeName);
  return success;
}

// Besu Network actions
export async function createBesuNetwork(
  name: string,
  chainId: number,
  subnet: string,
  bootnodeIP: string,
  signerAccount: string,
  listOfNodes: { nodeType: string; ip: string; name: string; port: number }[],
  prefundedAccounts: { address: string; amount: string }[] = [],
  autoSigner: boolean = false,
  nbrNetwork: number = 0
) {
  try {
    // Prepare all nodes with correct types and IDs
    const nodes = listOfNodes.map(node => ({
      id: `${name}-${node.name}`,
      networkId: name, // On utilisera le nom comme networkId
      name: node.name,
      type: node.nodeType as NodeType,
      ip: node.ip,
      port: node.port,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    // Create network in database with all nodes in one operation
    const network = await createNetworkAction({
      name,
      chainId,
      subnet,
      ip: bootnodeIP,
      signerAddress: signerAccount,
      accounts: prefundedAccounts.map(acc => ({ address: acc.address, balance: acc.amount })),
      nodes,
      autoSigner
    });

    if (!network) {
      throw new Error('Failed to create network in database');
    }

    // Create the actual Besu network
    const result = await besuManager.createBesuNetwork(
      name, 
      chainId, 
      subnet, 
      bootnodeIP, 
      signerAccount,
      listOfNodes, 
      prefundedAccounts, 
      autoSigner,
      nbrNetwork
    );
    return result;
  } catch (error) {
    // If Besu network creation fails, clean up the database
    try {
      const networkData = await getNetworkByName(name);
      if (networkData) {
        await deleteNetworkAction(networkData.id);
      }
    } catch (cleanupError) {
      console.error('Failed to cleanup network from database:', cleanupError);
    }
    throw error;
  }
}

export async function removeBesuNetwork(name: string) {
  try {
    // Get network by name first
    const networkData = await getNetworkByName(name);
    if (!networkData) {
      throw new Error(`Network ${name} not found in database`);
    }

    // Delete network from database first
    await deleteNetworkAction(networkData.id);

    // Then remove the actual Besu network
    const result = await besuManager.removeBesuNetwork(name);
    return result;
  } catch (error) {
    console.error('Failed to remove Besu network:', error);
    throw new Error(`Failed to remove network ${name}. The database and Besu network may be in an inconsistent state.`);
  }
}

export async function addBesuNode(networkName: string, nodeName: string, nodeType: string, port: string, ip?: string) {
  try {
    // Get network by name first
    const networkData = await getNetworkByName(networkName);
    if (!networkData) {
      throw new Error(`Network ${networkName} not found in database`);
    }

    // Create node in database first
    await createNodeAction(networkData.id, {
      id: `${networkName}-${nodeName}`,
      networkId: networkData.id,
      name: nodeName,
      type: nodeType as NodeType,
      ip: ip || '',
      port: parseInt(port),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Then create the actual Besu node
    const result = await besuManager.addBesuNode(networkName, nodeName, nodeType, port, ip);
    return result;
  } catch (error) {
    // If Besu node creation fails, remove the node from database
    try {
      const networkData = await getNetworkByName(networkName);
      if (networkData) {
        await deleteNodeAction(networkData.id, nodeName);
      }
    } catch (cleanupError) {
      console.error('Failed to cleanup node from database:', cleanupError);
    }
    throw error;
  }
}

export async function removeBesuNode(networkName: string, nodeName: string) {
  try {
    // Get network by name first
    const networkData = await getNetworkByName(networkName);
    if (!networkData) {
      throw new Error(`Network ${networkName} not found in database`);
    }

    // Delete node from database first
    await deleteNodeAction(networkData.id, nodeName);

    // Then remove the actual Besu node
    const result = await besuManager.removeBesuNode(networkName, nodeName);
    return result;
  } catch (error) {
    console.error('Failed to remove Besu node:', error);
    throw new Error(`Failed to remove node ${nodeName} from network ${networkName}. The database and Besu node may be in an inconsistent state.`);
  }
}

export async function startBesuNetwork(name: string) {
  const result = await besuManager.startBesuNetwork(name);
  return result;
}

export async function stopBesuNetwork(name: string) {
  const result = await besuManager.stopBesuNetwork(name);
  return result;
}

export async function getBesuBalance(networkName: string, address: string) {
  const result = await besuManager.getBesuBalance(networkName, address);
  // Convert BigInt to string if present
  return JSON.parse(JSON.stringify(result, replacerBigInt));
}

// Utility to convert BigInt to string for JSON serialization
function replacerBigInt(key: string, value: any) {
  return typeof value === 'bigint' ? value.toString() : value;
}

export async function getNetworksForLocalStorage() {
  try {
    const networks = await getNetworks();
    return networks.map(network => ({
      id: network.id,
      network: network.name,
      cidr: network.subnet,
      ip: network.ip,
      chainId: network.chainId,
      signerAccount: network.signerAddress,
      autoSigner: network.autoSigner || false, // Default to false if not present
      prefundedAccounts: network.accounts.map(acc => ({
        address: acc.address,
        amount: acc.balance
      })),
      nodes: network.nodes.map(node => ({
        type: node.type.toLowerCase() as 'rpc' | 'miner' | 'node',
        ip: node.ip,
        name: node.name,
        port: node.port
      }))
    }));
  } catch (error) {
    console.error('Error fetching networks:', error);
    return [];
  }
}