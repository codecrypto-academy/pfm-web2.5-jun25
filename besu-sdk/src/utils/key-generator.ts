/**
 * Cryptographic key generation utilities for Besu nodes
 * 
 * This module handles the creation of Ethereum addresses and key pairs
 * required for node identity and validator operations in the Besu network.
 * Uses ethers.js for secure, standards-compliant key generation.
 */

import { ethers } from 'ethers';
import { NodeIdentity } from '../types';
import { logger } from './logger';
import { 
  KeyGenerationError, 
  InvalidPrivateKeyError, 
  InvalidNodeIdentityError, 
  InvalidEnodeUrlError, 
  ConfigurationValidationError 
} from '../errors';

/**
 * Generate a new node identity with Ethereum address and key pair
 * 
 * Creates a cryptographically secure identity for a Besu node, consisting
 * of an Ethereum address and the corresponding public/private key pair.
 * These credentials are used for node identification and block signing
 * in Clique consensus.
 * 
 * @returns Promise resolving to complete node identity information
 */
export async function generateNodeIdentity(): Promise<NodeIdentity> {
  try {
    logger.debug('Generating new node identity...');
    
    // Create a new random wallet using ethers.js
    // This uses cryptographically secure random number generation
    const wallet = ethers.Wallet.createRandom();
    
    // Extract identity components
    const identity: NodeIdentity = {
      address: wallet.address.toLowerCase(), // Lowercase for consistency
      publicKey: wallet.signingKey.publicKey,
      privateKey: wallet.privateKey
    };
    
    logger.debug(`Generated node identity with address: ${identity.address}`);
    
    return identity;
  } catch (error) {
    logger.error('Failed to generate node identity', error);
    throw new KeyGenerationError('Failed to generate a new node identity', error as Error);
  }
}

/**
 * Generate multiple node identities in batch
 * 
 * Efficiently creates multiple identities for initial network setup
 * or testing scenarios where many nodes are needed.
 * 
 * @param count Number of identities to generate
 * @returns Promise resolving to array of node identities
 */
export async function generateMultipleIdentities(count: number): Promise<NodeIdentity[]> {
  if (count <= 0 || !Number.isInteger(count)) {
    throw new ConfigurationValidationError('count', 'Must be a positive integer', count);
  }
  
  logger.debug(`Generating ${count} node identities...`);
  
  try {
    // Generate identities in parallel for better performance
    const identityPromises = Array.from({ length: count }, () => generateNodeIdentity());
    const identities = await Promise.all(identityPromises);
    
    logger.debug(`Successfully generated ${count} node identities`);
    return identities;
  } catch (error) {
    logger.error(`Failed to generate ${count} identities`, error);
    throw new KeyGenerationError('Failed to generate multiple identities', error as Error);
  }
}

/**
 * Derive Ethereum address from a private key
 * 
 * Useful for reconstructing node identity from stored private keys
 * or validating key pairs during network recovery operations.
 * 
 * When is this functions useful?
 * - Use a known private key to recover the same validator identity (same Ethereum address).
 * - Confirm that a private key maps to the expected address before launching the node.
 * - Generate private keys programmatically and derive addresses to include in scripted setups.
 * 
 * @param privateKey Private key in hex format (with or without 0x prefix)
 * @returns Ethereum address derived from the private key
 */
export function deriveAddressFromPrivateKey(privateKey: string): string {
  try {
    // Ensure private key has 0x prefix
    const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    
    // Create wallet from private key
    const wallet = new ethers.Wallet(formattedKey);
    
    return wallet.address.toLowerCase();
  } catch (error) {
    throw new InvalidPrivateKeyError('The provided private key is invalid or malformed', error as Error);
  }
}

/**
 * Validate a node identity object
 * 
 * Ensures that a NodeIdentity contains valid Ethereum address and keys,
 * and that they correspond to each other correctly.
 * 
 * @param identity Node identity to validate
 * @returns True if valid, throws error if invalid
 */
export function validateNodeIdentity(identity: NodeIdentity): boolean {
  try {
    // Validate address format
    if (!ethers.isAddress(identity.address)) {
      throw new InvalidNodeIdentityError('Invalid Ethereum address format');
    }
    
    // Validate that private key derives to the same address
    const derivedAddress = deriveAddressFromPrivateKey(identity.privateKey);
    if (derivedAddress.toLowerCase() !== identity.address.toLowerCase()) {
      throw new InvalidNodeIdentityError('Private key does not match the provided address');
    }
    
    // Create wallet to validate public key
    const wallet = new ethers.Wallet(identity.privateKey);
    if (wallet.signingKey.publicKey !== identity.publicKey) {
      throw new InvalidNodeIdentityError('Public key does not match the private key');
    }
    
    return true;
  } catch (error) {
    // Re-throw InvalidNodeIdentityError as is, wrap others
    if (error instanceof InvalidNodeIdentityError) {
      throw error;
    }
    throw new InvalidNodeIdentityError(`Identity validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Format private key for Besu node consumption
 * 
 * Besu expects private keys without the 0x prefix in its key files.
 * This function ensures proper formatting for file storage.
 * 
 * @param privateKey Private key with or without 0x prefix
 * @returns Private key without 0x prefix
 */
export function formatPrivateKeyForBesu(privateKey: string): string {
  return privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
}

/**
 * Generate a deterministic node identity from a seed
 * 
 * Creates reproducible identities for testing or recovery scenarios.
 * WARNING: Only use this for testing! Production nodes should always
 * use truly random keys from generateNodeIdentity().
 * 
 * @param seed Seed phrase or string for deterministic generation
 * @returns Node identity derived from the seed
 */
export async function generateDeterministicIdentity(seed: string): Promise<NodeIdentity> {
  logger.warn('Generating deterministic identity - DO NOT use in production!');
  
  try {
    // Create a deterministic wallet from seed phrase
    const seedBytes = ethers.toUtf8Bytes(seed);
    const mnemonic = ethers.Mnemonic.entropyToPhrase(ethers.keccak256(seedBytes));
    const wallet = ethers.Wallet.fromPhrase(mnemonic);
    
    const identity: NodeIdentity = {
      address: wallet.address.toLowerCase(),
      publicKey: wallet.signingKey.publicKey,
      privateKey: wallet.privateKey
    };
    
    logger.debug(`Generated deterministic identity with address: ${identity.address}`);
    
    return identity;
  } catch (error) {
    logger.error('Failed to generate deterministic identity', error);
    throw new KeyGenerationError('Failed to generate deterministic identity from seed', error as Error);
  }
}

/**
 * Extract node address from enode URL
 * 
 * Besu nodes identify themselves with enode URLs that contain their
 * public key. This function extracts the Ethereum address from such URLs.
 * 
 * @param enodeUrl Enode URL (e.g., enode://pubkey@ip:port)
 * @returns Ethereum address derived from the enode public key
 */
export function addressFromEnode(enodeUrl: string): string {
  try {
    // Extract public key from enode URL
    const match = enodeUrl.match(/^enode:\/\/([0-9a-fA-F]{128})@/);
    if (!match) {
      throw new InvalidEnodeUrlError('The provided string is not a valid enode URL');
    }
    
    const publicKey = `0x${match[1]}`;
    
    // Derive address from public key
    const address = ethers.computeAddress(publicKey);
    
    return address.toLowerCase();
  } catch (error) {
    // Re-throw InvalidEnodeUrlError as is, wrap others
    if (error instanceof InvalidEnodeUrlError) {
      throw error;
    }
    throw new InvalidEnodeUrlError(`Failed to extract address from enode: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}