import * as fs from 'fs';
import * as path from 'path';

import { BesuNetworkConfig, BesuNetworkStatus, BesuNodeConfig, BesuNodeStatus, GenesisOptions } from '../models/types';

import { DockerService } from './DockerService';
import { FileSystem } from '../utils/FileSystem';
import { GenesisGenerator } from './GenesisGenerator';
import { KeyGenerator } from './KeyGenerator';
import { Logger } from '../utils/Logger';

/**
 * Clase principal para gestionar una red Besu
 */
export class BesuNetworkManager {
  private config: BesuNetworkConfig;
  private docker: DockerService;
  private logger: Logger;
  private fs: FileSystem;
  private genesisGenerator: GenesisGenerator;
  private keyGenerator: KeyGenerator;
  private networkName: string;
  private dataDir: string;
  private bootnode: string | null = null;

  /**
   * Constructor
   * @param config Configuración de la red
   * @param docker Servicio Docker
   * @param logger Servicio de logging
   * @param fs Servicio de sistema de archivos
   */
  constructor(
    config: BesuNetworkConfig,
    docker: DockerService,
    logger: Logger,
    fs: FileSystem,
    genesisGenerator: GenesisGenerator,
    keyGenerator: KeyGenerator
  ) {
    this.config = config;
    this.docker = docker;
    this.logger = logger;
    this.fs = fs;
    this.genesisGenerator = genesisGenerator;
    this.keyGenerator = keyGenerator;
    this.networkName = `${config.name}`;
    this.dataDir = config.dataDir || path.join(process.cwd(), 'data');
  }

  /**
   * Inicializa la red Besu
   */
  public async initialize(): Promise<void> {
    this.logger.info(`Inicializando red Besu: ${this.config.name}`);
    
    // Crear directorio de datos si no existe
    await this.fs.ensureDir(this.dataDir);
    
    // Generar claves para los nodos si no están configuradas
    if (!this.config.nodes) {
      this.logger.info(`Generando claves para ${this.config.nodeCount} nodos`);
      this.config.nodes = await this.generateNodeConfigs();
    }
    
    // Generar archivo génesis
    const genesisPath = path.join(this.dataDir, 'genesis.json');
    const validatorAddresses = this.config.nodes
      .filter(node => node.isValidator)
      .map(node => node.validatorAddress as string);
    
    const genesisOptions: GenesisOptions = {
      chainId: this.config.chainId,
      consensusProtocol: this.config.consensusProtocol,
      blockPeriod: this.config.blockPeriod,
      validatorAddresses
    };
    
    await this.genesisGenerator.generateGenesisFile(genesisPath, genesisOptions);
    this.logger.info(`Archivo génesis generado en: ${genesisPath}`);
  }

  /**
   * Inicia la red Besu
   */
  public async start(): Promise<void> {
    this.logger.info(`Iniciando red Besu: ${this.config.name}`);
    
    // Crear red Docker
    await this.docker.createNetwork(this.networkName);
    
    // Iniciar el bootnode (primer nodo)
    if (this.config.nodes && this.config.nodes.length > 0) {
      const bootNode = this.config.nodes[0];
      await this.startBootNode(bootNode);
      
      // Iniciar el resto de nodos
      for (let i = 1; i < this.config.nodes.length; i++) {
        await this.startNode(this.config.nodes[i]);
      }
      
      // Esperar a que los nodos estén listos
      await this.waitForNodes();
      
      this.logger.info(`Red Besu iniciada con ${this.config.nodes.length} nodos`);
    } else {
      throw new Error('No hay nodos configurados para iniciar');
    }
  }

  /**
   * Detiene la red Besu
   */
  public async stop(): Promise<void> {
    this.logger.info(`Deteniendo red Besu: ${this.config.name}`);
    
    // Detener todos los contenedores
    if (this.config.nodes) {
      for (const node of this.config.nodes) {
        await this.docker.stopContainer(`besu-${node.name}`);
      }
    }
    
    // Eliminar la red Docker
    await this.docker.removeNetwork(this.networkName);

    // eliminar contenedor Docker

    await this.docker.stopContainer(this.config.name);
    
    this.logger.info(`Red Besu detenida: ${this.config.name}`);
  }

