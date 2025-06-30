'use server';

import { revalidatePath } from 'next/cache';
import { 
  getNetworks, 
  getNetworkById, 
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
import { Network, Node } from './types';
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

export async function createNetworkAction(data: Omit<Network, "id" | "createdAt" | "updatedAt" | "nodes">) {
  const network = await createNetwork(data);
  revalidatePath('/networks');
  return network;
}

export async function updateNetworkAction(id: string, data: Partial<Omit<Network, "id" | "createdAt" | "updatedAt" | "nodes">>) {
  const network = await updateNetwork(id, data);
  revalidatePath(`/networks/${id}`);
  revalidatePath('/networks');
  return network;
}

export async function deleteNetworkAction(id: string) {
  const success = await deleteNetwork(id);
  revalidatePath('/networks');
  return success;
}

// Node actions
export async function fetchNodes(networkId?: string) {
  return getNodes(networkId);
}

export async function fetchNodeById(id: string) {
  return getNodeById(id);
}

export async function createNodeAction(data: Omit<Node, "id" | "createdAt" | "updatedAt">) {
  const node = await createNode(data);
  revalidatePath(`/networks/${data.networkId}`);
  return node;
}

export async function updateNodeAction(id: string, data: Partial<Omit<Node, "id" | "createdAt" | "updatedAt">>) {
  const node = await updateNode(id, data);
  if (node && node.networkId) {
    revalidatePath(`/networks/${node.networkId}`);
  }
  return node;
}

export async function deleteNodeAction(id: string, networkId: string) {
  const success = await deleteNode(id);
  revalidatePath(`/networks/${networkId}`);
  return success;
}

// Besu Network actions
export async function createBesuNetwork(
  name: string,
  chainId: number,
  subnet: string,
  bootnodeIP: string,
  minerIP: string,
  listOfNodes: { nodeType: string; ip: string; name: string; port: number }[],
  prefundedAccounts: { address: string; amount: string }[] = []
) {
  const result = await besuManager.createBesuNetwork(name, chainId, subnet, bootnodeIP, minerIP, listOfNodes, prefundedAccounts);
  return result;
}

export async function removeBesuNetwork(name: string) {
  const result = await besuManager.removeBesuNetwork(name);
  return result;
}

export async function getBesuNetwork(name: string) {
  const result = await besuManager.getBesuNetwork(name);
  return result;
}

export async function addBesuNode(networkName: string, nodeName: string, nodeType: string, port: string, ip?: string) {
  const result = await besuManager.addBesuNode(networkName, nodeName, nodeType, port, ip);
  return result;
}

export async function removeBesuNode(networkName: string, nodeName: string) {
  const result = await besuManager.removeBesuNode(networkName, nodeName);
  return result;
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
  return besuManager.getBesuBalance(networkName, address);
}