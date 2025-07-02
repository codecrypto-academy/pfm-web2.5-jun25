import Docker from 'dockerode';
import { BesuNetworkConfig, NetworkInfo } from './types.js';
import { 
  DEFAULT_NETWORK_CONFIG,
  DEFAULT_PORTS,
  IP_POOL_CONFIG,
  DOCKER_ERROR_SUGGESTIONS,
  SUGGESTIONS_CONFIG,
  NAMING_PATTERNS,
  NODE_TYPES
} from './constants.js';

/**
 * Utility functions for NetworkManager
 */
export class NetworkManagerHelper {
  
  /**
   * Check if two subnets overlap
   */
  static subnetsOverlap(subnet1: string, subnet2: string): boolean {
    try {
      const [ip1, cidr1] = subnet1.split('/');
      const [ip2, cidr2] = subnet2.split('/');
      
      if (!ip1 || !ip2 || !cidr1 || !cidr2) return false;
      
      // Convert IP addresses to numbers for comparison
      const ipToNum = (ip: string): number => {
        return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
      };
      
      const ip1Num = ipToNum(ip1);
      const ip2Num = ipToNum(ip2);
      
      const cidr1Num = parseInt(cidr1);
      const cidr2Num = parseInt(cidr2);
      
      // Calculate network addresses (zero out host bits)
      const mask1 = ((0xFFFFFFFF << (32 - cidr1Num)) >>> 0);
      const mask2 = ((0xFFFFFFFF << (32 - cidr2Num)) >>> 0);
      
      const network1 = (ip1Num & mask1) >>> 0;
      const network2 = (ip2Num & mask2) >>> 0;
      
      // Check if networks overlap
      const smallerMask = Math.max(cidr1Num, cidr2Num);
      const overlapMask = ((0xFFFFFFFF << (32 - smallerMask)) >>> 0);
      
      return ((network1 & overlapMask) >>> 0) === ((network2 & overlapMask) >>> 0);
      
    } catch (error) {
      // If we can't parse the subnets, assume they might overlap to be safe
      console.warn(`Failed to parse subnets for overlap check: ${subnet1}, ${subnet2}`, error);
      return true;
    }
  }

  /**
   * Get all port ranges that a network configuration would use
   */
  static getNetworkPortRanges(config: BesuNetworkConfig): Array<{start: number, end: number, type: string}> {
    const portRanges: Array<{start: number, end: number, type: string}> = [];
    
    // Add bootnode ports (always created)
    portRanges.push(
      { start: DEFAULT_PORTS.RPC_PORT, end: DEFAULT_PORTS.RPC_PORT, type: 'bootnode-rpc' },
      { start: DEFAULT_PORTS.P2P_PORT, end: DEFAULT_PORTS.P2P_PORT, type: 'bootnode-p2p' }
    );
    
    // Add ports from configured nodes
    for (const nodeConfig of config.nodes || []) {
      const rpcPort = nodeConfig.rpcPort || DEFAULT_PORTS.RPC_PORT;
      const p2pPort = nodeConfig.p2pPort || DEFAULT_PORTS.P2P_PORT;
      
      portRanges.push(
        { start: rpcPort, end: rpcPort, type: `${nodeConfig.id}-rpc` },
        { start: p2pPort, end: p2pPort, type: `${nodeConfig.id}-p2p` }
      );
    }
    
    return portRanges;
  }

  /**
   * Check if two port ranges overlap
   */
  static portRangesOverlap(range1: {start: number, end: number}, range2: {start: number, end: number}): boolean {
    return Math.max(range1.start, range2.start) <= Math.min(range1.end, range2.end);
  }

