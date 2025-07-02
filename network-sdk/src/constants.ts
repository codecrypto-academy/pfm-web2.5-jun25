/**
 * Constants and default configuration values for the Besu Network Manager
 */

// Default network configuration
export const DEFAULT_NETWORK_CONFIG = {
  CHAIN_ID: 1337,
  BESU_VERSION: 'latest',
  SUBNET: '172.20.0.0/24',
  GATEWAY_SUFFIX: '.1', // Appended to the subnet base to create default gateway
} as const;

// Default port configuration
export const DEFAULT_PORTS = {
  RPC_PORT: 8545,
  P2P_PORT: 30303,
} as const;

// Docker configuration
export const DOCKER_CONFIG = {
  NETWORK_PREFIX: 'besu-',
  DRIVER: 'bridge',
  CLEANUP_WAIT_SECONDS: 2,
} as const;

// Docker labels for network and containers
export const DOCKER_LABELS = {
  NETWORK_ID: 'besu.network.id',
  NETWORK_TYPE: 'besu.network.type',
  NETWORK_CHAIN_ID: 'besu.network.chainId',
  NETWORK_SUBNET: 'besu.network.subnet',
  NETWORK_NAME: 'besu.network.name',
  BESU_VERSION: 'besu.version',
  NODE_ID: 'besu.node.id',
  NODE_TYPE: 'besu.node.type',
} as const;

// Environment variable names for configuration extraction
export const ENV_VARS = {
  CHAIN_ID: 'CHAIN_ID',
  NETWORK_ID: 'NETWORK_ID',
} as const;

// Besu command line arguments for configuration extraction
export const BESU_CLI_ARGS = {
  NETWORK_ID: '--network-id',
  CHAIN_ID: '--chain-id',
} as const;

// Docker image configuration
export const DOCKER_IMAGES = {
  BESU_REPOSITORY: 'hyperledger/besu',
  DEFAULT_TAG: 'latest',
} as const;

// IP Pool configuration
export const IP_POOL_CONFIG = {
  CIDR_24_START: 2,    // First usable IP in /24 subnet (excluding gateway at .1)
  CIDR_24_END: 254,    // Last usable IP in /24 subnet
  DEFAULT_IP: '172.20.0.2', // Fallback IP for discovery
} as const;

// Node type configurations
export const NODE_TYPES = {
  BOOTNODE: 'bootnode',
  MINER: 'miner',
  RPC: 'rpc',
  VALIDATOR: 'validator',
} as const;

// Network status values
export const NETWORK_STATUS = {
  CREATING: 'creating',
  RUNNING: 'running',
  STOPPED: 'stopped',
  DELETING: 'deleting',
  ERROR: 'error',
} as const;

// Node status values
export const NODE_STATUS = {
  CREATING: 'creating',
  RUNNING: 'running',
  STOPPED: 'stopped',
  ERROR: 'error',
} as const;

// Discovery configuration
export const DISCOVERY_CONFIG = {
  NETWORK_FILTER_PREFIX: 'besu-',
  DEFAULT_IP: '172.20.0.2', // Fallback IP for discovery
  PLACEHOLDER_ADDRESS: '0x' + '0'.repeat(40),
  PLACEHOLDER_PRIVATE_KEY: '0x' + '0'.repeat(64),
  PLACEHOLDER_PUBLIC_KEY: '0x' + '0'.repeat(128),
} as const;

// Validation configuration defaults
export const DEFAULT_VALIDATION_OPTIONS = {
  checkChainIdConflicts: true,
  checkSubnetOverlaps: true,
  checkNameConflicts: true,
  checkPortConflicts: true,
  checkDockerNetworkConflicts: true,
  checkBasicFormat: true,
  checkExistingNetworkId: true,
  warningsOnly: false,
  detailedErrors: true,
} as const;

// Suggested alternatives configuration
export const SUGGESTIONS_CONFIG = {
  CHAIN_ID_START: 1337,
  CHAIN_ID_END: 1400,
  MAX_SUGGESTIONS: 5,
  ALTERNATIVE_SUBNETS: [
    '172.21.0.0/24',
    '172.22.0.0/24', 
    '172.23.0.0/24', 
    '192.168.100.0/24', 
    '192.168.101.0/24'
  ],
  RPC_PORT_START: 8546,
  RPC_PORT_END: 8600,
  P2P_PORT_START: 30304,
  P2P_PORT_END: 30400,
} as const;

// Docker error codes and suggestions
export const DOCKER_ERROR_SUGGESTIONS = {
  ENOENT: [
    'Install Docker: https://docs.docker.com/get-docker/',
    'Verify Docker socket path',
    'Check if Docker Desktop is installed'
  ],
  ECONNREFUSED: [
    'Start Docker daemon: sudo systemctl start docker',
    'Start Docker Desktop application',
    'Check Docker service status'
  ],
  EACCES: [
    'Add user to docker group: sudo usermod -aG docker $USER',
    'Run with elevated permissions',
    'Check socket permissions'
  ],
  DEFAULT: ['Check Docker installation and status']
} as const;

// Network naming patterns
export const NAMING_PATTERNS = {
  CONTAINER_PATTERN: (networkId: string, nodeId: string) => `${DOCKER_CONFIG.NETWORK_PREFIX}${networkId}-${nodeId}`,
  NETWORK_NAME: (networkId: string) => `${DOCKER_CONFIG.NETWORK_PREFIX}${networkId}`,
  BOOTNODE_ID: (networkId: string) => `${networkId}-bootnode`,
  ALTERNATIVE_NAMES: (networkId: string) => [
    `${networkId}-dev`,
    `${networkId}-test`,
    `${networkId}-staging`
  ],
} as const;

// Genesis block default configuration
export const GENESIS_DEFAULTS = {
  GAS_LIMIT: '0x1fffffffffffff',
  DIFFICULTY: '0x1',
} as const;
