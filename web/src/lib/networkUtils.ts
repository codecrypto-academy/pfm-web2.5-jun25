/**
 * Network utilities for dynamic IP and port allocation
 */

/**
 * Parse a subnet CIDR notation and generate available IPs
 */
export const parseSubnet = (subnet: string): { network: string; mask: number; firstIP: string; lastIP: string } => {
  const [network, maskStr] = subnet.split('/');
  const mask = parseInt(maskStr);
  
  const networkParts = network.split('.').map(Number);
  const hostBits = 32 - mask;
  const hostCount = Math.pow(2, hostBits);
  
  // Calculate first and last usable IP (excluding network and broadcast)
  const firstIPParts = [...networkParts];
  firstIPParts[3] = firstIPParts[3] + 1; // Skip network address
  
  const lastIPParts = [...networkParts];
  lastIPParts[3] = lastIPParts[3] + hostCount - 2; // Skip broadcast address
  
  return {
    network,
    mask,
    firstIP: firstIPParts.join('.'),
    lastIP: lastIPParts.join('.')
  };
};

/**
 * Generate IP addresses for nodes within a subnet
 */
export const generateNodeIPs = (subnet: string, nodeCount: number, startOffset: number = 10): string[] => {
  const { network } = parseSubnet(subnet);
  const networkParts = network.split('.').map(Number);
  
  const ips: string[] = [];
  for (let i = 0; i < nodeCount; i++) {
    const ipParts = [...networkParts];
    ipParts[3] = ipParts[3] + startOffset + i;
    ips.push(ipParts.join('.'));
  }
  
  return ips;
};

/**
 * Find available ports starting from a base port
 */
export const generateNodePorts = (nodeCount: number, baseRpcPort: number = 8545, baseP2pPort: number = 30303): {
  rpcPorts: number[];
  p2pPorts: number[];
} => {
  const rpcPorts: number[] = [];
  const p2pPorts: number[] = [];
  
  for (let i = 0; i < nodeCount; i++) {
    rpcPorts.push(baseRpcPort + i);
    p2pPorts.push(baseP2pPort + i);
  }
  
  return { rpcPorts, p2pPorts };
};

/**
 * Generate node types based on configuration
 */
export const generateNodeTypes = (nodeCount: number, bootnodeCount: number = 1, minerCount?: number): string[] => {
  const types: string[] = [];
  
  // First nodes are bootnodes
  for (let i = 0; i < Math.min(bootnodeCount, nodeCount); i++) {
    types.push('bootnode');
  }
  
  // Remaining nodes are miners or RPC nodes
  const remainingNodes = nodeCount - bootnodeCount;
  const actualMinerCount = minerCount ?? Math.max(1, remainingNodes);
  
  for (let i = 0; i < Math.min(actualMinerCount, remainingNodes); i++) {
    types.push('miner');
  }
  
  // Any remaining nodes are RPC nodes
  for (let i = types.length; i < nodeCount; i++) {
    types.push('rpc');
  }
  
  return types;
};

/**
 * Validate network configuration parameters
 */
export const validateNetworkConfig = (config: {
  networkId: string;
  chainId: number;
  nodeCount: number;
  subnet: string;
  gateway: string;
}): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Validate networkId
  if (!config.networkId || !/^[a-zA-Z0-9-_]+$/.test(config.networkId)) {
    errors.push('networkId must be alphanumeric with hyphens and underscores only');
  }
  
  // Validate chainId
  if (!config.chainId || config.chainId < 1 || config.chainId > 2147483647) {
    errors.push('chainId must be a positive integer less than 2147483647');
  }
  
  // Validate nodeCount
  if (config.nodeCount < 1 || config.nodeCount > 20) {
    errors.push('nodeCount must be between 1 and 20');
  }
  
  // Validate subnet
  if (!isValidSubnet(config.subnet)) {
    errors.push('subnet must be a valid CIDR notation (e.g., 172.20.0.0/24)');
  }
  
  // Validate gateway
  if (!isValidIP(config.gateway)) {
    errors.push('gateway must be a valid IP address');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Calculate the default gateway IP for a given subnet
 */
export const calculateGateway = (subnet: string): string => {
  const [network] = subnet.split('/');
  const networkParts = network.split('.').map(Number);
  
  // Use .1 as the gateway (first usable IP)
  networkParts[3] = 1;
  
  return networkParts.join('.');
};

/**
 * Check if a string is a valid IP address
 */
const isValidIP = (ip: string): boolean => {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  
  return parts.every(part => {
    const num = parseInt(part);
    return !isNaN(num) && num >= 0 && num <= 255;
  });
};

/**
 * Check if a string is a valid subnet in CIDR notation
 */
const isValidSubnet = (subnet: string): boolean => {
  const [ip, maskStr] = subnet.split('/');
  if (!ip || !maskStr) return false;
  
  const mask = parseInt(maskStr);
  if (isNaN(mask) || mask < 0 || mask > 32) return false;
  
  return isValidIP(ip);
};