  /**
   * Generate IP pool from subnet
   */
  static generateIpPool(subnet: string): Set<string> {
    const ipPool = new Set<string>();
    const [baseIp, cidr] = subnet.split('/');
    
    if (!baseIp || !cidr) {
      throw new Error(`Invalid subnet format: ${subnet}`);
    }
    
    const [a, b, c] = baseIp.split('.').map(Number);
    
    // Generate available IPs in the subnet (simple implementation)
    // For /24 subnet, generate IPs from .2 to .254 (excluding .1 for gateway)
    if (cidr === '24') {
      for (let i = IP_POOL_CONFIG.CIDR_24_START; i <= IP_POOL_CONFIG.CIDR_24_END; i++) {
        ipPool.add(`${a}.${b}.${c}.${i}`);
      }
    }
    
    return ipPool;
  }

  /**
   * Allocate an IP from the pool
   */
  static allocateIp(ipPool: Set<string>, networkId: string): string {
    if (!ipPool || ipPool.size === 0) {
      throw new Error(`No available IPs in network ${networkId}`);
    }

    const iterator = ipPool.values();
    const result = iterator.next();
    
    if (result.done || !result.value) {
      throw new Error(`No available IPs in network ${networkId}`);
    }
    
    const ip = result.value;
    ipPool.delete(ip);
    return ip;
  }

  /**
   * Free an IP back to the pool
   */
  static freeIp(ipPool: Set<string>, ip: string): void {
    if (ipPool) {
      ipPool.add(ip);
    }
  }

  /**
   * Get helpful suggestions based on Docker error
   */
  static getDockerErrorSuggestions(errorCode: string): string[] {
    const suggestions = DOCKER_ERROR_SUGGESTIONS[errorCode as keyof typeof DOCKER_ERROR_SUGGESTIONS] || 
                       DOCKER_ERROR_SUGGESTIONS.DEFAULT;
    return [...suggestions];
  }

  /**
   * Wait for Docker to clean up internal state
   */
  static async waitForDockerCleanup(seconds: number = 2): Promise<void> {
    console.info(`Waiting ${seconds} seconds for Docker cleanup...`);
    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }

