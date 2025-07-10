import { ethers } from 'ethers';
import * as fs from 'fs-extra';
import * as path from 'path';

export class CryptoUtils {
  /**
   * Genera un par de claves privada/pública
   */
  static generateKeyPair(): { privateKey: string; publicKey: string; address: string } {
    const wallet = ethers.Wallet.createRandom();
    return {
      privateKey: wallet.privateKey,
      publicKey: wallet.publicKey,
      address: wallet.address
    };
  }

  /**
   * Genera múltiples pares de claves
   */
  static generateMultipleKeyPairs(count: number): Array<{ privateKey: string; publicKey: string; address: string }> {
    const keyPairs = [];
    for (let i = 0; i < count; i++) {
      keyPairs.push(this.generateKeyPair());
    }
    return keyPairs;
  }

  /**
   * Genera direcciones derivadas de un mnemónico
   */
  static generateDerivedAddresses(mnemonic: string, count: number = 10): string[] {
    const addresses = [];
    const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic);
    
    for (let i = 0; i < count; i++) {
      const path = `m/44'/60'/0'/0/${i}`;
      const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic, path);
      addresses.push(wallet.address);
    }
    
    return addresses;
  }

  /**
   * Genera wallets derivadas de un mnemónico
   */
  static generateDerivedWallets(mnemonic: string, count: number = 10): ethers.HDNodeWallet[] {
    const wallets: ethers.HDNodeWallet[] = [];
    
    for (let i = 0; i < count; i++) {
      const path = `m/44'/60'/0'/0/${i}`;
      const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic, path);
      wallets.push(wallet);
    }
    
    return wallets;
  }

  /**
   * Guarda las direcciones en un archivo JSON
   */
  static async saveAddressesToFile(addresses: string[], filePath: string): Promise<void> {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeJson(filePath, addresses, { spaces: 2 });
  }

  /**
   * Lee las direcciones desde un archivo JSON
   */
  static async loadAddressesFromFile(filePath: string): Promise<string[]> {
    return await fs.readJson(filePath);
  }

  /**
   * Valida si una dirección Ethereum es válida
   */
  static isValidAddress(address: string): boolean {
    try {
      ethers.getAddress(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Valida si un mnemónico es válido
   */
  static isValidMnemonic(mnemonic: string): boolean {
    try {
      ethers.HDNodeWallet.fromPhrase(mnemonic);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Genera un mnemónico aleatorio
   */
  static generateMnemonic(): string {
    return ethers.Wallet.createRandom().mnemonic?.phrase || '';
  }
} 