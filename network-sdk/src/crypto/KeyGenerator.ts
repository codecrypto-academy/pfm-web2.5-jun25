import pkg from 'elliptic';
const { ec: EC } = pkg;
import keccak256 from 'keccak256';
import { promises as fs } from 'fs';
import { join } from 'path';
import type { CryptoKeys, KeysWithEnode } from '../types/crypto.js';

// Create EC instance once and reuse (optimization)
const ec = new EC('secp256k1');

/**
 * Key Generator for cryptographic operations
 * Modern TypeScript implementation with ES6+ features
 */
export class KeyGenerator {
  
  /**
   * Generates cryptographic keys and address
   */
  static generateKeys(): CryptoKeys {
    // Generate key pair using secp256k1 (used by Ethereum and Besu)
    const keyPair = ec.genKeyPair();
    
    // Get private and public keys in hex format
    const privateKey = keyPair.getPrivate('hex');
    const publicKey = keyPair.getPublic('hex');

    // Generate Ethereum address from public key
    // Remove '04' prefix from uncompressed public key, hash with Keccak256, take last 20 bytes
    const publicKeyWithoutPrefix = publicKey.slice(2);
    const publicKeyBuffer = keccak256(Buffer.from(publicKeyWithoutPrefix, 'hex'));
    const address = publicKeyBuffer.toString('hex').slice(-40);

    return {
      privateKey,
      publicKey,
      address
    };
  }

  /**
   * Generates keys with enode URL
   */
  static generateKeysWithEnode(enodeIP: string, enodePort: string): KeysWithEnode {
    const keys = this.generateKeys();
    
    // Create enode URL format: enode://public_key@ip:port
    const enode = `enode://${keys.publicKey}@${enodeIP}:${enodePort}`;

    return {
      ...keys,
      enode
    };
  }

  /**
   * Save keys to directory
   */
  static async saveKeys(keys: CryptoKeys | KeysWithEnode, directory: string): Promise<void> {
    // Ensure directory exists
    await fs.mkdir(directory, { recursive: true });

    // Prepare file operations using modern object destructuring
    const fileOperations = [
      fs.writeFile(join(directory, 'key'), keys.privateKey),
      fs.writeFile(join(directory, 'pub'), keys.publicKey),
      fs.writeFile(join(directory, 'address'), keys.address)
    ];

    // Add enode file if present (type guard with modern approach)
    if ('enode' in keys) {
      fileOperations.push(fs.writeFile(join(directory, 'enode'), keys.enode));
    }

    // Execute all file operations concurrently for better performance
    await Promise.all(fileOperations);
  }
}
