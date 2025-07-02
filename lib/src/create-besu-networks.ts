/**
 * BesuNetwork Library
 * Author: Javier Ruiz-Canela López
 * Email: jrcanelalopez@gmail.com
 * Date: June 28, 2025
 * 
 * This library was developed with the assistance of GitHub Copilot
 * to provide comprehensive tools for creating and managing Hyperledger Besu networks.
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { ec as EC } from "elliptic";
import { keccak256 } from "js-sha3";
import { ethers } from "ethers";

// Interfaces and Types
export interface BesuNodeConfig {
  name: string;
  ip: string;
  port: number;
  rpcPort: number;
  type: "bootnode" | "miner" | "rpc" | "node";
}

export interface BesuNetworkConfig {
  name: string;
  chainId: number;
  subnet: string;
  consensus: "clique" | "ibft2" | "qbft";
  gasLimit: string;
  blockTime?: number;
  mainIp?: string; // IP principal de la red
  signerAccounts?: Array<{ address: string; weiAmount: string }>; // Lista de cuentas firmantes/validadores (para consenso PoA/IBFT2)
  accounts?: Array<{ address: string; weiAmount: string }>;// Lista de cuentas con balance inicial (en wei)
}

export interface KeyPair {
  privateKey: string;
  publicKey: string;
  address: string;
  enode: string;
}

export interface BesuGenesisConfig {
  config: {
    chainId: number;
    londonBlock: number;
    clique?: {
      period: number;
      epoch: number;
    };
    ibft2?: {
      blockperiodseconds: number;
      epochlength: number;
      validators?: string[];
    };
    qbft?: {
      blockperiodseconds: number;
      epochlength: number;
      validators?: string[];
    };
  };
  extraData: string;
  gasLimit: string;
  difficulty: string;
  alloc: Record<string, { balance: string }>;
}

export interface BesuNodeDefinition {
  name: string;
  ip: string;
  rpcPort: number;
  type: 'bootnode' | 'miner' | 'rpc' | 'node';
  p2pPort?: number; // Por defecto 30303
}

export interface BesuNetworkCreateOptions {
  nodes: BesuNodeDefinition[];
  initialBalance?: string;
  autoResolveSubnetConflicts?: boolean;
}

export interface DockerContainerConfig {
  name: string;
  image: string;
  network: string;
  ip: string;
  ports: string[];
  volumes: string[];
  labels: Record<string, string>;
  environment?: Record<string, string>;
}

export interface ValidationError {
  field: string;
  type: 'duplicate' | 'format' | 'range' | 'invalid' | 'required';
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  type: 'duplicate' | 'format' | 'range' | 'invalid' | 'required';
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Utility Functions
export function executeCommand(command: string): string {
  try {
    return execSync(command, { encoding: "utf-8" });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Command failed: ${command}\nError: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Genera una subred alternativa si la especificada está en conflicto
 */
export function generateAlternativeSubnet(baseSubnet: string): string {
  const [baseNetwork, mask] = baseSubnet.split('/');
  const parts = baseNetwork.split('.');
  
  // Intentar con diferentes rangos de red privada
  const alternatives = [
    '172.25.0.0',
    '172.26.0.0',
    '172.27.0.0',
    '10.10.0.0',
    '10.11.0.0',
    '192.168.100.0'
  ];
  
  for (const alt of alternatives) {
    if (alt !== baseNetwork) {
      return `${alt}/${mask}`;
    }
  }
  
  // Si todos los alternativos fallan, generar uno aleatorio
  const randomSecond = Math.floor(Math.random() * 255) + 1;
  return `172.${randomSecond}.0.0/${mask}`;
}

/**
 * Verifica si una subred está disponible
 */
export function isSubnetAvailable(subnet: string): boolean {
  try {
    const networks = executeCommand('docker network ls --format "{{.Name}}"').trim().split('\n');
    
    for (const network of networks) {
      if (network === 'bridge' || network === 'host' || network === 'none') {
        continue;
      }
      
      try {
        const inspect = executeCommand(`docker network inspect ${network}`);
        const networkData = JSON.parse(inspect);
        
        if (networkData[0]?.IPAM?.Config) {
          for (const config of networkData[0].IPAM.Config) {
            if (config.Subnet === subnet) {
              return false;
            }
          }
        }
      } catch (e) {
        // Skip networks that can't be inspected
        continue;
      }
    }
    
    return true;
  } catch (error) {
    // If we can't check, assume it's available
    return true;
  }
}

// Crypto Library Class
export class CryptoLib {
  private ec: EC;

  constructor() {
    this.ec = new EC("secp256k1");
  }

  /**
   * Genera un nuevo par de claves para un nodo Besu
   * @param ip - Dirección IP del nodo
   * @returns Par de claves con dirección y enode
   */
  generateKeyPair(ip: string): KeyPair {
    const keyPair = this.ec.genKeyPair();
    const privateKey = keyPair.getPrivate("hex");
    const publicKey = keyPair.getPublic("hex");
    const address = this.publicKeyToAddress(publicKey);
    const enode = `enode://${publicKey.slice(2)}@${ip}:30303`;

    return {
      privateKey,
      publicKey,
      address,
      enode,
    };
  }

  /**
   * Convierte una clave pública a una dirección Ethereum
   */
  publicKeyToAddress(publicKey: string): string {
    const pubKeyBuffer = Buffer.from(
      keccak256(Buffer.from(publicKey.slice(2), "hex")),
      "hex"
    );
    return pubKeyBuffer.toString("hex").slice(-40);
  }

  /**
   * Firma un mensaje con una clave privada
   */
  sign(
    message: string,
    privateKey: string
  ): { r: string; s: string; v: number } {
    const keyPair = this.ec.keyFromPrivate(privateKey);
    const msgHash = Buffer.from(keccak256(message), "hex");
    const signature = keyPair.sign(msgHash);

    return {
      r: signature.r.toString("hex"),
      s: signature.s.toString("hex"),
      v: signature.recoveryParam || 0,
    };
  }

  /**
   * Verifica una firma
   */
  verify(
    message: string,
    signature: { r: string; s: string; v: number },
    publicKey: string
  ): boolean {
    const keyPair = this.ec.keyFromPublic(publicKey, "hex");
    const msgHash = Buffer.from(keccak256(message), "hex");

    return keyPair.verify(msgHash, {
      r: signature.r,
      s: signature.s,
    });
  }
}

// File Service Class
export class FileService {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  createFolder(folderPath: string): void {
    const fullPath = path.join(this.basePath, folderPath);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }

  createFile(folderPath: string, fileName: string, content: string): void {
    const fullPath = path.join(this.basePath, folderPath);
    this.createFolder(folderPath);
    fs.writeFileSync(path.join(fullPath, fileName), content);
  }

  readFile(folderPath: string, fileName: string): string {
    const fullPath = path.join(this.basePath, folderPath, fileName);
    return fs.readFileSync(fullPath, "utf-8");
  }

  exists(folderPath: string, fileName?: string): boolean {
    const fullPath = fileName
      ? path.join(this.basePath, folderPath, fileName)
      : path.join(this.basePath, folderPath);
    return fs.existsSync(fullPath);
  }

  removeFolder(folderPath: string): void {
    const fullPath = path.join(this.basePath, folderPath);
    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    }
  }

  get folder(): string {
    return this.basePath;
  }
}

// Besu Node Class
export class BesuNode {
  private config: BesuNodeConfig;
  private keys: KeyPair;
  private fileService: FileService;

  constructor(config: BesuNodeConfig, fileService: FileService) {
    this.config = config;
    this.fileService = fileService;
    this.keys = this.generateOrLoadKeys();
  }

  private generateOrLoadKeys(): KeyPair {
    const cryptoLib = new CryptoLib();
    const nodePath = this.config.name;

    // Try to load existing keys
    if (this.fileService.exists(nodePath, "key.priv")) {
      const privateKey = this.fileService.readFile(nodePath, "key.priv");
      const publicKey = this.fileService.readFile(nodePath, "key.pub");
      const address = this.fileService.readFile(nodePath, "address");
      const enode = this.fileService.readFile(nodePath, "enode");

      // Verify that the enode IP matches the current node IP
      const expectedEnode = `enode://${publicKey.slice(2)}@${this.config.ip}:30303`;
      
      if (enode === expectedEnode) {
        // Keys are valid for current IP
        return { privateKey, publicKey, address, enode };
      } else {
        // Keys have incorrect IP, regenerate enode with correct IP
        console.log(`🔄 Updating enode for ${this.config.name} with new IP ${this.config.ip}`);
        const updatedKeyPair = { privateKey, publicKey, address, enode: expectedEnode };
        this.saveKeys(updatedKeyPair);
        return updatedKeyPair;
      }
    }

    // Generate new keys
    const keyPair = cryptoLib.generateKeyPair(this.config.ip);
    this.saveKeys(keyPair);
    return keyPair;
  }

  private saveKeys(keyPair: KeyPair): void {
    const nodePath = this.config.name;
    this.fileService.createFile(nodePath, "key.priv", keyPair.privateKey);
    this.fileService.createFile(nodePath, "key.pub", keyPair.publicKey);
    this.fileService.createFile(nodePath, "address", keyPair.address);
    this.fileService.createFile(nodePath, "enode", keyPair.enode);
  }

  getKeys(): KeyPair {
    return this.keys;
  }

  getConfig(): BesuNodeConfig {
    return this.config;
  }

  /**
   * Actualiza la IP del nodo y regenera las claves con la nueva IP
   * @param newIp - Nueva dirección IP
   */
  updateIp(newIp: string): void {
    this.config = { ...this.config, ip: newIp };
    
    // Regenerar enode con la nueva IP
    const cryptoLib = new CryptoLib();
    const newEnode = `enode://${this.keys.publicKey.slice(2)}@${newIp}:30303`;
    
    // Actualizar las claves
    this.keys = {
      ...this.keys,
      enode: newEnode
    };
    
    // Guardar las claves actualizadas
    this.saveKeys(this.keys);
  }

  generateTomlConfig(
    networkConfig: BesuNetworkConfig,
    bootnodeEnodes?: string | string[]
  ): string {
    let config = `genesis-file="/data/genesis.json"
p2p-host="0.0.0.0"
p2p-port=30303
p2p-enabled=true
rpc-http-enabled=true
rpc-http-host="0.0.0.0"
rpc-http-port=${this.config.rpcPort}
rpc-http-cors-origins=["*"]
rpc-http-api=["ETH","NET","CLIQUE","ADMIN","TRACE","DEBUG","TXPOOL","PERM"]
host-allowlist=["*"]
sync-mode="FULL"
`;

    if (this.config.type === "miner") {
      config += `miner-enabled=true
miner-coinbase="0x${this.keys.address}"
`;
    }

    // Soporte para múltiples bootnodes
    if (bootnodeEnodes && this.config.type !== "bootnode") {
      if (typeof bootnodeEnodes === 'string') {
        // Compatibilidad con API anterior (single bootnode)
        config += `bootnodes=["${bootnodeEnodes}"]
`;
      } else if (Array.isArray(bootnodeEnodes) && bootnodeEnodes.length > 0) {
        // Múltiples bootnodes
        const bootnodeList = bootnodeEnodes.map(enode => `"${enode}"`).join(',');
        config += `bootnodes=[${bootnodeList}]
`;
      }
    }

    return config;
  }
}