  /**
   * Check if a Docker image exists locally
   */
  static async imageExists(docker: Docker, imageName: string): Promise<boolean> {
    try {
      await docker.getImage(imageName).inspect();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Pull a Docker image
   */
  static async pullImage(docker: Docker, imageName: string): Promise<void> {
    console.info(`Pulling Docker image: ${imageName}...`);
    
    return new Promise((resolve, reject) => {
      docker.pull(imageName, (err: any, stream: any) => {
        if (err) {
          reject(new Error(`Failed to pull image ${imageName}: ${err.message}`));
          return;
        }

        docker.modem.followProgress(stream, (err: any) => {
          if (err) {
            reject(new Error(`Failed to pull image ${imageName}: ${err.message}`));
          } else {
            console.info(`Successfully pulled image: ${imageName}`);
            resolve();
          }
        });
      });
    });
  }

  /**
   * Ensure a Docker image exists, pull it if necessary
   */
  static async ensureImageExists(docker: Docker, imageName: string): Promise<void> {
    const exists = await NetworkManagerHelper.imageExists(docker, imageName);
    
    if (!exists) {
      console.info(`Image ${imageName} not found locally, pulling...`);
      await NetworkManagerHelper.pullImage(docker, imageName);
    } else {
      console.info(`Image ${imageName} found locally`);
    }
  }

  /**
   * Get suggestions for resolving network conflicts
   */
  static getSuggestedAlternatives(
    config: BesuNetworkConfig, 
    existingNetworks: NetworkInfo[]
  ): {
    chainIds: number[];
    subnets: string[];
    names: string[];
    ports: { rpc: number[]; p2p: number[] };
  } {
    const usedChainIds = new Set(existingNetworks.map(n => n.config.chainId));
    const usedNames = new Set(existingNetworks.map(n => n.config.name).filter(Boolean));
    const usedSubnets = new Set(existingNetworks.map(n => n.config.subnet).filter(Boolean));
    
    // Suggest alternative chain IDs
    const suggestedChainIds: number[] = [];
    for (let i = SUGGESTIONS_CONFIG.CHAIN_ID_START; i < SUGGESTIONS_CONFIG.CHAIN_ID_END; i++) {
      if (!usedChainIds.has(i) && suggestedChainIds.length < SUGGESTIONS_CONFIG.MAX_SUGGESTIONS) {
        suggestedChainIds.push(i);
      }
    }
    
    // Suggest alternative subnets
    const suggestedSubnets: string[] = [];
    for (const subnet of SUGGESTIONS_CONFIG.ALTERNATIVE_SUBNETS) {
      const hasOverlap = Array.from(usedSubnets).some(used => 
        used && NetworkManagerHelper.subnetsOverlap(used, subnet)
      );
      if (!hasOverlap) {
        suggestedSubnets.push(subnet);
      }
    }
    
    // Suggest alternative names
    const suggestedNames: string[] = [];
    const baseNames = NAMING_PATTERNS.ALTERNATIVE_NAMES(config.networkId);
    for (const name of baseNames) {
      if (!usedNames.has(name)) {
        suggestedNames.push(name);
      }
    }
    
    // Suggest alternative ports
    const usedPorts = new Set<number>();
    for (const network of existingNetworks) {
      NetworkManagerHelper.getNetworkPortRanges(network.config).forEach(range => {
        for (let port = range.start; port <= range.end; port++) {
          usedPorts.add(port);
        }
      });
    }
    
    const suggestedRpcPorts: number[] = [];
    const suggestedP2pPorts: number[] = [];
    
    // Suggest RPC ports starting from configured start
    for (let port = SUGGESTIONS_CONFIG.RPC_PORT_START; port < SUGGESTIONS_CONFIG.RPC_PORT_END && suggestedRpcPorts.length < SUGGESTIONS_CONFIG.MAX_SUGGESTIONS; port++) {
      if (!usedPorts.has(port)) {
        suggestedRpcPorts.push(port);
      }
    }
    
    // Suggest P2P ports starting from configured start
    for (let port = SUGGESTIONS_CONFIG.P2P_PORT_START; port < SUGGESTIONS_CONFIG.P2P_PORT_END && suggestedP2pPorts.length < SUGGESTIONS_CONFIG.MAX_SUGGESTIONS; port++) {
      if (!usedPorts.has(port)) {
        suggestedP2pPorts.push(port);
      }
    }
    
    return {
      chainIds: suggestedChainIds,
      subnets: suggestedSubnets,
      names: suggestedNames,
      ports: {
        rpc: suggestedRpcPorts,
        p2p: suggestedP2pPorts
      }
    };
  }

  /**
   * Apply default values only for missing configuration parameters
   */
  static applyConfigDefaults(config: BesuNetworkConfig): Required<BesuNetworkConfig> {
    const subnet = config.subnet ?? DEFAULT_NETWORK_CONFIG.SUBNET;
    // Generate default gateway from subnet (first IP)
    const [baseIp] = subnet.split('/');
    const defaultGateway = baseIp ? `${baseIp.split('.').slice(0, 3).join('.')}${DEFAULT_NETWORK_CONFIG.GATEWAY_SUFFIX}` : '172.20.0.1';
    
    return {
      ...config,
      // Only apply defaults if user didn't provide these values
      chainId: config.chainId ?? DEFAULT_NETWORK_CONFIG.CHAIN_ID,
      besuVersion: config.besuVersion ?? DEFAULT_NETWORK_CONFIG.BESU_VERSION,
      name: config.name ?? NAMING_PATTERNS.NETWORK_NAME(config.networkId).replace('besu-', ''),
      subnet,
      gateway: config.gateway ?? defaultGateway,
      genesis: config.genesis ?? {},
      env: config.env ?? {},
      nodes: config.nodes ?? []
    };
  }

  /**
   * Create bootnode configuration
   */
  static createBootnodeConfig(config: BesuNetworkConfig): import('./types.js').BesuNodeConfig {
    return {
      id: NAMING_PATTERNS.BOOTNODE_ID(config.networkId),
      type: NODE_TYPES.BOOTNODE as any,
      rpcPort: DEFAULT_PORTS.RPC_PORT,
      p2pPort: DEFAULT_PORTS.P2P_PORT,
      mining: false
    };
  }
}
