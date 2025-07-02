import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { FileSystem } from '../utils/FileSystem';
import { Logger } from '../utils/Logger';
import { ethers } from 'ethers';

/**
 * Resultado de la generación de claves
 */
interface KeyGenerationResult {
  privateKey: string;
  publicKey: string;
  address: string;
}

/**
 * Servicio para generar claves para nodos Besu
 */
export class KeyGenerator {
  private logger: Logger;
  private fs: FileSystem;

  /**
   * Constructor
   * @param logger Servicio de logging
   * @param fs Servicio de sistema de archivos
   */
  constructor(logger: Logger, fs: FileSystem) {
    this.logger = logger;
    this.fs = fs;
  }

  /**
   * Genera claves para un nodo Besu
   * @param nodeDir Directorio del nodo
   */
  public async generateNodeKeys(nodeDir: string): Promise<KeyGenerationResult> {
    this.logger.info(`Generando claves para el nodo en: ${nodeDir}`);

    // Crear el directorio si no existe
    await this.fs.ensureDir(nodeDir);

    // Generar un nuevo monedero Ethereum
    const wallet = ethers.Wallet.createRandom();
    const privateKey = wallet.privateKey;
    const publicKey = wallet.publicKey;
    const address = wallet.address;

    // Guardar la clave privada en formato hexadecimal sin prefijo 0x (formato requerido por Besu)
    const privateKeyPath = path.join(nodeDir, 'key');
    await this.fs.writeFile(privateKeyPath, privateKey.substring(2)); // Eliminar el prefijo 0x

    // Guardar la clave pública
    const publicKeyPath = path.join(nodeDir, 'key.pub');
    await this.fs.writeFile(publicKeyPath, publicKey.substring(2)); // Eliminar el prefijo 0x

    // Guardar la dirección
    const addressPath = path.join(nodeDir, 'address');
    await this.fs.writeFile(addressPath, address);

    this.logger.info(`Claves generadas para el nodo en: ${nodeDir}`);
    this.logger.debug(`Dirección: ${address}`);

    return {
      privateKey,
      publicKey,
      address
    };
  }

  /**
   * Genera un archivo de claves para un nodo Besu
   * @param nodeDir Directorio del nodo
   * @param password Contraseña para cifrar la clave
   */
  public async generateEncryptedNodeKeys(nodeDir: string, password: string): Promise<KeyGenerationResult> {
    this.logger.info(`Generando claves cifradas para el nodo en: ${nodeDir}`);

    // Crear el directorio si no existe
    await this.fs.ensureDir(nodeDir);

    // Generar un nuevo monedero Ethereum
    const wallet = ethers.Wallet.createRandom();
    const privateKey = wallet.privateKey;
    const publicKey = wallet.publicKey;
    const address = wallet.address;

    // Cifrar la clave privada
    const encryptedWallet = await wallet.encrypt(password);

    // Guardar la clave privada cifrada
    const keyFilePath = path.join(nodeDir, 'keystore');
    await this.fs.ensureDir(keyFilePath);
    const encryptedKeyPath = path.join(keyFilePath, `${address.substring(2).toLowerCase()}.json`);
    await this.fs.writeFile(encryptedKeyPath, encryptedWallet);

    // Guardar la dirección
    const addressPath = path.join(nodeDir, 'address');
    await this.fs.writeFile(addressPath, address);

    this.logger.info(`Claves cifradas generadas para el nodo en: ${nodeDir}`);
    this.logger.debug(`Dirección: ${address}`);

    return {
      privateKey,
      publicKey,
      address
    };
  }

  /**
   * Carga claves existentes de un nodo
   * @param nodeDir Directorio del nodo
   */
  public async loadNodeKeys(nodeDir: string): Promise<KeyGenerationResult | null> {
    try {
      // Comprobar si existen los archivos de claves
      const privateKeyPath = path.join(nodeDir, 'key');
      const addressPath = path.join(nodeDir, 'address');

      if (!await this.fs.exists(privateKeyPath) || !await this.fs.exists(addressPath)) {
        return null;
      }

      // Cargar la clave privada
      const privateKeyHex = await this.fs.readFile(privateKeyPath, 'utf8');
      const privateKey = `0x${privateKeyHex}`;

      // Cargar la dirección
      const address = await this.fs.readFile(addressPath, 'utf8');

      // Recrear el monedero
      const wallet = new ethers.Wallet(privateKey);
      // En ethers.js v6, no hay acceso directo a la clave pública
      // Usamos la dirección en su lugar, que es suficiente para la mayoría de los casos
      const publicKey = wallet.address; // Usamos la dirección como identificador público

      this.logger.info(`Claves cargadas para el nodo en: ${nodeDir}`);
      this.logger.debug(`Dirección: ${address}`);

      return {
        privateKey,
        publicKey,
        address
      };
    } catch (error) {
      this.logger.error(`Error al cargar las claves del nodo en ${nodeDir}:`, error);
      return null;
    }
  }

  /**
   * Genera un archivo de contraseña para un nodo
   * @param nodeDir Directorio del nodo
   * @param password Contraseña (si no se proporciona, se genera una aleatoria)
   */
  public async generatePasswordFile(nodeDir: string, password?: string): Promise<string> {
    // Crear el directorio si no existe
    await this.fs.ensureDir(nodeDir);

    // Generar una contraseña aleatoria si no se proporciona
    const nodePassword = password || this.generateRandomPassword();

    // Guardar la contraseña en un archivo
    const passwordPath = path.join(nodeDir, 'password');
    await this.fs.writeFile(passwordPath, nodePassword);

    this.logger.info(`Archivo de contraseña generado en: ${passwordPath}`);

    return nodePassword;
  }

  /**
   * Genera una contraseña aleatoria
   */
  private generateRandomPassword(): string {
    return crypto.randomBytes(16).toString('hex');
  }
}