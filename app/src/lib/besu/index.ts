/**
 * Besu Network Library Exports
 * 
 * This file re-exports components from the besu-network-lib
 * to make them available throughout our application.
 */

// Using dynamic require since Next.js static analysis might have issues with the import
const besuModule = require('../../../../lib/src/create-besu-networks');

// Re-export the default BesuNetwork class and other needed exports
export const BesuNetwork = besuModule.default;
export const createBesuNetworkWithAutoAssociation = besuModule.createBesuNetworkWithAutoAssociation;

// Type exports that may be needed
export type {
  BesuNodeConfig,
  SignerAccount,
  BesuNetworkConfig,
  KeyPair,
  BesuGenesisConfig,
  BesuNodeDefinition,
  BesuNetworkCreateOptions,
  DockerContainerConfig
} from '../../../../lib/src/create-besu-networks';

export default BesuNetwork;
