/**
 * Configuration constants for the Besu Network Manager API
 * Only includes constants that are actually used in the codebase
 */

/**
 * Network configuration defaults
 */
export const NETWORK_DEFAULTS = {
  /** Default number of nodes in a new network */
  NODE_COUNT: 2,
  
  /** Default network subnet (CIDR notation) */
  SUBNET: '172.20.0.0/24',
  
  /** Default network gateway */
  GATEWAY: '172.20.0.1',
  
  /** Default number of bootnode nodes */
  BOOTNODE_COUNT: 1,
  
  /** IP address offset for nodes within subnet */
  NODE_IP_START_OFFSET: 10,
  
  /** Maximum number of nodes allowed per network */
  MAX_NODES_PER_NETWORK: 20,
  
  /** Maximum number of networks allowed */
  MAX_NETWORKS: 50
} as const;

/**
 * Port configuration defaults
 */
export const PORT_DEFAULTS = {
  /** Base RPC port for first node */
  BASE_RPC_PORT: 8545,
  
  /** Base P2P port for first node */
  BASE_P2P_PORT: 30303,
  
  /** Port range limits */
  MIN_PORT: 1024,
  MAX_PORT: 65535,
  
  /** Reserved port ranges to avoid */
  RESERVED_PORTS: [
    // Common system ports
    { start: 1, end: 1023 },
    // Common application ports
    { start: 3000, end: 3010 }, // Development servers
    { start: 5432, end: 5432 }, // PostgreSQL
    { start: 3306, end: 3306 }, // MySQL
    { start: 6379, end: 6379 }, // Redis
    { start: 27017, end: 27017 }, // MongoDB
  ]
} as const;

/**
 * Docker configuration
 */
export const DOCKER_DEFAULTS = {
  /** Default Docker image for Besu nodes */
  BESU_IMAGE: 'hyperledger/besu:latest',
  
  /** Docker network driver */
  NETWORK_DRIVER: 'bridge',
  
  /** Default Docker socket path */
  SOCKET_PATH: '/var/run/docker.sock',
  
  /** Container resource limits */
  MEMORY_LIMIT: '2g',
  CPU_LIMIT: '1.0',
  
  /** Container labels */
  LABELS: {
    PROJECT: 'besu-network-manager',
    VERSION: '1.0.0'
  }
} as const;

/**
 * Helper function to get Besu Docker image from environment
 */
export const getBesuImage = (): string => {
  return process.env.BESU_IMAGE || DOCKER_DEFAULTS.BESU_IMAGE;
};

/**
 * Node ID generation patterns
 */
export const NODE_ID_GENERATION = {
  /** Pattern for network creation nodes */
  NETWORK_PATTERN: (index: number, prefix?: string) => `${prefix || 'node'}-${index}`,
  
  /** Pattern for dynamically added nodes */
  DYNAMIC_PATTERN: (prefix?: string) => `${prefix || 'node'}-${Date.now()}`,
  
  /** Custom pattern generator */
  CUSTOM_PATTERN: (prefix: string, suffix: string | number) => `${prefix}-${suffix}`
} as const;

/**
 * File naming conventions
 */
export const FILE_NAMING = {
  /** Node file names */
  NODE_FILES: {
    PRIVATE_KEY: 'key',
    ADDRESS: 'address', 
    ENODE: 'enode'
  },
  
  /** Network file names */
  NETWORK_FILES: {
    GENESIS: 'genesis.json',
    METADATA: 'network.json',
    CONFIG: 'config.toml'
  }
} as const;
