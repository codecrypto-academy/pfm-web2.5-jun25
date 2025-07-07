import * as path from 'path';
import { promises as fs } from 'fs';

import { BesuNodeConfig, BesuNodeType, NodeCreationConfig } from '../models/types';

import { DockerService } from './DockerService';
import { ConfigGenerator } from './ConfigGenerator';
import { IpManager } from './IpManager';
import { FileSystem } from '../utils/FileSystem';
import { Logger } from '../utils/Logger';
import { ethers } from 'ethers';

// Interfaz para el estado de un nodo (solo lo necesario)
interface BesuNodeStatus {
  containerId: string;
  name: string;
  nodeType?: BesuNodeType;
  containerStatus: 'running' | 'stopped' | 'exited' | 'unknown';
  blockNumber?: number;
  peerCount?: number;
  enodeUrl?: string;
  ipAddress?: string;
  ports: {
    rpc: number;
    p2p: number;
  };
  isMining?: boolean;
  isValidating?: boolean;
  isBootnode?: boolean;
}

export class BesuNodeManager {
  private docker: DockerService;
  private logger: Logger;
  private fs: FileSystem;
  private configGenerator: ConfigGenerator;
  private ipManager: IpManager;
  private dataDir: string;

  constructor(
    docker: DockerService,
    logger: Logger,
    fs: FileSystem,
    dataDir: string
  ) {
    this.docker = docker;
    this.logger = logger;
    this.fs = fs;
    this.configGenerator = new ConfigGenerator(logger, fs);
    this.ipManager = new IpManager(fs, logger, docker, dataDir);
    this.dataDir = dataDir;
  }

  public async createNode(nodeConfig: NodeCreationConfig): Promise<BesuNodeConfig> {
    this.logger.info(`Creating a new node: ${nodeConfig.name}`);
    const nodeDir = path.join(this.dataDir, nodeConfig.name);
    await this.fs.ensureDir(nodeDir);

    // Generar claves usando ethers directamente
    const wallet = ethers.Wallet.createRandom();
    const privateKey = wallet.privateKey;
    const address = wallet.address;

    // Guardar la clave privada (sin prefijo 0x para Besu)
    const privateKeyPath = path.join(nodeDir, 'key');
    await this.fs.writeFile(privateKeyPath, privateKey.substring(2));

    // Guardar la dirección
    const addressPath = path.join(nodeDir, 'address');
    await this.fs.writeFile(addressPath, address);

    // Crear configuración del nodo
    const fullNodeConfig: BesuNodeConfig = {
      name: nodeConfig.name,
      nodeType: nodeConfig.nodeType,
      rpcPort: nodeConfig.rpcPort || 0,
      p2pPort: nodeConfig.p2pPort || 0,
      dataDir: path.resolve(nodeDir),
      validatorAddress: address,
      privateKey: privateKey,
      enabledApis: this.getDefaultApis(nodeConfig.nodeType),
      additionalOptions: nodeConfig.additionalOptions || {},
      isValidator: nodeConfig.isValidator,
      isBootnode: nodeConfig.isBootnode,
      linkedTo: nodeConfig.linkedTo
    };

    this.logger.info(`Node ${nodeConfig.name} created successfully.`);
    return fullNodeConfig;
  }

  private getDefaultApis(nodeType: BesuNodeType): string[] {
    const baseApis = ['ETH', 'NET', 'WEB3', 'ADMIN'];
    
    switch (nodeType) {
      case BesuNodeType.SIGNER:
        return [...baseApis, 'CLIQUE', 'DEBUG', 'MINER'];
      case BesuNodeType.MINER:
        return [...baseApis, 'MINER', 'DEBUG'];
      case BesuNodeType.NORMAL:
        return baseApis;
      default:
        return baseApis;
    }
  }

