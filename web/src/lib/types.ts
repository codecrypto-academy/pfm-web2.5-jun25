/**
 * TypeScript interfaces and types for the Besu Network Manager API
 * Only includes types that are actually used in the codebase
 */

/**
 * API Request/Response types
 */

// Network creation request
export interface CreateNetworkRequest {
  /** Unique network identifier (3-50 chars, alphanumeric, hyphens, underscores) */
  networkId: string;
  /** Blockchain chain ID (1-2147483647) */
  chainId: number;
  /** Number of nodes to create (1-20) */
  nodeCount?: number;
  /** Network subnet in CIDR notation */
  subnet?: string;
  /** Network gateway IP address */
  gateway?: string;
  /** Base RPC port for first node */
  baseRpcPort?: number;
  /** Base P2P port for first node */
  baseP2pPort?: number;
  /** Number of bootnode nodes */
  bootnodeCount?: number;
  /** Number of miner nodes (if not specified, all non-bootnode nodes mine) */
  minerCount?: number;
  /** Custom Besu Docker image */
  besuImage?: string;
  /** Memory limit per container (e.g., '2g', '1024m') */
  memoryLimit?: string;
  /** CPU limit per container (e.g., '1.0', '0.5') */
  cpuLimit?: string;
}

// Network creation response
export interface CreateNetworkResponse {
  success: boolean;
  network: {
    networkId: string;
    chainId: number;
    dockerNetworkId: string;
    subnet: string;
    gateway: string;
    containersCreated: number;
    nodes: Array<{
      id: string;
      type: string;
      ip: string;
      rpcPort: number;
      p2pPort: number;
      address: string;
    }>;
  };
  error?: string;
}

// List networks response  
export interface ListNetworksResponse {
  success: boolean;
  networks: Array<{
    networkId: string;
    chainId: number;
    subnet: string;
    gateway: string;
    nodesCount: number;
    createdAt: string;
    updatedAt: string;
  }>;
  error?: string;
}

// Add node request
export interface AddNodeRequest {
  /** Node type */
  type: 'miner' | 'rpc';
  /** Custom node ID (optional, used if provided) */
  node_id?: string;
  /** Custom IP address (auto-assigned if not specified) */
  ip?: string;
  /** Custom RPC port (auto-assigned if not specified) */
  rpcPort?: number;
  /** Custom P2P port (auto-assigned if not specified) */
  p2pPort?: number;
  /** IP address offset for auto-assignment (default: 10) */
  ipOffset?: number;
  /** Port increment strategy for auto-assignment */
  portStrategy?: 'sequential' | 'random';
  /** Custom node ID prefix */
  nodeIdPrefix?: string;
  /** Memory limit for this node container */
  memoryLimit?: string;
  /** CPU limit for this node container */
  cpuLimit?: string;
  /** Custom labels for the container */
  labels?: Record<string, string>;
  /** Environment variables for the container */
  env?: Record<string, string>;
}

/**
 * Query parameter types
 */
export interface NetworkListQuery {
  /** Number of results to return (default: 10, max: 100) */
  limit?: number;
  /** Number of results to skip */
  offset?: number;
  /** Filter by network status */
  status?: 'running' | 'stopped' | 'partial' | 'error';
  /** Sort by field */
  sortBy?: 'createdAt' | 'updatedAt' | 'networkId' | 'nodesCount';
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
}