// Docker Network Manager Class
export class DockerNetworkManager {
  private networkName: string;

  constructor(networkName: string) {
    this.networkName = networkName;
  }

  createNetwork(subnet: string, labels: Record<string, string> = {}): void {
    try {
      // Check if network already exists
      if (this.networkExists()) {
        console.log(`⚠️  Network ${this.networkName} already exists, removing it...`);
        this.removeNetwork();
      }
    } catch (error) {
      // Network doesn't exist, continue
    }

    try {
      const labelString = Object.entries(labels)
        .map(([key, value]) => `--label ${key}=${value}`)
        .join(" ");

      const command = `docker network create ${this.networkName} --subnet "${subnet}" ${labelString}`;
      executeCommand(command);
    } catch (error) {
      if (error instanceof Error && error.message.includes("Pool overlaps with other one")) {
        // Try to find and remove conflicting networks
        this.handleSubnetConflict(subnet);
        
        // Retry network creation
        const labelString = Object.entries(labels)
          .map(([key, value]) => `--label ${key}=${value}`)
          .join(" ");
        const command = `docker network create ${this.networkName} --subnet "${subnet}" ${labelString}`;
        executeCommand(command);
      } else {
        throw error;
      }
    }
  }

  private handleSubnetConflict(subnet: string): void {
    console.log(`⚠️  Subnet conflict detected for ${subnet}. Looking for conflicting networks...`);
    
    try {
      // List all networks and their subnets
      const networks = executeCommand('docker network ls --format "{{.Name}}"').trim().split('\n');
      
      for (const network of networks) {
        if (network === 'bridge' || network === 'host' || network === 'none') {
          continue;
        }
        
        try {
          const inspect = executeCommand(`docker network inspect ${network}`);
          const networkData = JSON.parse(inspect);
          
          if (networkData[0]?.IPAM?.Config) {
            for (const config of networkData[0].IPAM.Config) {
              if (config.Subnet === subnet) {
                console.log(`🔍 Found conflicting network: ${network} with subnet ${subnet}`);
                console.log(`🗑️  Removing conflicting network: ${network}`);
                
                // Remove containers first
                try {
                  const containers = executeCommand(`docker ps -aq --filter "network=${network}"`);
                  if (containers.trim()) {
                    executeCommand(`docker rm -f ${containers.trim().split('\n').join(' ')}`);
                  }
                } catch (e) {
                  // No containers to remove
                }
                
                // Remove the network
                executeCommand(`docker network rm ${network}`);
                break;
              }
            }
          }
        } catch (e) {
          // Skip networks that can't be inspected
          continue;
        }
      }
    } catch (error) {
      console.error('❌ Error handling subnet conflict:', error);
      throw new Error(`Subnet conflict: ${subnet} is already in use by another Docker network. Please manually remove conflicting networks or use a different subnet.`);
    }
  }

  networkExists(): boolean {
    try {
      executeCommand(`docker network inspect ${this.networkName}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  removeNetwork(): void {
    try {
      // First remove all containers in this network
      this.removeContainers();
      
      // Check if network exists before trying to remove it
      try {
        const networkExists = executeCommand(`docker network ls -q --filter "name=^${this.networkName}$"`);
        if (networkExists.trim()) {
          executeCommand(`docker network rm ${this.networkName}`);
        }
      } catch (networkError) {
        // Network might not exist or already removed, that's ok
        console.log(`ℹ️  Network ${this.networkName} already removed or doesn't exist`);
      }
    } catch (error) {
      // Overall error handling - should not fail the operation
      console.log(`ℹ️  Network cleanup completed for ${this.networkName}`);
    }
  }

  removeContainers(): void {
    try {
      const containers = executeCommand(
        `docker ps -aq --filter "label=network=${this.networkName}"`
      );
      if (containers.trim()) {
        // Stop containers first
        try {
          executeCommand(
            `docker stop ${containers.trim().split("\n").join(" ")}`
          );
        } catch (stopError) {
          // Some containers might already be stopped
        }
        
        // Then remove them
        executeCommand(
          `docker rm -f ${containers.trim().split("\n").join(" ")}`
        );
      }
    } catch (error) {
      // No containers to remove or already removed
      console.log(`ℹ️  Container cleanup completed for network ${this.networkName}`);
    }
  }

  runContainer(config: DockerContainerConfig): string {
    const portMappings = config.ports.map((port) => `-p ${port}`).join(" ");
    const volumeMappings = config.volumes
      .map((volume) => `-v ${volume}`)
      .join(" ");
    const labelMappings = Object.entries(config.labels)
      .map(([key, value]) => `--label ${key}=${value}`)
      .join(" ");

    const envMappings = config.environment
      ? Object.entries(config.environment)
          .map(([key, value]) => `-e ${key}=${value}`)
          .join(" ")
      : "";

    const command = `docker run -d \
            --name ${config.name} \
            ${labelMappings} \
            --ip ${config.ip} \
            --network ${config.network} \
            ${portMappings} \
            ${volumeMappings} \
            ${envMappings} \
            ${config.image}`;

    return executeCommand(command);
  }
}

// Main Besu Network Class
export class BesuNetwork {
  private config: BesuNetworkConfig;
  private fileService: FileService;
  private dockerManager: DockerNetworkManager;
  private nodes: Map<string, BesuNode>;
  private cryptoLib: CryptoLib;

  constructor(config: BesuNetworkConfig, baseDir: string = "./networks") {
    this.config = config;
    this.fileService = new FileService(path.join(baseDir, config.name));
    this.dockerManager = new DockerNetworkManager(config.name);
    this.nodes = new Map();
    this.cryptoLib = new CryptoLib();
    
    // Validate account addresses if provided
    this.validateAccountAddresses();
  }

  /**
   * Valida que las direcciones de cuentas tengan el formato correcto
   */
  private validateAccountAddresses(): void {
    if (this.config.signerAccounts && this.config.signerAccounts.length > 0) {
      for (const signerAccount of this.config.signerAccounts) {
        if (!this.isValidEthereumAddress(signerAccount.address)) {
          throw new Error(`Invalid signer account address: ${signerAccount.address}`);
        }
      }
    }

    if (this.config.accounts && this.config.accounts.length > 0) {
      for (const account of this.config.accounts) {
        if (!this.isValidEthereumAddress(account.address)) {
          throw new Error(`Invalid account address: ${account.address}`);
        }
      }
    }
  }

  /**
   * Genera IPs para los nodos basándose en la IP principal o subnet de la red
   */
  private generateNodeIp(nodeIndex: number): string {
    if (this.config.mainIp) {
      // Si hay una IP principal definida, usarla como base
      const parts = this.config.mainIp.split('.');
      parts[3] = (parseInt(parts[3]) + nodeIndex + 1).toString();
      return parts.join('.');
    } else {
      // Usar la subnet para generar IPs
      const [baseNetwork] = this.config.subnet.split('/');
      const baseParts = baseNetwork.split('.');
      const baseIp = `${baseParts[0]}.${baseParts[1]}.${baseParts[2]}.${10 + nodeIndex}`;
      return baseIp;
    }
  }

  // Getters
  getNodes(): Map<string, BesuNode> {
    return this.nodes;
  }

  getConfig(): BesuNetworkConfig {
    return this.config;
  }

  getFileService(): FileService {
    return this.fileService;
  }

  getNodeByName(name: string): BesuNode | undefined {
    return this.nodes.get(name);
  }

  getNodesByType(type: 'bootnode' | 'miner' | 'rpc' | 'node'): BesuNode[] {
    const result: BesuNode[] = [];
    for (const [name, node] of this.nodes) {
      if (node.getConfig().type === type) {
        result.push(node);
      }
    }
    return result;
  }

  getAllNodeConfigs(): Array<{ name: string; config: BesuNodeConfig; keys: KeyPair }> {
    const result = [];
    for (const [name, node] of this.nodes) {
      result.push({
        name,
        config: node.getConfig(),
        keys: node.getKeys()
      });
    }
    return result;
  }

  /**
   * Obtiene el nodo miner de la red
   */
  private getMinerNode(): BesuNode | null {
    const minerNodes = this.getNodesByType('miner');
    return minerNodes.length > 0 ? minerNodes[0] : null;
  }

  /**
   * Obtiene el puerto RPC del miner
   */
  private getMinerRpcPort(): number {
    const minerNode = this.getMinerNode();
    if (!minerNode) {
      throw new Error('No miner node found in the network');
    }
    return minerNode.getConfig().rpcPort;
  }

