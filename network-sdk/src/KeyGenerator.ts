import elliptic from 'elliptic';
import keccak from 'keccak';
import { NodeCredentials } from './types.js';

/**
 * Utility class for generating cryptographic keys for Besu nodes
 */
export class KeyGenerator {
  private ec: elliptic.ec;

  constructor() {
    this.ec = new elliptic.ec('secp256k1');
  }

  /**
   * Generate a new key pair for a Besu node
   */
  generateKeyPair(): NodeCredentials {
    const keyPair = this.ec.genKeyPair();
    const privateKey = keyPair.getPrivate('hex');
    const publicKey = keyPair.getPublic(false, 'hex');
    const address = this.publicKeyToAddress(publicKey);

    return {
      privateKey: this.addHexPrefix(privateKey),
      publicKey: this.addHexPrefix(publicKey),
      address: this.addHexPrefix(address)
    };
  }

  /**
   * Generate key pair from existing private key
   */
  generateFromPrivateKey(privateKey: string): NodeCredentials {
    const cleanPrivateKey = this.removeHexPrefix(privateKey);
    const keyPair = this.ec.keyFromPrivate(cleanPrivateKey, 'hex');
    const publicKey = keyPair.getPublic(false, 'hex');
    const address = this.publicKeyToAddress(publicKey);

    return {
      privateKey: this.addHexPrefix(cleanPrivateKey),
      publicKey: this.addHexPrefix(publicKey),
      address: this.addHexPrefix(address)
    };
  }

  /**
   * Convert public key to Ethereum address
   */
  private publicKeyToAddress(publicKey: string): string {
    // Remove the first byte (0x04) from uncompressed public key
    const publicKeyBytes = Buffer.from(publicKey.slice(2), 'hex');
    
    // Hash the public key with Keccak-256
    const hash = keccak('keccak256').update(publicKeyBytes).digest();
    
    // Take the last 20 bytes as the address
    return hash.slice(-20).toString('hex');
  }

  /**
   * Add 0x prefix if not present
   */
  private addHexPrefix(hex: string): string {
    return hex.startsWith('0x') ? hex : `0x${hex}`;
  }

  /**
   * Remove 0x prefix if present
   */
  private removeHexPrefix(hex: string): string {
    return hex.startsWith('0x') ? hex.slice(2) : hex;
  }

  /**
   * Generate multiple key pairs
   */
  generateMultipleKeyPairs(count: number): NodeCredentials[] {
    const keyPairs: NodeCredentials[] = [];
    for (let i = 0; i < count; i++) {
      keyPairs.push(this.generateKeyPair());
    }
    return keyPairs;
  }

  /**
   * Validate a private key
   */
  isValidPrivateKey(privateKey: string): boolean {
    try {
      const cleanPrivateKey = this.removeHexPrefix(privateKey);
      this.ec.keyFromPrivate(cleanPrivateKey, 'hex');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate an Ethereum address
   */
  isValidAddress(address: string): boolean {
    const cleanAddress = this.removeHexPrefix(address);
    return /^[0-9a-fA-F]{40}$/.test(cleanAddress);
  }
}