  public async startNode(nodeConfig: BesuNodeConfig, networkName: string, genesisPath: string, bootnodes: string[]): Promise<void> {
    this.logger.info(`Starting node: ${nodeConfig.name}`);
    
    // Create container name with naming convention: {network}-{type}-{name}
    const nodeTypePrefix = nodeConfig.isBootnode ? 'bootnode' : nodeConfig.nodeType;
    const containerName = `${networkName}-${nodeTypePrefix}-${nodeConfig.name}`;

    // Obtener o asignar IP estática para el nodo
    const staticIp = await this.ipManager.getOrAssignStaticIp(nodeConfig.name, networkName);
    this.logger.info(`Using static IP ${staticIp} for node ${nodeConfig.name}`);

    const command = [
      '--config-file=/data/config.toml',
      '--node-private-key-file=/data/key',
      '--genesis-file=/genesis.json',
      '--data-path=/data',
    ];

    if (bootnodes.length > 0) {
      command.push(`--bootnodes=${bootnodes.join(',')}`);
    }

    await this.docker.runContainer({
      name: containerName,
      image: 'hyperledger/besu:latest',
      network: networkName,
      volumes: [`${nodeConfig.dataDir}:/data`, `${genesisPath}:/genesis.json`],
      ports: {
        [nodeConfig.rpcPort.toString()]: '8545',
        [nodeConfig.p2pPort.toString()]: '30303',
      },
      command: command,
      staticIp: staticIp,
    });

    await this.waitForNodeReady(nodeConfig);
    this.logger.info(`Node ${nodeConfig.name} started with static IP ${staticIp}.`);
  }

  public async stopNode(besuNodeName: string): Promise<void> {
    this.logger.info(`Stopping node: ${besuNodeName}`);
    
    // Find the container using both naming conventions
    const containers = await this.docker.listContainers({ all: true });
    let containerName = '';
    
    for (const container of containers) {
      const name = container.Names[0].startsWith('/') ? container.Names[0].substring(1) : container.Names[0];
      const extractedName = this.extractNodeNameFromContainer(name);
      if (extractedName === besuNodeName) {
        containerName = name;
        break;
      }
    }
    
    if (!containerName) {
      throw new Error(`Container for node ${besuNodeName} not found`);
    }
    
    await this.docker.stopContainer(containerName);
    this.logger.info(`Node ${besuNodeName} stopped.`);
  }

  public async deleteNode(besuNodeName: string, networkName: string): Promise<void> {
    this.logger.info(`Deleting node: ${besuNodeName}`);
    
    // Find the container using both naming conventions
    const containers = await this.docker.listContainers({ all: true });
    let containerName = '';
    let containerId = '';
    
    for (const container of containers) {
      const name = container.Names[0].startsWith('/') ? container.Names[0].substring(1) : container.Names[0];
      const extractedName = this.extractNodeNameFromContainer(name);
      if (extractedName === besuNodeName) {
        containerName = name;
        containerId = container.Id;
        break;
      }
    }
    
    if (!containerName) {
      throw new Error(`Container for node ${besuNodeName} not found`);
    }
    
    // Stop the container first
    try {
      await this.docker.stopContainer(containerName);
    } catch (error) {
      this.logger.warn(`Container ${containerName} was already stopped: ${error}`);
    }
    
    // Remove the container
    await this.docker.removeContainer(containerId, true);
    
    // Remove IP mapping
    await this.ipManager.removeIpMapping(besuNodeName, networkName);
    
    // Remove node data directory
    const nodeDataDir = path.join(this.dataDir, containerName);
    try {
      await this.fs.removeDir(nodeDataDir, true);
      this.logger.info(`Node data directory removed: ${nodeDataDir}`);
    } catch (error) {
      this.logger.warn(`Could not remove node data directory ${nodeDataDir}: ${error}`);
    }
    
    this.logger.info(`Node ${besuNodeName} deleted completely.`);
  }

