/**
 * Configuration types for Hyperledger Besu networks
 */

export interface BesuNodeConfig {
  /** Node ID - unique identifier */
  id: string;
  /** Node type */
  type: 'bootnode' | 'miner' | 'rpc' | 'validator';
  /** IP address assigned to the node */
  ip?: string;
  /** Container name */
  containerName?: string;
  /** Whether this node is a mining node */
  mining?: boolean;
  /** RPC port (default: 8545) */
  rpcPort?: number;
  /** P2P port (default: 30303) */
  p2pPort?: number;
  /** Node credentials (will be generated if not provided) */
  credentials?: NodeCredentials;
  /** Additional environment variables */
  env?: Record<string, string>;
  /** Additional command line arguments */
  extraArgs?: string[];
}

export interface BesuNetworkConfig {
  /** Unique network identifier */
  networkId: string;
  /** Network name - used as Docker network name and container prefix */
  name?: string;
  /** Docker image tag for Besu (default: 'latest') */
  besuVersion?: string;
  /** Network subnet in CIDR format (default: '172.20.0.0/24') */
  subnet?: string;
  /** Gateway IP (default: first IP in subnet) */
  gateway?: string;
  /** Chain ID for the blockchain (default: 1337) */
  chainId?: number;
  /** Initial nodes configuration */
  nodes?: BesuNodeConfig[];
  /** Genesis configuration overrides */
  genesis?: {
    /** Gas limit (default: 0x1fffffffffffff) */
    gasLimit?: string;
    /** Difficulty (default: 0x1) */
    difficulty?: string;
    /** Additional genesis configuration */
    extraConfig?: Record<string, any>;
  };
  /** Network-wide environment variables */
  env?: Record<string, string>;
}

export interface NodeCredentials {
  /** Private key */
  privateKey: string;
  /** Public key */
  publicKey: string;
  /** Ethereum address */
  address: string;
}

export interface NodeInfo {
  /** Node ID */
  id: string;
  /** Node type */
  type: 'bootnode' | 'miner' | 'rpc' | 'validator';
  /** Container ID */
  containerId: string;
  /** Container name */
  containerName?: string;
  /** Assigned IP address */
  ip: string;
  /** Node credentials */
  credentials: NodeCredentials;
  /** Node configuration */
  config: BesuNodeConfig;
  /** Current status */
  status: 'creating' | 'running' | 'stopped' | 'error';
  /** Creation timestamp */
  createdAt: Date;
}

export interface NetworkInfo {
  /** Network ID */
  networkId: string;
  /** Network configuration */
  config: BesuNetworkConfig;
  /** Docker network ID */
  dockerNetworkId: string;
  /** Map of nodes in the network */
  nodes: Map<string, NodeInfo>;
  /** Generated genesis block */
  genesis: any;
  /** Current network status */
  status: 'creating' | 'running' | 'stopped' | 'deleting' | 'error';
  /** Creation timestamp */
  createdAt: Date;
  /** Network subnet */
  subnet: string;
}

export interface NetworkStatus {
  /** Network ID */
  networkId: string;
  /** Network status */
  status: string;
  /** Number of nodes */
  nodeCount: number;
  /** Status of individual nodes */
  nodeStatuses: Map<string, string>;
  /** Network uptime in milliseconds */
  uptime: number;
}

export interface BesuNetworkManagerConfig {
  /** Docker socket path (default: '/var/run/docker.sock') */
  dockerSocket?: string;
  /** Default Besu version to use */
  defaultBesuVersion?: string;
  /** Default subnet for networks */
  defaultSubnet?: string;
  /** Base directory for storing network data */
  dataDir?: string;
  /** Validation configuration options */
  validation?: ValidationOptions;
}

export interface ValidationOptions {
  /** Enable/disable chain ID conflict checking (default: true) */
  checkChainIdConflicts?: boolean;
  /** Enable/disable subnet overlap checking (default: true) */
  checkSubnetOverlaps?: boolean;
  /** Enable/disable network name conflict checking (default: true) */
  checkNameConflicts?: boolean;
  /** Enable/disable port conflict checking (default: true) */
  checkPortConflicts?: boolean;
  /** Enable/disable Docker network name conflict checking (default: true) */
  checkDockerNetworkConflicts?: boolean;
  /** Enable/disable basic format validation (default: true) */
  checkBasicFormat?: boolean;
  /** Enable/disable existing network ID checking (default: true) */
  checkExistingNetworkId?: boolean;
  /** Custom validation function that can be injected by advanced users */
  customValidator?: (config: BesuNetworkConfig, existingNetworks: NetworkInfo[]) => Promise<void> | void;
  /** When true, validation errors become warnings in console instead of throwing (default: false) */
  warningsOnly?: boolean;
  /** When true, provides detailed conflict information in error messages (default: true) */
  detailedErrors?: boolean;
}
