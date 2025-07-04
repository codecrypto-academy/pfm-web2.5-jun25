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
  generateKeyPair(ip: string, port: number): NodeCredentials {
    const keyPair = this.ec.genKeyPair();
    const privateKey = keyPair.getPrivate('hex');
    const publicKey = keyPair.getPublic(false, 'hex').slice(2); // Remove 04 prefix
    const address = this.publicKeyToAddress(publicKey);
    const enode = `enode://${publicKey}@${ip}:${port}`;

    return {
      privateKey: this.addHexPrefix(privateKey),
      publicKey: this.addHexPrefix(publicKey),
      address: this.addHexPrefix(address),
      enode: enode
    };
  }

  /**
   * Convert public key to Ethereum address
   */
  private publicKeyToAddress(publicKey: string): string {
    // Remove the first byte (0x04) from uncompressed public key if present
    const cleanPublicKey = publicKey.startsWith('04') ? publicKey.slice(2) : publicKey;
    const publicKeyBytes = Buffer.from(cleanPublicKey, 'hex');
    
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
   * Validate an Ethereum address
   */
  isValidAddress(address: string): boolean {
    const cleanAddress = this.removeHexPrefix(address);
    return /^[0-9a-fA-F]{40}$/.test(cleanAddress);
  }
}