  public async startExistingNode(besuNodeName: string, networkName: string): Promise<void> {
    this.logger.info(`Starting existing node: ${besuNodeName}`);
    
    // Get node status to check if it exists and get configuration
    const nodeStatus = await this.getNodeStatus(besuNodeName);
    if (!nodeStatus) {
      throw new Error(`Node ${besuNodeName} not found`);
    }
    
    if (nodeStatus.containerStatus === 'running') {
      this.logger.info(`Node ${besuNodeName} is already running`);
      return;
    }
    
    // Find the container
    const containers = await this.docker.listContainers({ all: true });
    let containerName = '';
    
    for (const container of containers) {
      const name = container.Names[0].startsWith('/') ? container.Names[0].substring(1) : container.Names[0];
      const extractedName = this.extractNodeNameFromContainer(name);
      if (extractedName === besuNodeName) {
        containerName = name;
        break;
      }
    }
    
    if (!containerName) {
      throw new Error(`Container for node ${besuNodeName} not found`);
    }
    
    // Start the existing container
    try {
      const containers = await this.docker.listContainers({ all: true });
      const containerInfo = containers.find(c => c.Id === nodeStatus.containerId);
      
      if (!containerInfo) {
        throw new Error(`Container ${nodeStatus.containerId} not found`);
      }
      
      if (containerInfo.State === 'running') {
        this.logger.info(`Container for node ${besuNodeName} is already running`);
        return;
      }
      
      // Start the existing container using Docker API
      await this.docker.startContainer(nodeStatus.containerId);
      this.logger.info(`Started existing container: ${containerName}`);
    } catch (error) {
      this.logger.error(`Error starting existing container: ${error}`);
      throw error;
    }
    
    this.logger.info(`Node ${besuNodeName} started.`);
  }

  public async restartNode(besuNodeName: string, networkName: string): Promise<void> {
    this.logger.info(`Restarting node: ${besuNodeName}`);
    
    try {
      // Stop the node first (this will only stop, not remove the container)
      await this.stopNode(besuNodeName);
      
      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Start the existing node (this will reuse the existing container)
      await this.startExistingNode(besuNodeName, networkName);
      
    } catch (error) {
      this.logger.error(`Error restarting node ${besuNodeName}:`, error);
      throw error;
    }
  }