  /**
   * Valida la configuración de red y opciones antes de crear la red
   */
  validateNetworkConfiguration(options: BesuNetworkCreateOptions): ValidationResult {
    const errors: ValidationError[] = [];

    // Validar configuración de red
    this.validateNetworkBasicConfig(errors);
    this.validateNetworkConsensus(errors, options);
    this.validateNetworkIps(errors);
    this.validateNetworkAccounts(errors);
    
    // Validar opciones de creación
    this.validateCreateOptions(errors, options);

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida la configuración básica de la red
   */
  private validateNetworkBasicConfig(errors: ValidationError[]): void {
    // Validar name
    if (!this.config.name || this.config.name.trim().length === 0) {
      errors.push({
        field: 'name',
        type: 'required',
        message: 'Network name is required'
      });
    } else {
      // Verificar formato del nombre (solo letras, números, guiones y guiones bajos)
      const nameRegex = /^[a-zA-Z0-9_-]+$/;
      if (!nameRegex.test(this.config.name)) {
        errors.push({
          field: 'name',
          type: 'format',
          message: 'Network name can only contain letters, numbers, hyphens and underscores'
        });
      }

      // Verificar duplicados de nombre de red Docker
      if (this.dockerManager.networkExists()) {
        errors.push({
          field: 'name',
          type: 'duplicate',
          message: `Docker network with name '${this.config.name}' already exists`
        });
      }
    }

    // Validar chainId
    if (!Number.isInteger(this.config.chainId) || this.config.chainId <= 0) {
      errors.push({
        field: 'chainId',
        type: 'format',
        message: 'Chain ID must be a positive integer'
      });
    } else {
      // Verificar que no sea un chainId reservado para redes públicas
      const reservedChainIds = [1, 3, 4, 5, 42, 56, 137, 250, 43114, 10, 42161, 8453];
      if (reservedChainIds.includes(this.config.chainId)) {
        errors.push({
          field: 'chainId',
          type: 'invalid',
          message: `Chain ID ${this.config.chainId} is reserved for public networks. Use a custom chain ID > 1000`
        });
      }

      // Verificar duplicados de chainId en redes locales existentes
      if (this.isChainIdInUse(this.config.chainId)) {
        errors.push({
          field: 'chainId',
          type: 'duplicate',
          message: `Chain ID ${this.config.chainId} is already in use by another local network`
        });
      }
    }

    // Validar subnet
    if (!this.isValidSubnet(this.config.subnet)) {
      errors.push({
        field: 'subnet',
        type: 'format',
        message: 'Invalid subnet format. Expected format: xxx.xxx.xxx.xxx/xx (e.g., 172.24.0.0/16)'
      });
    } else if (!isSubnetAvailable(this.config.subnet)) {
      errors.push({
        field: 'subnet',
        type: 'duplicate',
        message: `Subnet ${this.config.subnet} is already in use by another Docker network`
      });
    }

    // Validar gasLimit
    const gasLimit = parseInt(this.config.gasLimit, 16);
    if (isNaN(gasLimit) || gasLimit < 4712388 || gasLimit > 100000000) {
      errors.push({
        field: 'gasLimit',
        type: 'range',
        message: 'Gas limit must be between 4,712,388 (0x47E7C4) and 100,000,000 (0x5F5E100)'
      });
    }

    // Validar blockTime
    if (this.config.blockTime !== undefined) {
      if (!Number.isInteger(this.config.blockTime) || this.config.blockTime < 1 || this.config.blockTime > 300) {
        errors.push({
          field: 'blockTime',
          type: 'range',
          message: 'Block time must be between 1 and 300 seconds'
        });
      }
    }
  }

  /**
   * Valida la configuración específica del consenso
   */
  private validateNetworkConsensus(errors: ValidationError[], options: BesuNetworkCreateOptions): void {
    const consensus = this.config.consensus;
    const nodeTypes = options.nodes.reduce((acc, node) => {
      acc[node.type] = (acc[node.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalNodes = options.nodes.length;
    const minerCount = nodeTypes.miner || 0;
    const bootnodeCount = nodeTypes.bootnode || 0;
    const rpcCount = nodeTypes.rpc || 0;
    const validatorCount = nodeTypes.node || 0; // nodes que pueden actuar como validadores

    // Validaciones básicas comunes a todos los consensos
    if (bootnodeCount === 0) {
      errors.push({
        field: 'nodes',
        type: 'required',
        message: 'At least one bootnode is required for any consensus mechanism'
      });
    }

    if (totalNodes < 2) {
      errors.push({
        field: 'nodes',
        type: 'required',
        message: 'At least 2 nodes are required for a functional blockchain network'
      });
    }

    // Validaciones específicas por tipo de consenso
    switch (consensus) {
      case 'clique':
        // Clique es un algoritmo de Proof of Authority (PoA)
        if (minerCount === 0) {
          errors.push({
            field: 'consensus',
            type: 'required',
            message: 'Clique consensus requires at least one miner node (signer)'
          });
        }
        
        if (minerCount === 2) {
          errors.push({
            field: 'consensus',
            type: 'invalid',
            message: 'Clique consensus with exactly 2 miners can cause network splits. Use 1, 3, or more miners for better stability'
          });
        }

        // Recomendaciones para Clique
        if (minerCount > 1 && minerCount % 2 === 0) {
          errors.push({
            field: 'consensus',
            type: 'invalid',
            message: `Clique consensus with ${minerCount} miners (even number) may cause issues. Consider using an odd number of miners for better consensus`
          });
        }

        if (totalNodes > 20) {
          errors.push({
            field: 'consensus',
            type: 'invalid',
            message: 'Clique consensus is not recommended for networks with more than 20 nodes due to performance limitations'
          });
        }
        break;

      case 'ibft2':
        // IBFT2 es un algoritmo bizantino tolerante a fallos
        const ibft2Validators = minerCount + validatorCount;
        
        if (ibft2Validators < 4) {
          errors.push({
            field: 'consensus',
            type: 'required',
            message: `IBFT2 consensus requires at least 4 validator nodes (miners + validator nodes). Currently: ${ibft2Validators}`
          });
        }

        // Verificar tolerancia bizantina: f = (n-1)/3
        const ibft2MaxFaults = Math.floor((ibft2Validators - 1) / 3);
        if (ibft2MaxFaults === 0 && ibft2Validators > 1) {
          errors.push({
            field: 'consensus',
            type: 'invalid',
            message: `With ${ibft2Validators} validators, IBFT2 cannot tolerate any faults. Use at least 4 validators for fault tolerance`
          });
        }

        if (ibft2Validators > 100) {
          errors.push({
            field: 'consensus',
            type: 'invalid',
            message: 'IBFT2 consensus is not recommended for networks with more than 100 validators due to performance limitations'
          });
        }

        // Al menos un nodo debe ser miner para producir bloques
        if (minerCount === 0) {
          errors.push({
            field: 'consensus',
            type: 'required',
            message: 'IBFT2 consensus requires at least one miner node to produce blocks'
          });
        }
        break;

      case 'qbft':
        // QBFT es la evolución de IBFT2
        const qbftValidators = minerCount + validatorCount;
        
        if (qbftValidators < 4) {
          errors.push({
            field: 'consensus',
            type: 'required',
            message: `QBFT consensus requires at least 4 validator nodes (miners + validator nodes). Currently: ${qbftValidators}`
          });
        }

        // Verificar tolerancia bizantina: f = (n-1)/3
        const qbftMaxFaults = Math.floor((qbftValidators - 1) / 3);
        if (qbftMaxFaults === 0 && qbftValidators > 1) {
          errors.push({
            field: 'consensus',
            type: 'invalid',
            message: `With ${qbftValidators} validators, QBFT cannot tolerate any faults. Use at least 4 validators for fault tolerance`
          });
        }

        if (qbftValidators > 100) {
          errors.push({
            field: 'consensus',
            type: 'invalid',
            message: 'QBFT consensus is not recommended for networks with more than 100 validators due to performance limitations'
          });
        }

        // Al menos un nodo debe ser miner para producir bloques
        if (minerCount === 0) {
          errors.push({
            field: 'consensus',
            type: 'required',
            message: 'QBFT consensus requires at least one miner node to produce blocks'
          });
        }

        // QBFT es más eficiente que IBFT2, dar recomendación
        if (qbftValidators >= 10) {
          // Esto es solo informativo, no un error
          console.log(`💡 Info: QBFT consensus with ${qbftValidators} validators is well-suited for larger networks`);
        }
        break;

      default:
        errors.push({
          field: 'consensus',
          type: 'invalid',
          message: `Unknown consensus mechanism: ${consensus}. Supported: clique, ibft2, qbft`
        });
    }

    // Validaciones adicionales de arquitectura de red
    const totalActiveNodes = minerCount + rpcCount + validatorCount;
    
    if (totalActiveNodes === 0) {
      errors.push({
        field: 'nodes',
        type: 'required',
        message: 'Network must have at least one active node (miner, rpc, or validator) besides bootnodes'
      });
    }

    // Advertir si solo hay bootnodes
    if (bootnodeCount === totalNodes) {
      errors.push({
        field: 'nodes',
        type: 'invalid',
        message: 'Network cannot consist only of bootnodes. Add miner, rpc, or validator nodes'
      });
    }

    // Recomendación para redes grandes
    if (totalNodes > 50 && rpcCount === 0) {
      errors.push({
        field: 'nodes',
        type: 'invalid',
        message: 'For networks with more than 50 nodes, consider adding dedicated RPC nodes for better performance'
      });
    }
  }

  /**
   * Valida las IPs de la red
   */
  private validateNetworkIps(errors: ValidationError[]): void {
    const usedIps = new Set<string>();

    // Validar mainIp si existe
    if (this.config.mainIp) {
      if (!this.isValidIpAddress(this.config.mainIp)) {
        errors.push({
          field: 'mainIp',
          type: 'format',
          message: 'Main IP address format is invalid'
        });
      } else {
        usedIps.add(this.config.mainIp);
      }
    }
  }

  /**
   * Valida las cuentas de la red
   */
  private validateNetworkAccounts(errors: ValidationError[]): void {
    const usedAddresses = new Set<string>();

    // Validar signerAccounts array (nuevo soporte múltiple)
    if (this.config.signerAccounts && this.config.signerAccounts.length > 0) {
      // Validación específica según el tipo de consenso
      if (this.config.consensus === 'clique' && this.config.signerAccounts.length > 10) {
        errors.push({
          field: 'signerAccounts',
          type: 'range',
          message: 'Clique consensus supports a maximum of 10 signers for optimal performance'
        });
      } else if ((this.config.consensus === 'ibft2' || this.config.consensus === 'qbft') && this.config.signerAccounts.length > 20) {
        errors.push({
          field: 'signerAccounts',
          type: 'range',
          message: 'IBFT2/QBFT consensus supports a maximum of 20 validators for optimal performance'
        });
      }

      this.config.signerAccounts.forEach((signer, index) => {
        if (!this.isValidEthereumAddress(signer.address)) {
          errors.push({
            field: `signerAccounts[${index}].address`,
            type: 'format',
            message: `Signer account ${index} address must be a valid Ethereum address (0x...)`
          });
        } else {
          const lowerAddress = signer.address.toLowerCase();
          if (usedAddresses.has(lowerAddress)) {
            errors.push({
              field: `signerAccounts[${index}].address`,
              type: 'duplicate',
              message: `Signer account ${index} address is duplicated`
            });
          } else {
            usedAddresses.add(lowerAddress);
          }
        }

        if (!this.isValidWeiAmount(signer.weiAmount)) {
          errors.push({
            field: `signerAccounts[${index}].weiAmount`,
            type: 'format',
            message: `Signer account ${index} wei amount must be a valid positive number`
          });
        } else if (!this.isReasonableWeiAmount(signer.weiAmount)) {
          errors.push({
            field: `signerAccounts[${index}].weiAmount`,
            type: 'range',
            message: `Signer account ${index} wei amount should be between 1 wei and 10^24 wei (1,000,000 ETH max)`
          });
        }
      });
    }

    // Validar accounts array
    if (this.config.accounts && this.config.accounts.length > 0) {
      this.config.accounts.forEach((account, index) => {
        if (!this.isValidEthereumAddress(account.address)) {
          errors.push({
            field: `accounts[${index}].address`,
            type: 'format',
            message: `Account ${index} address must be a valid Ethereum address (0x...)`
          });
        } else {
          const lowerAddress = account.address.toLowerCase();
          if (usedAddresses.has(lowerAddress)) {
            errors.push({
              field: `accounts[${index}].address`,
              type: 'duplicate',
              message: `Account ${index} address is duplicated`
            });
          } else {
            usedAddresses.add(lowerAddress);
          }
        }

        if (!this.isValidWeiAmount(account.weiAmount)) {
          errors.push({
            field: `accounts[${index}].weiAmount`,
            type: 'format',
            message: `Account ${index} wei amount must be a valid positive number`
          });
        } else if (!this.isReasonableWeiAmount(account.weiAmount)) {
          errors.push({
            field: `accounts[${index}].weiAmount`,
            type: 'range',
            message: `Account ${index} wei amount should be between 1 wei and 10^24 wei (1,000,000 ETH max)`
          });
        }
      });
    }
  }

  /**
   * Valida las opciones de creación
   */
  private validateCreateOptions(errors: ValidationError[], options: BesuNetworkCreateOptions): void {
    // Validar que hay nodos definidos
    if (!options.nodes || options.nodes.length === 0) {
      errors.push({
        field: 'nodes',
        type: 'required',
        message: 'At least one node must be defined'
      });
      return;
    }

    const usedIps = new Set<string>();
    const usedRpcEndpoints = new Set<string>(); // IP:Port combinations for RPC
    const usedP2pEndpoints = new Set<string>(); // IP:Port combinations for P2P
    const usedNames = new Set<string>();

    // Validar cada nodo
    options.nodes.forEach((node, index) => {
      // Validar nombre del nodo
      if (!node.name || node.name.trim().length === 0) {
        errors.push({
          field: `nodes[${index}].name`,
          type: 'required',
          message: `Node ${index} name is required`
        });
      } else {
        // Verificar formato del nombre (solo letras, números, guiones y guiones bajos)
        const nameRegex = /^[a-zA-Z0-9_-]+$/;
        if (!nameRegex.test(node.name)) {
          errors.push({
            field: `nodes[${index}].name`,
            type: 'format',
            message: `Node ${index} name can only contain letters, numbers, hyphens and underscores`
          });
        }

        // Verificar duplicados de nombre dentro de la red
        if (usedNames.has(node.name)) {
          errors.push({
            field: `nodes[${index}].name`,
            type: 'duplicate',
            message: `Node name '${node.name}' is duplicated within the network`
          });
        } else {
          usedNames.add(node.name);
        }
      }

      // Validar IP del nodo
      if (!this.isValidIpAddress(node.ip)) {
        errors.push({
          field: `nodes[${index}].ip`,
          type: 'format',
          message: `Node ${index} IP address format is invalid`
        });
      } else {
        // Verificar duplicados de IP dentro de la red
        if (usedIps.has(node.ip)) {
          errors.push({
            field: `nodes[${index}].ip`,
            type: 'duplicate',
            message: `Node ${index} IP address '${node.ip}' is duplicated within the network`
          });
        } else {
          usedIps.add(node.ip);
        }

        // Verificar que la IP está en la subnet configurada y es coherente
        if (!this.isIpInSubnet(node.ip, this.config.subnet)) {
          errors.push({
            field: `nodes[${index}].ip`,
            type: 'invalid',
            message: `Node ${index} IP '${node.ip}' is not in the configured subnet '${this.config.subnet}'`
          });
        }

        // Verificar que no es una IP reservada dentro de la subnet
        if (this.isReservedIpInSubnet(node.ip, this.config.subnet)) {
          errors.push({
            field: `nodes[${index}].ip`,
            type: 'invalid',
            message: `Node ${index} IP '${node.ip}' is a reserved IP address (network, broadcast, or gateway)`
          });
        }
      }

      // Validar puerto RPC
      if (!Number.isInteger(node.rpcPort) || node.rpcPort < 1024 || node.rpcPort > 65535) {
        errors.push({
          field: `nodes[${index}].rpcPort`,
          type: 'range',
          message: `Node ${index} RPC port must be between 1024 and 65535`
        });
      } else {
        // Verificar duplicados de endpoint RPC (IP:Puerto) dentro de la red
        const rpcEndpoint = `${node.ip}:${node.rpcPort}`;
        if (usedRpcEndpoints.has(rpcEndpoint)) {
          errors.push({
            field: `nodes[${index}].rpcPort`,
            type: 'duplicate',
            message: `Node ${index} RPC endpoint ${rpcEndpoint} is duplicated within the network`
          });
        } else {
          usedRpcEndpoints.add(rpcEndpoint);
        }

        // Verificar que el puerto RPC no conflicte con puertos conocidos del sistema
        if (this.isSystemReservedPort(node.rpcPort)) {
          errors.push({
            field: `nodes[${index}].rpcPort`,
            type: 'invalid',
            message: `Node ${index} RPC port ${node.rpcPort} is a system reserved port`
          });
        }
      }

      // Validar puerto P2P (obligatorio para todos los nodos con valor por defecto 30303)
      const p2pPort = node.p2pPort || 30303;
      if (!Number.isInteger(p2pPort) || p2pPort < 1024 || p2pPort > 65535) {
        errors.push({
          field: `nodes[${index}].p2pPort`,
          type: 'range',
          message: `Node ${index} P2P port must be between 1024 and 65535`
        });
      } else {
        // Verificar duplicados de endpoint P2P (IP:Puerto) dentro de la red
        const p2pEndpoint = `${node.ip}:${p2pPort}`;
        if (usedP2pEndpoints.has(p2pEndpoint)) {
          errors.push({
            field: `nodes[${index}].p2pPort`,
            type: 'duplicate',
            message: `Node ${index} P2P endpoint ${p2pEndpoint} is duplicated within the network`
          });
        } else {
          usedP2pEndpoints.add(p2pEndpoint);
        }

        // Verificar que el puerto P2P no conflicte con el puerto RPC del mismo nodo
        if (p2pPort === node.rpcPort) {
          errors.push({
            field: `nodes[${index}].p2pPort`,
            type: 'invalid',
            message: `Node ${index} P2P port ${p2pPort} cannot be the same as RPC port`
          });
        }

        // Verificar coherencia del puerto P2P para todos los nodos de la red
        if (usedP2pEndpoints.size > 1 && node.p2pPort === undefined) {
          // Si algunos nodos tienen P2P port personalizado y otros no, advertir
          const customP2pNodes = options.nodes.filter(n => n.p2pPort !== undefined);
          if (customP2pNodes.length > 0) {
            errors.push({
              field: `nodes[${index}].p2pPort`,
              type: 'invalid',
              message: `Node ${index} should specify P2P port explicitly for consistency with other nodes in the network`
            });
          }
        }
      }

      // Validar tipo de nodo
      const validNodeTypes = ['bootnode', 'miner', 'rpc', 'node'];
      if (!validNodeTypes.includes(node.type)) {
        errors.push({
          field: `nodes[${index}].type`,
          type: 'invalid',
          message: `Node ${index} type '${node.type}' is invalid. Valid types: ${validNodeTypes.join(', ')}`
        });
      }
    });

    // Validar initialBalance si está definido
    if (options.initialBalance !== undefined) {
      try {
        const balance = ethers.parseEther(options.initialBalance);
        if (balance <= 0n || balance > ethers.parseEther("1000000000")) {
          errors.push({
            field: 'initialBalance',
            type: 'range',
            message: 'Initial balance should be between 0 and 1,000,000,000 ETH'
          });
        }
      } catch (error) {
        errors.push({
          field: 'initialBalance',
          type: 'format',
          message: 'Initial balance must be a valid ETH amount (e.g., "100", "1000.5")'
        });
      }
    }

    // Validaciones adicionales de coherencia entre nodos
    this.validateNodeCoherence(errors, options);
  }

  /**
   * Valida la coherencia entre todos los nodos de la red
   */
  private validateNodeCoherence(errors: ValidationError[], options: BesuNetworkCreateOptions): void {
    const nodes = options.nodes;
    
    // Verificar distribución coherente de IPs
    const ips = nodes.map(node => node.ip);
    const subnet = this.config.subnet;
    const [baseNetwork, maskBits] = subnet.split('/');
    const baseParts = baseNetwork.split('.');
    const basePrefix = `${baseParts[0]}.${baseParts[1]}.${baseParts[2]}`;
    
    // Verificar que todas las IPs estén en el mismo segmento base
    const ipSegments = ips.map(ip => {
      const parts = ip.split('.');
      return `${parts[0]}.${parts[1]}.${parts[2]}`;
    });
    
    const uniqueSegments = new Set(ipSegments);
    if (uniqueSegments.size > 1) {
      errors.push({
        field: 'nodes',
        type: 'invalid',
        message: `All node IPs should be in the same network segment. Found segments: ${Array.from(uniqueSegments).join(', ')}`
      });
    }

    // Verificar rangos de puertos coherentes
    const rpcPorts = nodes.map(node => node.rpcPort);
    const minRpcPort = Math.min(...rpcPorts);
    const maxRpcPort = Math.max(...rpcPorts);
    
    if (maxRpcPort - minRpcPort > 1000) {
      errors.push({
        field: 'nodes',
        type: 'invalid',
        message: `RPC ports span too wide a range (${minRpcPort}-${maxRpcPort}). Consider using a more compact range for better organization`
      });
    }

    // Verificar que los nodos miner no usen puertos consecutivos (para evitar conflictos)
    const minerNodes = nodes.filter(node => node.type === 'miner');
    if (minerNodes.length > 1) {
      const minerPorts = minerNodes.map(node => node.rpcPort).sort((a, b) => a - b);
      for (let i = 1; i < minerPorts.length; i++) {
        if (minerPorts[i] - minerPorts[i-1] === 1) {
          errors.push({
            field: 'nodes',
            type: 'invalid',
            message: `Miner nodes should not use consecutive RPC ports (${minerPorts[i-1]} and ${minerPorts[i]}) to avoid potential conflicts`
          });
        }
      }
    }

    // Verificar configuración de red balanceada
    const nodeTypes = nodes.reduce((acc, node) => {
      acc[node.type] = (acc[node.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalNodes = nodes.length;
    const bootnodeCount = nodeTypes.bootnode || 0;
    const minerCount = nodeTypes.miner || 0;
    const rpcCount = nodeTypes.rpc || 0;

    // Para redes grandes, recomendar arquitectura balanceada
    if (totalNodes > 10) {
      const bootnodeRatio = bootnodeCount / totalNodes;
      const minerRatio = minerCount / totalNodes;
      
      if (bootnodeRatio > 0.5) {
        errors.push({
          field: 'nodes',
          type: 'invalid',
          message: `Too many bootnodes relative to total nodes (${bootnodeCount}/${totalNodes}). Consider reducing bootnodes or adding more functional nodes`
        });
      }

      if (minerRatio > 0.6) {
        errors.push({
          field: 'nodes',
          type: 'invalid',
          message: `Too many miners relative to total nodes (${minerCount}/${totalNodes}). Consider adding RPC or validator nodes for better balance`
        });
      }

      if (rpcCount === 0 && totalNodes > 20) {
        errors.push({
          field: 'nodes',
          type: 'invalid',
          message: 'Large networks (>20 nodes) should include dedicated RPC nodes for better client connectivity'
        });
      }
    }

    // Verificar naming conventions coherentes
    const nodeNames = nodes.map(node => node.name);
    const hasSequentialNaming = this.hasSequentialNaming(nodeNames);
    const hasTypeBasedNaming = this.hasTypeBasedNaming(nodes);
    
    if (!hasSequentialNaming && !hasTypeBasedNaming && totalNodes > 5) {
      errors.push({
        field: 'nodes',
        type: 'invalid',
        message: 'For networks with more than 5 nodes, consider using consistent naming conventions (e.g., node1, node2... or bootnode1, miner1, rpc1...)'
      });
    }
  }

  /**
   * Verifica si los nombres de nodos siguen una convención secuencial
   */
  private hasSequentialNaming(nodeNames: string[]): boolean {
    const sequentialPattern = /^(node|nodo)(\d+)$/i;
    const sequentialNodes = nodeNames.filter(name => sequentialPattern.test(name));
    return sequentialNodes.length > nodeNames.length * 0.7; // 70% o más siguen el patrón
  }

  /**
   * Verifica si los nombres de nodos siguen una convención basada en tipo
   */
  private hasTypeBasedNaming(nodes: BesuNodeDefinition[]): boolean {
    let typeBasedCount = 0;
    
    for (const node of nodes) {
      const namePattern = new RegExp(`^${node.type}\\d*$`, 'i');
      if (namePattern.test(node.name)) {
        typeBasedCount++;
      }
    }
    
    return typeBasedCount > nodes.length * 0.7; // 70% o más siguen el patrón basado en tipo
  }

  // Métodos auxiliares de validación
  private isValidSubnet(subnet: string): boolean {
    const subnetRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    if (!subnetRegex.test(subnet)) return false;

    const [network, mask] = subnet.split('/');
    const maskNum = parseInt(mask);
    if (maskNum < 8 || maskNum > 30) return false;

    const parts = network.split('.').map(Number);
    return parts.every(part => part >= 0 && part <= 255);
  }

  private isValidIpAddress(ip: string): boolean {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) return false;

    const parts = ip.split('.').map(Number);
    return parts.every(part => part >= 0 && part <= 255);
  }

  private isValidEthereumAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  private isValidWeiAmount(weiAmount: string): boolean {
    try {
      const amount = BigInt(weiAmount);
      return amount > 0n;
    } catch (error) {
      return false;
    }
  }

  private isReasonableWeiAmount(weiAmount: string): boolean {
    try {
      const amount = BigInt(weiAmount);
      const maxReasonable = BigInt("1000000000000000000000000"); // 1,000,000 ETH in wei (10^6 * 10^18)
      return amount > 0n && amount <= maxReasonable;
    } catch (error) {
      return false;
    }
  }

  private isIpInSubnet(ip: string, subnet: string): boolean {
    try {
      const [network, maskBits] = subnet.split('/');
      const mask = parseInt(maskBits);
      
      const ipNum = this.ipToNumber(ip);
      const networkNum = this.ipToNumber(network);
      const subnetMask = (0xFFFFFFFF << (32 - mask)) >>> 0;
      
      return (ipNum & subnetMask) === (networkNum & subnetMask);
    } catch (error) {
      return false;
    }
  }

  private ipToNumber(ip: string): number {
    const parts = ip.split('.').map(Number);
    return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
  }

  private isChainIdInUse(chainId: number): boolean {
    try {
      // Obtener lista de redes Docker con etiqueta "type=besu"
      const networks = executeCommand('docker network ls --filter "label=type=besu" --format "{{.Name}}"').trim().split('\n');
      
      for (const network of networks) {
        if (network && network !== this.config.name) {
          try {
            // Intentar leer el archivo genesis.json de cada red
            const networkPath = path.join("./networks", network, "genesis.json");
            if (fs.existsSync(networkPath)) {
              const genesis = JSON.parse(fs.readFileSync(networkPath, 'utf-8'));
              if (genesis.config && genesis.config.chainId === chainId) {
                return true;
              }
            }
          } catch (error) {
            // Continuar con la siguiente red si hay error leyendo
            continue;
          }
        }
      }
      return false;
    } catch (error) {
      // Si no se puede verificar, asumir que no está en uso
      return false;
    }
  }

  /**
   * Crea la red Besu completa con nodos definidos de manera flexible
   */
  async create(options: BesuNetworkCreateOptions): Promise<void> {
    // Validar configuración antes de crear
    const validation = this.validateNetworkConfiguration(options);
    if (!validation.isValid) {
      const errorMessages = validation.errors.map(error => 
        `${error.field}: ${error.message}`
      ).join('\n');
      throw new Error(`Network configuration validation failed:\n${errorMessages}`);
    }

    console.log(`Creating Besu network: ${this.config.name}`);

    // Step 1: Create directories
    this.fileService.createFolder("");

    // Step 2: Handle subnet conflicts if auto-resolve is enabled
    let subnet = this.config.subnet;
    let updatedNodes = options.nodes;
    
    if (options.autoResolveSubnetConflicts !== false) {
      if (!isSubnetAvailable(subnet)) {
        console.log(`⚠️  Subnet ${subnet} is not available, finding alternative...`);
        subnet = this.findAvailableSubnet(subnet);
        console.log(`✅ Using alternative subnet: ${subnet}`);
        
        // Update the config with the new subnet
        this.config = { ...this.config, subnet };
        
        // Update IP addresses to match new subnet
        updatedNodes = this.updateNodesIpsForNewSubnet(updatedNodes, subnet);
        
        console.log(`📍 Updated IPs for new subnet: ${subnet}`);
      }
    }

    // Step 3: Create Docker network
    this.dockerManager.createNetwork(subnet, {
      network: this.config.name,
      type: "besu",
    });

    // Step 4: Create nodes
    console.log(`📦 Creating ${updatedNodes.length} nodes...`);
    
    for (const nodeDef of updatedNodes) {
      const nodeConfig: BesuNodeConfig = {
        name: nodeDef.name,
        ip: nodeDef.ip,
        port: nodeDef.p2pPort || 30303,
        rpcPort: nodeDef.rpcPort,
        type: nodeDef.type,
      };
      
      const node = new BesuNode(nodeConfig, this.fileService);
      this.nodes.set(nodeDef.name, node);
      
      console.log(`✅ Created ${nodeDef.type} node: ${nodeDef.name} (${nodeDef.ip}:${nodeDef.rpcPort})`);
    }

    // Step 5: Generate genesis file
    const minerNode = this.findMinerNode();
    if (!minerNode) {
      throw new Error('No miner node found. At least one miner node is required.');
    }
    
    // Convert initialBalance from ETH to Wei if provided
    let initialBalanceWei = "1000000000000000000000000000000"; // Default: 1,000,000,000,000 ETH (1 trillion ETH) for miner in Wei
    if (options.initialBalance) {
      initialBalanceWei = ethers.parseEther(options.initialBalance).toString();
    }
    
    const genesis = this.generateGenesis(
      minerNode.getKeys().address, 
      initialBalanceWei
    );
    this.fileService.createFile('', 'genesis.json', JSON.stringify(genesis, null, 2));

    // Step 6: Generate config files for each node
    const bootnodeNodes = this.getNodesByType('bootnode');
    const bootnodeEnodes = bootnodeNodes.map(node => node.getKeys().enode);
    
    for (const [nodeName, node] of this.nodes) {
      const tomlConfig = node.generateTomlConfig(
        this.config, 
        node.getConfig().type === 'bootnode' ? undefined : bootnodeEnodes
      );
      this.fileService.createFile('', `${nodeName}_config.toml`, tomlConfig);
    }

    console.log(`✅ Besu network ${this.config.name} created successfully`);
    this.logNetworkSummary();
  }

  /**
   * Inicia todos los nodos de la red
   * @param besuImage Imagen de Docker de Besu a usar
   * @param options Opciones para el inicio de la red
   */
  async start(
    besuImage: string = "hyperledger/besu:latest", 
    options: { 
      autoCreateNetwork?: boolean;
      failIfNetworkNotFound?: boolean;
    } = {}
  ): Promise<void> {
    const { 
      autoCreateNetwork = true, 
      failIfNetworkNotFound = false 
    } = options;
    
    console.log(`Starting Besu network: ${this.config.name}`);

    // Remove existing containers
    this.dockerManager.removeContainers();

    // Check if Docker network exists
    if (!this.dockerManager.networkExists()) {
      if (failIfNetworkNotFound) {
        throw new Error(`Docker network '${this.config.name}' not found. Network must be created before starting.`);
      }
      
      if (autoCreateNetwork) {
        console.log(`🔧 Docker network ${this.config.name} doesn't exist, creating it...`);
        try {
          this.dockerManager.createNetwork(this.config.subnet, {
            network: this.config.name,
            type: "besu",
          });
        } catch (error) {
          console.log(`⚠️ Error creating network, attempting to resolve conflicts...`);
          // If creation fails due to conflicts, try to resolve them
          this.dockerManager.createNetwork(this.config.subnet, {
            network: this.config.name,
            type: "besu",
          });
        }
      } else {
        throw new Error(`Docker network '${this.config.name}' not found and autoCreateNetwork is disabled.`);
      }
    }

    const dataPath = path.resolve(this.fileService.folder);

    // Start nodes in order: bootnode, miner, then RPC and other nodes
    const bootnodes = this.getNodesByType('bootnode');
    const miners = this.getNodesByType('miner');  
    const rpcNodes = this.getNodesByType('rpc');
    const otherNodes = this.getNodesByType('node');
    
    const nodeOrder = [
      ...bootnodes.map(n => n.getConfig().name),
      ...miners.map(n => n.getConfig().name),
      ...rpcNodes.map(n => n.getConfig().name),
      ...otherNodes.map(n => n.getConfig().name)
    ];

    for (const nodeName of nodeOrder) {
      const node = this.nodes.get(nodeName);
      if (!node) continue;

      const nodeConfig = node.getConfig();
      const containerConfig: DockerContainerConfig = {
        name: `${this.config.name}-${nodeName}`,
        image: besuImage,
        network: this.config.name,
        ip: nodeConfig.ip,
        ports: [`${nodeConfig.rpcPort + 10000}:${nodeConfig.rpcPort}`], // External port mapping
        volumes: [`${dataPath}:/data`],
        labels: {
          network: this.config.name,
          nodo: nodeName,
          port: nodeConfig.rpcPort.toString(),
        },
      };

      // Add Besu arguments
      const besuArgs = [
        `--config-file=/data/${nodeName}_config.toml`,
        `--data-path=/data/${nodeName}/data`,
        `--node-private-key-file=/data/${nodeName}/key.priv`,
        `--genesis-file=/data/genesis.json`,
      ];

      const command = `docker run -d \
                --name ${containerConfig.name} \
                --label network=${this.config.name} \
                --label nodo=${nodeName} \
                --label port=${nodeConfig.rpcPort} \
                --ip ${containerConfig.ip} \
                --network ${containerConfig.network} \
                -p ${nodeConfig.rpcPort + 10000}:${nodeConfig.rpcPort} \
                -v ${dataPath}:/data \
                ${besuImage} \
                ${besuArgs.join(" ")}`;

      executeCommand(command);
      console.log(`✅ Started ${nodeName} node`);

      // Wait a bit between node starts
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    console.log(`✅ All nodes started for network ${this.config.name}`);
  }

  /**
   * Detiene todos los nodos de la red
   */
  async stop(): Promise<void> {
    console.log(`Stopping Besu network: ${this.config.name}`);
    this.dockerManager.removeContainers();
    console.log(`✅ Stopped all nodes for network ${this.config.name}`);
  }

  /**
   * Elimina completamente la red (contenedores, red Docker y archivos)
   */
  async destroy(): Promise<void> {
    console.log(`Destroying Besu network: ${this.config.name}`);
    this.dockerManager.removeContainers();
    this.dockerManager.removeNetwork();
    this.fileService.removeFolder("");
    console.log(`✅ Destroyed network ${this.config.name}`);
  }

  /**
   * Transfiere fondos desde el miner a las cuentas derivadas de un mnemonic
   * Incluye verificación de balance y manejo robusto de errores
   */
  async fundMnemonic(
    mnemonic: string,
    amountPerAccount: string,
    accountCount: number = 10,
    rpcUrl?: string
  ): Promise<void> {
    const url = rpcUrl || `http://localhost:${this.getMinerRpcPort() + 10000}`;
    
    // Obtener el nodo miner y leer su clave privada
    const minerNode = this.getMinerNode();
    if (!minerNode) {
      throw new Error('No miner node found in the network');
    }
    
    const rawPrivateKey = this.fileService.readFile(minerNode.getConfig().name, "key.priv");
    // Asegurar que la clave privada tenga el prefijo 0x para ethers.js
    const minerPrivateKey = rawPrivateKey.startsWith('0x') ? rawPrivateKey : `0x${rawPrivateKey}`;

    const accounts = this.deriveAccountsFromMnemonic(mnemonic, accountCount);
    console.log(`Funding ${accountCount} accounts from mnemonic...`);

    const provider = new ethers.JsonRpcProvider(url);
    const wallet = new ethers.Wallet(minerPrivateKey, provider);

    // Verificar balance del miner antes de proceder
    const minerBalance = await provider.getBalance(wallet.address);
    const totalRequired = ethers.parseEther(amountPerAccount) * BigInt(accountCount);
    const gasEstimate = BigInt(21000) * BigInt(accountCount) * ethers.parseUnits('20', 'gwei'); // Estimación conservadora de gas
    const totalRequiredWithGas = totalRequired + gasEstimate;
    
    console.log(`Miner balance: ${ethers.formatEther(minerBalance)} ETH`);
    console.log(`Required for funding: ${ethers.formatEther(totalRequired)} ETH`);
    console.log(`Estimated gas costs: ${ethers.formatEther(gasEstimate)} ETH`);
    
    if (minerBalance < totalRequiredWithGas) {
      throw new Error(`Insufficient miner balance. Required: ${ethers.formatEther(totalRequiredWithGas)} ETH, Available: ${ethers.formatEther(minerBalance)} ETH`);
    }

    // Obtener gas price dinámicamente
    let gasPrice: bigint;
    try {
      const feeData = await provider.getFeeData();
      gasPrice = feeData.gasPrice || ethers.parseUnits('20', 'gwei');
    } catch {
      gasPrice = ethers.parseUnits('20', 'gwei'); // Fallback
    }

    console.log(`Using gas price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);

    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      try {
        // Verificar balance actual antes de transferir
        const currentBalance = await provider.getBalance(account.address);
        if (currentBalance > ethers.parseEther('0.1')) {
          console.log(`⏭️  Account ${i + 1}: ${account.address} already has balance (${ethers.formatEther(currentBalance)} ETH), skipping`);
          continue;
        }

        const tx = await wallet.sendTransaction({
          to: account.address,
          value: ethers.parseEther(amountPerAccount),
          gasLimit: 21000,
          gasPrice: gasPrice,
        });
        
        console.log(`✅ Funded account ${i + 1}: ${account.address} - TX: ${tx.hash}`);
        
        // Esperar confirmación de la transacción
        await tx.wait();
        console.log(`   ✅ Transaction confirmed for account ${i + 1}`);
        
        // Pequeña pausa entre transacciones para evitar problemas de nonce
        if (i < accounts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`❌ Failed to fund account ${i + 1}: ${account.address}`);
        console.error(`   Error: ${error instanceof Error ? error.message : error}`);
        
        // Si es un error de fondos insuficientes, parar inmediatamente
        if (error instanceof Error && error.message.includes('insufficient funds')) {
          throw new Error(`Funding stopped: ${error.message}`);
        }
      }
    }
  }

  /**
   * Obtiene información de la red
   */
  async getNetworkInfo(rpcUrl?: string): Promise<any> {
    const url = rpcUrl || `http://localhost:${this.getMinerRpcPort() + 10000}`;
    const provider = new ethers.JsonRpcProvider(url);

    const blockNumber = await provider.getBlockNumber();
    const network = await provider.getNetwork();

    return {
      blockNumber,
      chainId: network.chainId,
      name: network.name,
    };
  }

  /**
   * Obtiene el balance de una dirección
   */
  async getBalance(address: string, rpcUrl?: string): Promise<bigint> {
    const url = rpcUrl || `http://localhost:${this.getMinerRpcPort() + 10000}`;
    const provider = new ethers.JsonRpcProvider(url);
    return await provider.getBalance(address);
  }

  /**
   * Obtiene el proveedor RPC para un nodo específico
   */
  getRpcProvider(nodeName: string): ethers.JsonRpcProvider | null {
    const node = this.nodes.get(nodeName);
    if (!node) {
      return null;
    }
    
    const config = node.getConfig();
    const externalPort = config.rpcPort + 10000;
    const rpcUrl = `http://localhost:${externalPort}`;
    
    // Create provider with shorter timeout
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    // Set a shorter polling interval for faster detection
    provider.pollingInterval = 1000; // 1 second instead of default 4 seconds
    
    return provider;
  }

  /**
   * Obtiene la URL RPC de un nodo (accesible desde el host)
   */
  getRpcUrl(nodeName: string): string | null {
    const node = this.nodes.get(nodeName);
    if (!node) {
      return null;
    }
    
    const config = node.getConfig();
    // Usar el puerto externo mapeado para acceso desde el host
    const externalPort = config.rpcPort + 10000;
    return `http://localhost:${externalPort}`;
  }

  /**
   * Verifica si un nodo está activo y responde
   */
  async isNodeActive(nodeName: string): Promise<boolean> {
    try {
      // First check if the port is open
      const node = this.nodes.get(nodeName);
      if (!node) {
        return false;
      }
      
      const config = node.getConfig();
      const externalPort = config.rpcPort + 10000;
      
      // Quick port connectivity check
      const portOpen = await this.isPortOpen('localhost', externalPort, 3000);
      if (!portOpen) {
        return false;
      }
      
      // Then try RPC call with shorter timeout
      const provider = this.getRpcProvider(nodeName);
      if (!provider) {
        return false;
      }
      
      const blockNumber = await provider.getBlockNumber();
      return blockNumber >= 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtiene información de conectividad de todos los nodos
   */
  async getNetworkConnectivity(): Promise<Array<{
    nodeName: string;
    isActive: boolean;
    blockNumber?: number;
    peers?: number;
    error?: string;
  }>> {
    const results = [];
    
    for (const [nodeName, node] of this.nodes) {
      try {
        const provider = this.getRpcProvider(nodeName);
        if (!provider) {
          results.push({
            nodeName,
            isActive: false,
            error: 'No RPC provider available'
          });
          continue;
        }

        const blockNumber = await provider.getBlockNumber();
        
        // Intentar obtener el número de peers (esto puede fallar si no está habilitado)
        let peers = 0;
        try {
          // Usando net_peerCount
          const peerCount = await provider.send('net_peerCount', []);
          peers = parseInt(peerCount, 16);
        } catch (e) {
          // Si no funciona, usar admin_peers si está disponible
          try {
            const adminPeers = await provider.send('admin_peers', []);
            peers = Array.isArray(adminPeers) ? adminPeers.length : 0;
          } catch (e2) {
            // No se pudo obtener información de peers
          }
        }

        results.push({
          nodeName,
          isActive: true,
          blockNumber,
          peers
        });
        
      } catch (error) {
        results.push({
          nodeName,
          isActive: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return results;
  }

  /**
   * Espera a que todos los nodos estén sincronizados en el mismo bloque
   */
  async waitForSynchronization(maxWaitTime: number = 30000, checkInterval: number = 2000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const connectivity = await this.getNetworkConnectivity();
      const activeNodes = connectivity.filter(n => n.isActive && n.blockNumber !== undefined);
      
      if (activeNodes.length === 0) {
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        continue;
      }
      
      // Verificar si todos los nodos activos están en el mismo bloque
      const blockNumbers = activeNodes.map(n => n.blockNumber!);
      const maxBlock = Math.max(...blockNumbers);
      const minBlock = Math.min(...blockNumbers);
      
      // Considerar sincronizados si la diferencia es máximo 1 bloque
      if (maxBlock - minBlock <= 1) {
        return true;
      }
      
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    return false;
  }

  /**
   * Crea una transacción de prueba entre dos direcciones
   */
  async createTestTransaction(
    fromNodeName: string,
    toAddress: string,
    amountEth: string = "0.1"
  ): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
    receipt?: any;
  }> {
    try {
      const provider = this.getRpcProvider(fromNodeName);
      if (!provider) {
        return { success: false, error: 'Provider not available' };
      }

      const fromNode = this.nodes.get(fromNodeName);
      if (!fromNode) {
        return { success: false, error: 'Node not found' };
      }

      // Crear un wallet con la clave privada del nodo
      const keys = fromNode.getKeys();
      // Asegurar que la clave privada tenga el prefijo 0x para ethers.js
      const privateKey = keys.privateKey.startsWith('0x') ? keys.privateKey : `0x${keys.privateKey}`;
      const wallet = new ethers.Wallet(privateKey, provider);

      // Preparar la transacción
      const transaction = {
        to: toAddress,
        value: ethers.parseEther(amountEth),
        gasLimit: 21000,
        gasPrice: ethers.parseUnits('20', 'gwei')
      };

      // Enviar la transacción
      const txResponse = await wallet.sendTransaction(transaction);
      
      // Esperar confirmación
      const receipt = await txResponse.wait();

      return {
        success: true,
        transactionHash: txResponse.hash,
        receipt
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Private helper methods
  private generateGenesis(
    minerAddress: string,
    initialBalance: string = "1000000000000000000000000000000" // Default: 1,000,000,000,000 ETH (1 trillion ETH) for miner in Wei
  ): BesuGenesisConfig {
    // Obtener todas las direcciones de firmantes (signer accounts)
    const signerAddresses = this.getAllSignerAddresses();
    
    // Para Clique, construir extraData con todos los firmantes
    let extraData: string;
    if (this.config.consensus === "clique" && signerAddresses.length > 0) {
      // Formato Clique: 32 bytes de ceros + direcciones de firmantes (sin 0x) + 65 bytes de ceros
      const signersHex = signerAddresses.map(addr => 
        addr.startsWith('0x') ? addr.slice(2) : addr
      ).join('');
      extraData = `0x${'0'.repeat(64)}${signersHex}${'0'.repeat(130)}`;
    } else {
      // Fallback: usar solo la dirección del miner (comportamiento legacy)
      const addressWithoutPrefix = minerAddress.startsWith('0x') ? minerAddress.slice(2) : minerAddress;
      extraData = `0x${'0'.repeat(64)}${addressWithoutPrefix}${'0'.repeat(130)}`;
    }
    
    const genesis: BesuGenesisConfig = {
      config: {
        chainId: this.config.chainId,
        londonBlock: 0,
      },
      extraData,
      gasLimit: this.config.gasLimit,
      difficulty: "0x1",
      alloc: {},
    };

    // Add consensus specific configuration
    if (this.config.consensus === "clique") {
      genesis.config.clique = {
        period: this.config.blockTime || 5,
        epoch: 30000,
      };
    } else if (this.config.consensus === "ibft2") {
      genesis.config.ibft2 = {
        blockperiodseconds: this.config.blockTime || 5,
        epochlength: 30000,
      };
      // Para IBFT2, agregar configuración de validadores
      if (signerAddresses.length > 0) {
        genesis.config.ibft2.validators = signerAddresses.map(addr => 
          addr.startsWith('0x') ? addr : `0x${addr}`
        );
      }
    } else if (this.config.consensus === "qbft") {
      genesis.config.qbft = {
        blockperiodseconds: this.config.blockTime || 5,
        epochlength: 30000,
      };
      // Para QBFT, agregar configuración de validadores
      if (signerAddresses.length > 0) {
        genesis.config.qbft.validators = signerAddresses.map(addr => 
          addr.startsWith('0x') ? addr : `0x${addr}`
        );
      }
    }

    // Track addresses that have been allocated to avoid duplicates
    const allocatedAddresses = new Set<string>();

    // Add signer accounts (new multiple support)
    if (this.config.signerAccounts && this.config.signerAccounts.length > 0) {
      for (const signer of this.config.signerAccounts) {
        const addressWithPrefix = signer.address.startsWith('0x') ? signer.address : `0x${signer.address}`;
        if (!allocatedAddresses.has(addressWithPrefix)) {
          genesis.alloc[addressWithPrefix] = { balance: signer.weiAmount };
          allocatedAddresses.add(addressWithPrefix);
        }
      }
    }

    // Add balance to configured accounts if specified
    if (this.config.accounts && this.config.accounts.length > 0) {
      for (const account of this.config.accounts) {
        if (!allocatedAddresses.has(account.address)) {
          genesis.alloc[account.address] = { balance: account.weiAmount };
          allocatedAddresses.add(account.address);
        }
      }
    }

    // Finalmente, agregar la dirección del miner si no está ya asignada
    const minerAddressWithPrefix = minerAddress.startsWith('0x') ? minerAddress : `0x${minerAddress}`;
    if (!allocatedAddresses.has(minerAddressWithPrefix)) {
      genesis.alloc[minerAddressWithPrefix] = { balance: initialBalance };
    }

    return genesis;
  }

  /**
   * Obtiene todas las direcciones de firmantes configuradas
   */
  private getAllSignerAddresses(): string[] {
    const addresses: string[] = [];
    
    // Agregar signerAccounts si existen
    if (this.config.signerAccounts && this.config.signerAccounts.length > 0) {
      addresses.push(...this.config.signerAccounts.map(signer => signer.address));
    }
    
    // Remover duplicados y retornar
    return [...new Set(addresses)];
  }

  private deriveAccountsFromMnemonic(
    mnemonic: string,
    count: number
  ): Array<{ address: string; privateKey: string }> {
    const accounts: Array<{ address: string; privateKey: string }> = [];
    const basePath = "m/44'/60'/0'/0";

    for (let i = 0; i < count; i++) {
      const hdNode = ethers.HDNodeWallet.fromMnemonic(
        ethers.Mnemonic.fromPhrase(mnemonic),
        `${basePath}/${i}`
      );

      accounts.push({
        address: hdNode.address,
        privateKey: hdNode.privateKey,
      });
    }

    return accounts;
  }

  /**
   * Verifica si un puerto está abierto y accesible
   */
  private async isPortOpen(host: string, port: number, timeout: number = 5000): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new (require('net').Socket)();
      
      socket.setTimeout(timeout);
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.connect(port, host);
    });
  }

  /**
   * Verifica si una IP es reservada dentro de una subnet (red, broadcast, gateway)
   */
  private isReservedIpInSubnet(ip: string, subnet: string): boolean {
    try {
      const [network, maskBits] = subnet.split('/');
      const mask = parseInt(maskBits);
      
      const ipNum = this.ipToNumber(ip);
      const networkNum = this.ipToNumber(network);
      
      // Calcular dirección de red y broadcast
      const subnetMask = (0xFFFFFFFF << (32 - mask)) >>> 0;
      const networkAddress = networkNum & subnetMask;
      const broadcastAddress = networkAddress | (~subnetMask >>> 0);
      
      // IP de red
      if (ipNum === networkAddress) return true;
      
      // IP de broadcast
      if (ipNum === broadcastAddress) return true;
      
      // Gateway típico (primera IP disponible)
      if (ipNum === networkAddress + 1) return true;
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Verifica si un puerto está reservado por el sistema
   */
  private isSystemReservedPort(port: number): boolean {
    // Puertos bien conocidos del sistema que deberían evitarse
    const reservedPorts = [
      22,    // SSH
      25,    // SMTP
      53,    // DNS
      80,    // HTTP
      110,   // POP3
      143,   // IMAP
      443,   // HTTPS
      993,   // IMAPS
      995,   // POP3S
      1433,  // SQL Server
      1521,  // Oracle
      3306,  // MySQL
      3389,  // RDP
      5432,  // PostgreSQL
      5672,  // AMQP
      6379,  // Redis
      8080,  // HTTP alternativo
      9200,  // Elasticsearch
      27017, // MongoDB
    ];
    
    return reservedPorts.includes(port);
  }

  // Private helper methods
  private findAvailableSubnet(originalSubnet: string): string {
    const [baseNetwork, mask] = originalSubnet.split('/');
    
    // Try alternative subnets
    const alternatives = [
      '172.25.0.0',
      '172.26.0.0', 
      '172.27.0.0',
      '10.10.0.0',
      '10.11.0.0',
      '192.168.100.0',
      '192.168.101.0',
      '192.168.102.0'
    ];
    
    for (const alt of alternatives) {
      const testSubnet = `${alt}/${mask}`;
      if (isSubnetAvailable(testSubnet)) {
        return testSubnet;
      }
    }
    
    // If all alternatives fail, generate a random one
    for (let i = 0; i < 10; i++) {
      const randomSecond = Math.floor(Math.random() * 255) + 1;
      const randomThird = Math.floor(Math.random() * 255);
      const testSubnet = `172.${randomSecond}.${randomThird}.0/${mask}`;
      
      if (isSubnetAvailable(testSubnet)) {
        return testSubnet;
      }
    }
    
    throw new Error('Unable to find an available subnet after multiple attempts');
  }

  // Helper methods for the flexible create method
  private updateNodesIpsForNewSubnet(nodes: BesuNodeDefinition[], subnet: string): BesuNodeDefinition[] {
    const [baseNetwork] = subnet.split('/');
    const baseParts = baseNetwork.split('.');
    const basePrefix = `${baseParts[0]}.${baseParts[1]}.${baseParts[2]}`;
    
    return nodes.map((node, index) => ({
      ...node,
      ip: `${basePrefix}.${20 + index}` // Start from .20 and increment
    }));
  }

  private findMinerNode(): BesuNode | null {
    for (const [name, node] of this.nodes) {
      if (node.getConfig().type === 'miner') {
        return node;
      }
    }
    return null;
  }

  private findBootnodeNode(): BesuNode | null {
    for (const [name, node] of this.nodes) {
      if (node.getConfig().type === 'bootnode') {
        return node;
      }
    }
    return null;
  }

  private logNetworkSummary(): void {
    console.log(`\n📋 Network Summary:`);
    console.log(`   Name: ${this.config.name}`);
    console.log(`   Chain ID: ${this.config.chainId}`);
    console.log(`   Subnet: ${this.config.subnet}`);
    console.log(`   Consensus: ${this.config.consensus}`);
    console.log(`   Nodes: ${this.nodes.size}`);
    
    if (this.config.mainIp) {
      console.log(`   Main IP: ${this.config.mainIp}`);
    }
    
    // Show multiple signer accounts if configured (new format)
    if (this.config.signerAccounts && this.config.signerAccounts.length > 0) {
      console.log(`   Signer Accounts: ${this.config.signerAccounts.length} accounts`);
      for (const signer of this.config.signerAccounts) {
        const ethAmount = ethers.formatEther(signer.weiAmount);
        console.log(`     - ${signer.address}: ${ethAmount} ETH`);
      }
    }
    
    // Show other configured accounts
    if (this.config.accounts && this.config.accounts.length > 0) {
      console.log(`   Additional Accounts: ${this.config.accounts.length} accounts`);
      for (const account of this.config.accounts) {
        const ethAmount = ethers.formatEther(account.weiAmount);
        const isDuplicate = this.config.signerAccounts?.some(signer => signer.address === account.address);
        console.log(`     - ${account.address}: ${ethAmount} ETH${isDuplicate ? ' (duplicate - signer account balance takes priority)' : ''}`);
      }
    }
    
    for (const [name, node] of this.nodes) {
      const config = node.getConfig();
      console.log(`     - ${config.type}: ${name} (${config.ip}:${config.rpcPort})`);
    }
  }

  /**
   * Método de conveniencia para crear una red simple con bootnode y miner
   */
  async createSimpleNetwork(options: {
    bootnodeIp?: string;
    minerIp?: string;
    initialBalance?: string;
    autoResolveSubnetConflicts?: boolean;
  } = {}): Promise<void> {
    const defaultNodes: BesuNodeDefinition[] = [
      {
        name: 'bootnode',
        ip: options.bootnodeIp || this.generateNodeIp(0),
        rpcPort: 8545,
        type: 'bootnode'
      },
      {
        name: 'miner',
        ip: options.minerIp || this.generateNodeIp(1),
        rpcPort: 8546,
        type: 'miner'
      }
    ];

    return this.create({
      nodes: defaultNodes,
      initialBalance: options.initialBalance,
      autoResolveSubnetConflicts: options.autoResolveSubnetConflicts
    });
  }

  /**
   * Método de conveniencia para crear una red con múltiples miners
   */
  async createMultiMinerNetwork(options: {
    minerCount: number;
    rpcNodeCount?: number;
    baseIp?: string;
    initialBalance?: string;
    autoResolveSubnetConflicts?: boolean;
  }): Promise<void> {
    const baseIp = options.baseIp || '172.24.0';
    const nodes: BesuNodeDefinition[] = [];
    
    // Add bootnode
    nodes.push({
      name: 'bootnode',
      ip: `${baseIp}.20`,
      rpcPort: 8545,
      type: 'bootnode'
    });

    // Add miners
    for (let i = 0; i < options.minerCount; i++) {
      nodes.push({
        name: `miner${i + 1}`,
        ip: `${baseIp}.${21 + i}`,
        rpcPort: 8546 + i,
        type: 'miner'
      });
    }

    // Add RPC nodes if requested
    const rpcCount = options.rpcNodeCount || 0;
    for (let i = 0; i < rpcCount; i++) {
      nodes.push({
        name: `rpc${i + 1}`,
        ip: `${baseIp}.${30 + i}`,
        rpcPort: 8550 + i,
        type: 'rpc'
      });
    }

    return this.create({
      nodes,
      initialBalance: options.initialBalance,
      autoResolveSubnetConflicts: options.autoResolveSubnetConflicts
    });
  }

  /**
   * Método de conveniencia para crear una red con arquitectura personalizada
   */
  async createCustomNetwork(options: {
    bootnodes?: number;
    miners?: number;
    rpcNodes?: number;
    validators?: number;
    baseIp?: string;
    initialBalance?: string;
    autoResolveSubnetConflicts?: boolean;
  }): Promise<void> {
    const baseIp = options.baseIp || '172.24.0';
    const nodes: BesuNodeDefinition[] = [];
    let ipCounter = 20;

    // Add bootnodes
    const bootnodeCount = options.bootnodes || 1;
    for (let i = 0; i < bootnodeCount; i++) {
      nodes.push({
        name: bootnodeCount === 1 ? 'bootnode' : `bootnode${i + 1}`,
        ip: `${baseIp}.${ipCounter++}`,
        rpcPort: 8545 + i,
        type: 'bootnode'
      });
    }

    // Add miners
    const minerCount = options.miners || 1;
    for (let i = 0; i < minerCount; i++) {
      nodes.push({
        name: minerCount === 1 ? 'miner' : `miner${i + 1}`,
        ip: `${baseIp}.${ipCounter++}`,
        rpcPort: 8546 + i,
        type: 'miner'
      });
    }

    // Add RPC nodes
    const rpcCount = options.rpcNodes || 0;
    for (let i = 0; i < rpcCount; i++) {
      nodes.push({
        name: `rpc${i + 1}`,
        ip: `${baseIp}.${ipCounter++}`,
        rpcPort: 8550 + i,
        type: 'rpc'
      });
    }

    // Add validator nodes (for IBFT2/QBFT)
    const validatorCount = options.validators || 0;
    for (let i = 0; i < validatorCount; i++) {
      nodes.push({
        name: `validator${i + 1}`,
        ip: `${baseIp}.${ipCounter++}`,
        rpcPort: 8560 + i,
        type: 'node'
      });
    }

    return this.create({
      nodes,
      initialBalance: options.initialBalance,
      autoResolveSubnetConflicts: options.autoResolveSubnetConflicts
    });
  }

  /**
   * Método de conveniencia para crear una red escalable con configuración automática
   * Especifica solo la cantidad total de nodos y la distribución se hace automáticamente
   */
  async createScalableNetwork(options: {
    totalNodes: number;
    minerPercentage?: number; // Porcentaje de nodos que serán miners (default: 20%)
    rpcPercentage?: number;   // Porcentaje de nodos que serán RPC (default: 30%)
    baseIp?: string;
    initialBalance?: string;
    autoResolveSubnetConflicts?: boolean;
  }): Promise<void> {
    const baseIp = options.baseIp || '172.24.0';
    const nodes: BesuNodeDefinition[] = [];
    let ipCounter = 20;

    // Configuración automática de distribución
    const minerPerc = options.minerPercentage || 20;
    const rpcPerc = options.rpcPercentage || 30;
    
    const minerCount = Math.max(1, Math.floor(options.totalNodes * minerPerc / 100));
    const rpcCount = Math.floor(options.totalNodes * rpcPerc / 100);
    const bootnodeCount = 1; // Siempre al menos 1 bootnode
    const regularNodeCount = Math.max(0, options.totalNodes - bootnodeCount - minerCount - rpcCount);

    console.log(`🔧 Creating scalable network with ${options.totalNodes} nodes:`);
    console.log(`   - Bootnodes: ${bootnodeCount}`);
    console.log(`   - Miners: ${minerCount}`);
    console.log(`   - RPC nodes: ${rpcCount}`);
    console.log(`   - Regular nodes: ${regularNodeCount}`);

    // Add bootnode
    nodes.push({
      name: 'bootnode',
      ip: `${baseIp}.${ipCounter++}`,
      rpcPort: 8545,
      type: 'bootnode'
    });

    // Add miners
    for (let i = 0; i < minerCount; i++) {
      nodes.push({
        name: minerCount === 1 ? 'miner' : `miner${i + 1}`,
        ip: `${baseIp}.${ipCounter++}`,
        rpcPort: 8546 + i,
        type: 'miner'
      });
    }

    // Add RPC nodes
    for (let i = 0; i < rpcCount; i++) {
      nodes.push({
        name: `rpc${i + 1}`,
        ip: `${baseIp}.${ipCounter++}`,
        rpcPort: 8550 + i,
        type: 'rpc'
      });
    }

    // Add regular nodes
    for (let i = 0; i < regularNodeCount; i++) {
      nodes.push({
        name: `node${i + 1}`,
        ip: `${baseIp}.${ipCounter++}`,
        rpcPort: 8560 + i,
        type: 'node'
      });
    }

    return this.create({
      nodes,
      initialBalance: options.initialBalance,
      autoResolveSubnetConflicts: options.autoResolveSubnetConflicts
    });
  }

  /**
   * Método estático para actualizar nodos de una red existente por nombre
   */
  static async updateNetworkNodesByName(
    networkName: string,
    updates: {
      mainIp?: string;
      nodes?: Array<{
        name: string;
        ip?: string;
        rpcPort?: number;
        p2pPort?: number;
      }>;
      addNodes?: BesuNodeDefinition[];
      removeNodes?: string[];
    },
    options: {
      baseDir?: string;
    } = {}
  ): Promise<void> {
    const { BesuNetworkUpdater } = await import('./update-besu-networks');
    return BesuNetworkUpdater.updateNetworkNodesByName(networkName, updates, options);
  }

  /**
   * Método estático para actualizar las cuentas de una red existente por nombre
   */
  static async updateNetworkAccountsByName(
    networkName: string,
    accounts: Array<{ address: string; weiAmount: string }>,
    options: {
      performTransfers?: boolean;
      rpcUrl?: string;
      confirmTransactions?: boolean;
      baseDir?: string;
    } = {}
  ): Promise<{
    success: boolean;
    configUpdated: boolean;
    transfersExecuted: Array<{
      address: string;
      amount: string;
      transactionHash?: string;
      success: boolean;
      error?: string;
    }>;
  }> {
    const { updateNetworkAccountsByName } = await import('./update-besu-networks');
    return updateNetworkAccountsByName(networkName, accounts, options);
  }

  /**
   * Actualiza la configuración de red (subnet, gasLimit, blockTime)
   */
  async updateNetworkConfig(updates: {
    subnet?: string;
    gasLimit?: string;
    blockTime?: number;
  }): Promise<void> {
    const { updateNetworkConfig } = await import('./update-besu-networks');
    return updateNetworkConfig(this, updates);
  }

  /**
   * Actualiza las cuentas de la red
   */
  async updateNetworkAccounts(
    accounts: Array<{ address: string; weiAmount: string }>,
    options: {
      performTransfers?: boolean;
      rpcUrl?: string;
      confirmTransactions?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    configUpdated: boolean;
    transfersExecuted: Array<{
      address: string;
      amount: string;
      transactionHash?: string;
      success: boolean;
      error?: string;
    }>;
  }> {
    const { updateNetworkAccounts } = await import('./update-besu-networks');
    return updateNetworkAccounts(this, accounts, options);
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS - Funciones de conveniencia para operaciones comunes
// ============================================================================

/**
 * Función de conveniencia para actualizar mainIp de una red
 */
export async function updateMainIp(networkName: string, mainIp: string, baseDir?: string): Promise<void> {
  const { updateMainIp } = await import('./update-besu-networks');
  return updateMainIp(networkName, mainIp, baseDir);
}

/**
 * Función de conveniencia para actualizar configuración específica de nodos
 */
export async function updateNodeConfigs(
  networkName: string, 
  nodeUpdates: Array<{
    name: string;
    ip?: string;
    rpcPort?: number;
    p2pPort?: number;
  }>, 
  baseDir?: string
): Promise<void> {
  const { updateNodeConfigs } = await import('./update-besu-networks');
  return updateNodeConfigs(networkName, nodeUpdates, baseDir);
}

/**
 * Función de conveniencia para añadir nodos a una red
 */
export async function addNodesToNetwork(
  networkName: string,
  newNodes: BesuNodeDefinition[],
  baseDir?: string
): Promise<void> {
  const { addNodesToNetwork } = await import('./update-besu-networks');
  return addNodesToNetwork(networkName, newNodes, baseDir);
}

/**
 * Función de conveniencia para eliminar nodos de una red
 */
export async function removeNodesFromNetwork(
  networkName: string,
  nodeNames: string[],
  baseDir?: string
): Promise<void> {
  const { removeNodesFromNetwork } = await import('./update-besu-networks');
  return removeNodesFromNetwork(networkName, nodeNames, baseDir);
}

// Export everything
export { ethers };
export default BesuNetwork;