  /**
   * Obtiene el estado actual de la red
   */
  public async getStatus(): Promise<BesuNetworkStatus> {
    const nodes: BesuNodeStatus[] = [];
    
    if (this.config.nodes) {
      for (const nodeConfig of this.config.nodes) {
        const containerName = `besu-${nodeConfig.name}`;
        const containerInfo = await this.docker.getContainerInfo(containerName);
        
        const nodeStatus: BesuNodeStatus = {
          containerId: containerInfo?.id || '',
          name: nodeConfig.name,
          containerStatus: containerInfo?.state || 'unknown',
          ports: {
            rpc: nodeConfig.rpcPort,
            p2p: nodeConfig.p2pPort
          }
        };
        
        // Si el contenedor está en ejecución, obtener información adicional
        if (containerInfo?.state === 'running') {
          try {
            // Obtener número de bloque actual
            const blockNumber = await this.getBlockNumber(nodeConfig.rpcPort);
            nodeStatus.blockNumber = blockNumber;
            
            // Obtener número de peers
            const peerCount = await this.getPeerCount(nodeConfig.rpcPort);
            nodeStatus.peerCount = peerCount;
            
            // Obtener enode URL
            const enodeUrl = await this.getEnodeUrl(nodeConfig.rpcPort);
            nodeStatus.enodeUrl = enodeUrl;
            
            // Obtener dirección IP
            nodeStatus.ipAddress = containerInfo.ipAddress;
          } catch (error) {
            this.logger.error(`Error al obtener estado del nodo ${nodeConfig.name}:`, error);
          }
        }
        
        nodes.push(nodeStatus);
      }
    }
    
    return {
      name: this.config.name,
      networkId: await this.docker.getNetworkId(this.networkName) || '',
      nodes,
      uptime: 0, // TODO: Calcular tiempo de actividad
      lastBlock: nodes.reduce((max, node) => Math.max(max, node.blockNumber || 0), 0)
    };
  }

  /**
   * Genera configuraciones para los nodos
   */
  private async generateNodeConfigs(): Promise<BesuNodeConfig[]> {
    const nodes: BesuNodeConfig[] = [];
    
    for (let i = 0; i < this.config.nodeCount; i++) {
      const nodeName = `node${i}`;
      const nodeDir = path.join(this.dataDir, nodeName);
      
      // Generar clave para el nodo
      await this.fs.ensureDir(nodeDir);
      const { privateKey, publicKey, address } = await this.keyGenerator.generateNodeKeys(nodeDir);
      
      // Crear configuración del nodo
      const nodeConfig: BesuNodeConfig = {
        name: nodeName,
        rpcPort: this.config.baseRpcPort + i,
        p2pPort: this.config.baseP2pPort + i,
        dataDir: nodeDir,
        isValidator: true, // Por defecto, todos los nodos son validadores
        validatorAddress: address,
        privateKey,
        enabledApis: ['ETH', 'NET', 'WEB3', 'ADMIN']
      };
      
      // Si es un protocolo que requiere Clique, añadir API Clique
      if (this.config.consensusProtocol === 'clique') {
        nodeConfig.enabledApis.push('CLIQUE');
      }
      
      nodes.push(nodeConfig);
    }
    
    return nodes;
  }

  /**
   * Inicia el nodo bootnode
   */
  private async startBootNode(nodeConfig: BesuNodeConfig): Promise<void> {
    this.logger.info(`Iniciando bootnode: ${nodeConfig.name}`);
    
    const containerName = `besu-${nodeConfig.name}`;
    const genesisPath = path.join(this.dataDir, 'genesis.json');
    
    // Configurar volúmenes
    const volumes = [
      `${nodeConfig.dataDir}:/data`,
      `${genesisPath}:/genesis.json`
    ];
    
    // Configurar puertos
    const ports = {
      [`${nodeConfig.rpcPort}`]: '8545',
      [`${nodeConfig.p2pPort}`]: '30303'
    };
    
    // Configurar comando
        // Configurar comando
    const command = [
      '--data-path=/data',
      '--genesis-file=/genesis.json',
      '--rpc-http-enabled=true',
      '--rpc-http-host=0.0.0.0',
      '--rpc-http-port=8545',
      '--rpc-http-cors-origins=*',
      '--rpc-http-api=ETH,NET,CLIQUE,WEB3,ADMIN',
      '--p2p-port=30303',
      '--p2p-host=0.0.0.0',
      '--p2p-enabled=true',
      `--network-id=${this.config.chainId}`,
      `--rpc-http-api=${nodeConfig.enabledApis.join(',')}`,
      '--max-peers=25',
      '--discovery-enabled=true',
      '--sync-mode=FULL',
      '--host-allowlist=*',
      `--miner-enabled=${nodeConfig.isValidator}`,
      `--miner-coinbase=${nodeConfig.validatorAddress}`,
      '--logging=INFO'
    ]
    // Añadir opciones adicionales si existen
    if (nodeConfig.additionalOptions) {
      for (const [key, value] of Object.entries(nodeConfig.additionalOptions)) {
        command.push(`--${key}=${value}`);
      }
    }
    
    // Iniciar contenedor
    const res = await this.docker.runContainer({
      name: containerName,
      image: 'hyperledger/besu:latest',
      network: this.networkName,
      volumes,
      ports,
      command
    });
    
    // Esperar a que el nodo esté listo
    await this.waitForNodeReady(nodeConfig);
    
    // Obtener enode URL del bootnode
    this.bootnode = await this.getEnodeUrl(nodeConfig.rpcPort);
    this.logger.info(`Bootnode iniciado con enode: ${this.bootnode}`);
  }