  public async getNodeStatus(besuNodeName: string): Promise<BesuNodeStatus | null> {
    // Try to find container with either naming convention
    let containerInfo = await this.docker.getContainerInfo(`besu-${besuNodeName}`);
    
    // If not found with old convention, try to find with new convention
    if (!containerInfo) {
      const containers = await this.docker.listContainers({ all: true });
      for (const container of containers) {
        const containerName = container.Names[0];
        const extractedName = this.extractNodeNameFromContainer(containerName);
        if (extractedName === besuNodeName) {
          containerInfo = await this.docker.getContainerInfo(containerName.startsWith('/') ? containerName.substring(1) : containerName);
          break;
        }
      }
    }

    if (!containerInfo) {
      return null;
    }

    // Obtener el puerto RPC del contenedor (puerto del host mapeado)
    let rpcPort = 8545; // Puerto por defecto
    if (containerInfo.ports && containerInfo.ports['8545/tcp']) {
      rpcPort = parseInt(containerInfo.ports['8545/tcp'], 10);
    }

    // Obtener el puerto P2P del contenedor (puerto del host mapeado)
    let p2pPort = 30303; // Puerto por defecto
    if (containerInfo.ports && containerInfo.ports['30303/tcp']) {
      p2pPort = parseInt(containerInfo.ports['30303/tcp'], 10);
    }

    // Extract node information from container name using naming convention
    const nodeInfo = this.parseNodeInfoFromContainerName(containerInfo.name);
    
    const nodeStatus: BesuNodeStatus = {
      containerId: containerInfo.id,
      name: besuNodeName,
      nodeType: nodeInfo.nodeType,
      containerStatus: containerInfo.state,
      ports: { rpc: rpcPort, p2p: p2pPort },
      isMining: false,
      isValidating: false,
      isBootnode: nodeInfo.isBootnode,
    };

    // Solo intentar obtener información adicional si el contenedor está corriendo
    if (containerInfo.state === 'running') {
      // Retry mechanism for node status verification
      const maxRetries = 5;
      const retryDelay = 5000; // 5 seconds
      let lastError: any = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const blockNumber = await this.getBlockNumber(rpcPort);
          nodeStatus.blockNumber = blockNumber;

          const peerCount = await this.getPeerCount(rpcPort);
          nodeStatus.peerCount = peerCount;

          nodeStatus.ipAddress = containerInfo.ipAddress;

          // Try to get enode URL, but don't fail if P2P is not ready yet
          try {
            const enodeUrl = await this.getEnodeUrl(besuNodeName, containerInfo);
            nodeStatus.enodeUrl = enodeUrl;
          } catch (enodeError) {
            this.logger.warn(`Could not get enode URL for node ${besuNodeName}: ${enodeError}`);
            nodeStatus.enodeUrl = 'P2P network initializing...';
          }
          
          // If we reach here, the node status was successfully retrieved
          break;
        } catch (error) {
          lastError = error;
          this.logger.warn(`Attempt ${attempt}/${maxRetries} failed to get status for node ${besuNodeName}: ${error}`);
          
          if (attempt < maxRetries) {
            this.logger.info(`Retrying in ${retryDelay / 1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          } else {
            this.logger.error(`All ${maxRetries} attempts failed to get status for node ${besuNodeName}:`, lastError);
          }
        }
      }
    } else {
      // Para contenedores que no están corriendo, establecer valores por defecto
      this.logger.info(`Container ${besuNodeName} is not running (${containerInfo.state}), skipping RPC calls`);
      nodeStatus.blockNumber = undefined;
      nodeStatus.peerCount = undefined;
      nodeStatus.enodeUrl = undefined;
      nodeStatus.ipAddress = containerInfo.ipAddress;
    }

    return nodeStatus;
  }

  public async getAllNodesStatus(): Promise<BesuNodeStatus[]> {
    const containers = await this.docker.listContainers({ all: true });
    const nodes: BesuNodeStatus[] = [];
    for (const container of containers) {
      const containerName = container.Names[0];
      // Check for both naming conventions: besu- and {network}-{type}-{name}
      if (containerName.startsWith('/besu-') || this.isBesuContainer(containerName)) {
        const besuNodeName = this.extractNodeNameFromContainer(containerName);
        const status = await this.getNodeStatus(besuNodeName);
        if (status) {
          nodes.push(status);
        }
      }
    }
    return nodes;
  }

  /**
   * Check if container is a Besu container based on naming conventions
   */
  private isBesuContainer(containerName: string): boolean {
    const cleanName = containerName.startsWith('/') ? containerName.substring(1) : containerName;
    // Check for {network}-{type}-{name} format where type could be bootnode, signer, miner, or normal
    const parts = cleanName.split('-');
    if (parts.length >= 3) {
      const typePrefix = parts[1];
      return ['bootnode', 'signer', 'miner', 'normal'].includes(typePrefix);
    }
    return false;
  }

  /**
   * Parse node information from container name using naming convention
   * Supports formats: besu-{name} and {network}-{type}-{name}
   */
  private parseNodeInfoFromContainerName(containerName: string): { nodeType: BesuNodeType; isBootnode: boolean } {
    // Remove leading slash if present
    const cleanName = containerName.startsWith('/') ? containerName.substring(1) : containerName;
    
    // Check for new naming convention: {network}-{type}-{name}
    const parts = cleanName.split('-');
    if (parts.length >= 3 && ['bootnode', 'signer', 'miner', 'normal'].includes(parts[1])) {
      const typePrefix = parts[1];
      
      if (typePrefix === 'bootnode') {
        return { nodeType: BesuNodeType.SIGNER, isBootnode: true };
      }
      
      if (typePrefix === 'signer') {
        return { nodeType: BesuNodeType.SIGNER, isBootnode: false };
      }
      
      if (typePrefix === 'miner') {
        return { nodeType: BesuNodeType.MINER, isBootnode: false };
      }
      
      return { nodeType: BesuNodeType.NORMAL, isBootnode: false };
    }
    
    // Fallback to old naming convention: besu-{name}
    // Check if name contains 'bootnode'
    if (cleanName.includes('bootnode')) {
      return { nodeType: BesuNodeType.SIGNER, isBootnode: true };
    }
    
    // Check for other node types
    if (cleanName.includes('signer')) {
      return { nodeType: BesuNodeType.SIGNER, isBootnode: false };
    }
    
    if (cleanName.includes('miner')) {
      return { nodeType: BesuNodeType.MINER, isBootnode: false };
    }
    
    return { nodeType: BesuNodeType.NORMAL, isBootnode: false };
  }
  

  
  /**
   * Extract node name from container name
   * Supports formats: besu-{name} and {network}-{type}-{name}
   */
  private extractNodeNameFromContainer(containerName: string): string {
    const cleanName = containerName.startsWith('/') ? containerName.substring(1) : containerName;
    
    // For new naming convention: {network}-{type}-{name}
    const parts = cleanName.split('-');
    if (parts.length >= 3 && ['bootnode', 'signer', 'miner', 'normal'].includes(parts[1])) {
      // Extract the name part (everything after {network}-{type}-)
      return parts.slice(2).join('-');
    }
    
    // For besu naming convention: besu-{name}
    if (cleanName.startsWith('besu-')) {
      return cleanName.replace('besu-', '');
    }
    
    return cleanName;
  }

  private async waitForNodeReady(nodeConfig: BesuNodeConfig): Promise<void> {
    this.logger.info(`Waiting for node ${nodeConfig.name} to be ready...`);
    const maxRetries = 30;
    const retryInterval = 5000;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const blockNumber = await this.getBlockNumber(nodeConfig.rpcPort);
        if (blockNumber >= 0) {
          this.logger.info(`Node ${nodeConfig.name} is ready at block ${blockNumber}.`);
          return;
        }
      } catch (error) {
        this.logger.debug(`Attempt ${i + 1} to check node readiness failed: ${error}`);
      }
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }
    throw new Error(`Node ${nodeConfig.name} did not become ready in time.`);
  }

  private async getBlockNumber(rpcPort: number): Promise<number> {
    const response = await fetch(`http://localhost:${rpcPort}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      })
    });

    const data = await response.json();
    const result = data as { result?: any; error?: { message: string } };
    if (result.error) {
      throw new Error(`Error getting block number: ${result.error.message}`);
    }
    return parseInt(result.result, 16);
  }

  private async getPeerCount(rpcPort: number): Promise<number> {
    const response = await fetch(`http://localhost:${rpcPort}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'net_peerCount',
        params: [],
        id: 1
      })
    });

    const data = await response.json();
    const result = data as { result?: any; error?: { message: string } };
    if (result.error) {
      throw new Error(`Error getting peer count: ${result.error.message}`);
    }
    return parseInt(result.result, 16);
  }

  private async getEnodeUrl(besuNodeName: string, containerInfo: any): Promise<string> {
    // Obtener el puerto RPC del contenedor (puerto del host mapeado)
    let rpcPort = 8545; // Puerto por defecto
    
    this.logger.info(`Container info for ${besuNodeName}:`, JSON.stringify(containerInfo, null, 2));
    
    if (containerInfo.ports && containerInfo.ports['8545/tcp']) {
      const portValue = containerInfo.ports['8545/tcp'];
      this.logger.info(`Raw port value for 8545/tcp: ${portValue} (type: ${typeof portValue})`);
      rpcPort = parseInt(portValue, 10);
    }

    this.logger.info(`Getting enode URL for node ${besuNodeName} using RPC port ${rpcPort}`);

    const response = await fetch(`http://localhost:${rpcPort}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'admin_nodeInfo',
        params: [],
        id: 1
      })
    });

    const data = await response.json();
    const result = data as { result?: { enode: string }; error?: { message: string } };
    if (result.error) {
      throw new Error(`Error getting node info: ${result.error.message}`);
    }
    if (!result.result || !result.result.enode) {
      throw new Error('Could not get enode from node');
    }
    
    let enodeUrl = result.result.enode;
    this.logger.info(`Original enode URL: ${enodeUrl}`);
    
    // Reemplazar 0.0.0.0 con la IP real del contenedor si está disponible
    if (containerInfo.ipAddress && enodeUrl.includes('@0.0.0.0:')) {
      enodeUrl = enodeUrl.replace('@0.0.0.0:', `@${containerInfo.ipAddress}:`);
      this.logger.info(`Enode URL with real container IP: ${enodeUrl}`);
    }
    
    return enodeUrl;
  }
}