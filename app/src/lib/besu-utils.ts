import { BesuNetworkConfig, BesuNodeDefinition, NetworkFormData, BesuNetwork } from '@/types/besu';

/**
 * Convert ETH amount to Wei
 */
export function ethToWei(ethAmount: string): string {
  const eth = parseFloat(ethAmount);
  if (isNaN(eth) || eth < 0) {
    throw new Error('Invalid ETH amount');
  }
  // 1 ETH = 10^18 Wei
  const weiAmount = Math.floor(eth * Math.pow(10, 18));
  return weiAmount.toString();
}

/**
 * Convert Wei to ETH
 */
export function weiToEth(weiAmount: string): string {
  const wei = parseFloat(weiAmount);
  if (isNaN(wei) || wei < 0) {
    return '0';
  }
  // 1 ETH = 10^18 Wei
  const ethAmount = wei / Math.pow(10, 18);
  return ethAmount.toString();
}

/**
 * Generate a unique subnet for the network
 */
export function generateSubnet(networkName: string): string {
  // Simple hash to generate a subnet based on network name
  let hash = 0;
  for (let i = 0; i < networkName.length; i++) {
    const char = networkName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use hash to generate a subnet in the 172.x.0.0/16 range
  const subnet = Math.abs(hash) % 200 + 16; // 172.16.0.0 to 172.215.0.0
  return `172.${subnet}.0.0/16`;
}

/**
 * Generate IP addresses for nodes based on subnet
 */
export function generateNodeIPs(subnet: string, nodeCount: number): string[] {
  const baseIP = subnet.split('/')[0].split('.').slice(0, 2).join('.');
  const ips: string[] = [];
  
  for (let i = 0; i < nodeCount; i++) {
    ips.push(`${baseIP}.0.${10 + i}`);
  }
  
  return ips;
}

/**
 * Validate RPC port ranges and avoid conflicts
 */
export function validateRPCPorts(nodes: BesuNodeDefinition[]): string[] {
  const errors: string[] = [];
  const usedPorts = new Set<number>();
  const usedIPs = new Set<string>();
  
  if (!nodes || nodes.length === 0) {
    return errors;
  }
  
  nodes.forEach((node) => {
    if (!node || typeof node.rpcPort !== 'number') {
      return; // Skip invalid nodes
    }
    
    // Validate RPC ports
    if (usedPorts.has(node.rpcPort)) {
      errors.push(`Node ${node.name || 'unknown'}: Port ${node.rpcPort} is already in use`);
    }
    
    if (node.rpcPort < 8545 || node.rpcPort > 9999) {
      errors.push(`Node ${node.name || 'unknown'}: Port ${node.rpcPort} should be between 8545-9999`);
    }
    
    usedPorts.add(node.rpcPort);
    
    // Validate IPs if provided
    if (node.ip && node.ip.trim() !== '') {
      if (usedIPs.has(node.ip)) {
        errors.push(`Node ${node.name || 'unknown'}: IP ${node.ip} is already in use`);
      }
      usedIPs.add(node.ip);
    }
  });
  
  return errors;
}

/**
 * Convert form data to Besu network configuration
 */
export function formDataToBesuConfig(formData: NetworkFormData): {
  config: BesuNetworkConfig;
  nodes: BesuNodeDefinition[];
} {
  // Convert ETH amounts to Wei
  const signerAccounts = formData.signerAccounts.map(account => ({
    address: account.address,
    weiAmount: ethToWei(account.ethAmount)
  }));

  // Generate subnet if not provided
  const subnet = formData.subnet || generateSubnet(formData.name);
  
  // Create node definitions with provided IPs or generate them
  const nodes: BesuNodeDefinition[] = formData.nodes.map((node, index) => {
    // Use the provided IP if available and within subnet, otherwise generate one
    let ip = node.ip;
    if (!ip || !isIpInSubnet(ip, subnet)) {
      ip = generateNodeIPs(subnet, formData.nodes.length)[index];
    }
    
    return {
      name: node.name,
      ip: ip,
      rpcPort: node.rpcPort,
      p2pPort: node.p2pPort,
      type: node.type
    };
  });

  const config: BesuNetworkConfig = {
    name: formData.name,
    chainId: formData.chainId,
    subnet,
    consensus: formData.consensus,
    gasLimit: formData.gasLimit,
    blockTime: formData.blockTime,
    signerAccounts
  };

  return { config, nodes };
}

/**
 * Convert Besu config back to form data
 */
export function besuConfigToFormData(
  config: BesuNetworkConfig,
  nodes: BesuNodeDefinition[]
): NetworkFormData {
  return {
    name: config.name,
    chainId: config.chainId,
    consensus: config.consensus,
    gasLimit: config.gasLimit,
    blockTime: config.blockTime,
    subnet: config.subnet,
    signerAccounts: config.signerAccounts.map(account => ({
      address: account.address,
      ethAmount: weiToEth(account.weiAmount)
    })),
    nodes: nodes.map(node => ({
      name: node.name,
      type: node.type,
      rpcPort: node.rpcPort,
      p2pPort: node.p2pPort || 30303, // Default value if not provided
      ip: node.ip
    }))
  };
}

/**
 * Check if an IP address is within a subnet (CIDR range)
 */
export function isIpInSubnet(ip: string, subnet: string): boolean {
  try {
    // Parse IP address
    const ipParts = ip.split('.').map(part => parseInt(part, 10));
    
    // Parse subnet
    const [subnetIp, mask] = subnet.split('/');
    const subnetParts = subnetIp.split('.').map(part => parseInt(part, 10));
    const subnetMask = parseInt(mask, 10);
    
    // Validate inputs
    if (
      ipParts.length !== 4 ||
      subnetParts.length !== 4 ||
      ipParts.some(part => part < 0 || part > 255) ||
      subnetParts.some(part => part < 0 || part > 255) ||
      subnetMask < 0 || subnetMask > 32
    ) {
      return false;
    }
    
    // Convert IP addresses to binary (32 bit integers)
    const ipInt = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
    const subnetInt = (subnetParts[0] << 24) | (subnetParts[1] << 16) | (subnetParts[2] << 8) | subnetParts[3];
    
    // Create mask
    const mask32 = ~((1 << (32 - subnetMask)) - 1);
    
    // Check if IP is in subnet
    return (ipInt & mask32) === (subnetInt & mask32);
  } catch (error) {
    console.error('Error checking if IP is in subnet:', error);
    return false;
  }
}

/**
 * Validate network configuration
 */
export function validateNetworkConfig(
  formData: NetworkFormData, 
  existingNetworks: BesuNetwork[] = [], 
  currentNetworkId?: string
): string[] {
  const errors: string[] = [];

  // Basic validation
  if (!formData.name || formData.name.trim() === '') {
    errors.push('Network name is required');
  }
  
  if (!formData.chainId || formData.chainId <= 0) {
    errors.push('Chain ID must be a positive number');
  }

  if (!formData.subnet || !formData.subnet.match(/^\d+\.\d+\.\d+\.\d+\/\d+$/)) {
    errors.push('Subnet must be in CIDR format (e.g., 10.0.0.0/24)');
  }

  // Node validation
  if (!formData.nodes || formData.nodes.length === 0) {
    errors.push('At least one node is required');
  } else {
    formData.nodes.forEach((node, index) => {
      if (!node.name || node.name.trim() === '') {
        errors.push(`Node ${index + 1} name is required`);
      }
      if (!node.type || !['bootnode', 'miner', 'rpc'].includes(node.type)) {
        errors.push(`Node ${index + 1} must be a valid type (bootnode, miner, rpc)`);
      }
      if (!node.ip || !node.ip.match(/^\d+\.\d+\.\d+\.\d+$/)) {
        errors.push(`Node ${index + 1} must have a valid IP address`);
      } else if (formData.subnet && !isIpInSubnet(node.ip, formData.subnet)) {
        errors.push(`Node ${index + 1} IP (${node.ip}) must be within the subnet range (${formData.subnet})`);
      }
    });
  }

  // Check for duplicates across existing networks (excluding the current network being edited)
  existingNetworks.forEach(network => {
    // Skip the current network being edited
    if (currentNetworkId && network.id === currentNetworkId) {
      return;
    }

    // Check for duplicate name
    if (network.config.name === formData.name) {
      errors.push(`Network name '${formData.name}' already exists`);
    }

    // Check for duplicate chain ID
    if (network.config.chainId === formData.chainId) {
      errors.push(`Chain ID ${formData.chainId} is already in use by network '${network.config.name}'`);
    }

    // Check for duplicate subnet
    if (network.config.subnet === formData.subnet) {
      errors.push(`Subnet ${formData.subnet} is already in use by network '${network.config.name}'`);
    }
  });

  return errors;
}