  /**
   * Inicia un nodo regular
   */
  private async startNode(nodeConfig: BesuNodeConfig): Promise<void> {
    this.logger.info(`Iniciando nodo: ${nodeConfig.name}`);
    
    if (!this.bootnode) {
      throw new Error('No se ha iniciado el bootnode');
    }
    
    const containerName = `besu-${nodeConfig.name}`;
    const genesisPath = path.join(this.dataDir, 'genesis.json');
    
    // Configurar volúmenes
    const volumes = [
      `${nodeConfig.dataDir}:/data`,
      `${genesisPath}:/genesis.json`
    ];
    
    // Configurar puertos
    const ports = {
      [`${nodeConfig.rpcPort}`]: '8545',
      [`${nodeConfig.p2pPort}`]: '30303'
    };
    
    // Configurar comando
    const command = [
      '--data-path=/data',
      '--genesis-file=/genesis.json',
      `--rpc-http-enabled=true`,
      `--rpc-http-host=0.0.0.0`,
      `--rpc-http-port=8545`,
      `--rpc-http-cors-origins=*`,
      `--p2p-port=30303`,
      `--network-id=${this.config.chainId}`,
      `--rpc-http-api=${nodeConfig.enabledApis.join(',')}`,
      `--sync-mode=FULL`,
      `--miner-enabled=${nodeConfig.isValidator}`,
      `--miner-coinbase=${nodeConfig.validatorAddress}`,
      `--bootnodes=${this.bootnode}`,
      `--logging=INFO`
    ];
    
    // Añadir opciones adicionales si existen
    if (nodeConfig.additionalOptions) {
      for (const [key, value] of Object.entries(nodeConfig.additionalOptions)) {
        command.push(`--${key}=${value}`);
      }
    }
    
    // Iniciar contenedor
    await this.docker.runContainer({
      name: containerName,
      image: 'hyperledger/besu:latest',
      network: this.networkName,
      volumes,
      ports,
      command
    });
    
    // Esperar a que el nodo esté listo
    await this.waitForNodeReady(nodeConfig);
    
    this.logger.info(`Nodo iniciado: ${nodeConfig.name}`);
  }

  /**
   * Espera a que un nodo esté listo
   */
  private async waitForNodeReady(nodeConfig: BesuNodeConfig): Promise<void> {
    this.logger.info(`Esperando a que el nodo ${nodeConfig.name} esté listo...`);
    
    const maxRetries = 30;
    const retryInterval = 2000;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const blockNumber = await this.getBlockNumber(nodeConfig.rpcPort);
        this.logger.info(`Nodo ${nodeConfig.name} listo, bloque actual: ${blockNumber}`);
        return;
      } catch (error) {
        if (i === maxRetries - 1) {
          throw new Error(`Tiempo de espera agotado para el nodo ${nodeConfig.name}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, retryInterval));
      }
    }
  }

  /**
   * Espera a que todos los nodos estén listos
   */
  private async waitForNodes(): Promise<void> {
    this.logger.info('Esperando a que todos los nodos estén listos...');
    
    if (!this.config.nodes) return;
    
    for (const node of this.config.nodes) {
      const containerName = `besu-${node.name}`;
      const containerInfo = await this.docker.getContainerInfo(containerName);
      
      if (!containerInfo || containerInfo.state !== 'running') {
        throw new Error(`El nodo ${node.name} no está en ejecución`);
      }
    }
    
    this.logger.info('Todos los nodos están en ejecución');
  }

  /**
   * Obtiene el número de bloque actual de un nodo
   */
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
    
    if (data.error) {
      throw new Error(`Error al obtener el número de bloque: ${data.error.message}`);
    }
    
    return parseInt(data.result, 16);
  }

  /**
   * Obtiene el número de peers conectados a un nodo
   */
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
    
    if (data.error) {
      throw new Error(`Error al obtener el número de peers: ${data.error.message}`);
    }
    
    return parseInt(data.result, 16);
  }

  /**
   * Obtiene la URL enode de un nodo
   */
  private async getEnodeUrl(rpcPort: number): Promise<string> {
    // Esperar 5 segundos antes de ejecutar la función
    await new Promise(resolve => setTimeout(resolve, 5000));
    
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
    
    if (data.error) {
      throw new Error(`Error al obtener la información del nodo: ${data.error.message}`);
    }
    
    return data.result.enode;
  }
}