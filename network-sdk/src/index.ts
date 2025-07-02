/**
 * Besu Network Manager - TypeScript library for managing Hyperledger Besu networks
 * 
 * This library provides a high-level API for creating, managing, and destroying
 * Hyperledger Besu networks using Docker containers with Clique consensus.
 */

// Import types for internal use
import type { 
  BesuNetworkConfig, 
  BesuNodeConfig, 
  ValidationOptions 
} from './types.js';

// Main classes
export { NetworkManager } from './NetworkManager.js';
export { KeyGenerator } from './KeyGenerator.js';
export { GenesisGenerator } from './GenesisGenerator.js';
export { ConfigGenerator } from './ConfigGenerator.js';

// Helper classes
export { NetworkManagerHelper } from './NetworkManagerHelper.js';
export { ValidationHelper } from './ValidationHelper.js';
export { DockerCleanupHelper } from './DockerCleanupHelper.js';

// Types
export type {
  BesuNetworkConfig,
  BesuNodeConfig,
  NodeCredentials,
  NetworkInfo,
  NodeInfo,
  NetworkStatus,
  BesuNetworkManagerConfig,
  ValidationOptions
} from './types.js';

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
  BESU_VERSION: 'latest',
  DEFAULT_SUBNET: '172.20.0.0/24',
  DEFAULT_CHAIN_ID: 1337,
  DEFAULT_RPC_PORT: 8545,
  DEFAULT_P2P_PORT: 30303,
  CLIQUE_PERIOD: 5,
  CLIQUE_EPOCH: 30000
} as const;

/**
 * Utility functions for creating configurations
 */

/**
 * Create a network configuration with validation
 */
export function createNetworkConfig(
  networkId: string,
  chainId: number,
  options?: Partial<BesuNetworkConfig>
): BesuNetworkConfig {
  return {
    networkId,
    chainId,
    subnet: options?.subnet || '172.20.0.0/24',
    name: options?.name || `besu-${networkId}`,
    besuVersion: options?.besuVersion || 'latest',
    nodes: options?.nodes || [],
    genesis: options?.genesis || {},
    env: options?.env || {},
    ...options
  };
}

/**
 * Create a node configuration
 */
export function createNodeConfig(
  id: string,
  type: 'bootnode' | 'miner' | 'rpc' | 'validator',
  options?: Partial<BesuNodeConfig>
): BesuNodeConfig {
  return {
    id,
    type,
    rpcPort: options?.rpcPort || DEFAULT_CONFIG.DEFAULT_RPC_PORT,
    p2pPort: options?.p2pPort || DEFAULT_CONFIG.DEFAULT_P2P_PORT,
    mining: options?.mining || false,
    env: options?.env || {},
    extraArgs: options?.extraArgs || [],
    ...options
  };
}

/**
 * Create validation options with defaults
 */
export function createValidationOptions(
  options?: Partial<ValidationOptions>
): ValidationOptions {
  return {
    checkChainIdConflicts: true,
    checkSubnetOverlaps: true,
    checkNameConflicts: true,
    checkPortConflicts: true,
    checkDockerNetworkConflicts: true,
    checkBasicFormat: true,
    checkExistingNetworkId: true,
    warningsOnly: false,
    detailedErrors: true,
    ...options
  };
}
