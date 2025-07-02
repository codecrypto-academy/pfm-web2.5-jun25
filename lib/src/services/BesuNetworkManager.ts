import * as fs from 'fs';
import * as path from 'path';

import { BesuNetworkConfig, BesuNetworkStatus, BesuNodeConfig, BesuNodeStatus, GenesisOptions } from '../models/types';

import { ConfigGenerator } from './ConfigGenerator';
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
  private configGenerator: ConfigGenerator;
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
    keyGenerator: KeyGenerator,
    configGenerator: ConfigGenerator
  ) {
    this.config = config;
    this.docker = docker;
    this.logger = logger;
    this.fs = fs;
    this.genesisGenerator = genesisGenerator;
    this.keyGenerator = keyGenerator;
    this.configGenerator = configGenerator;
    this.networkName = `${config.name}`;
    this.dataDir = config.dataDir || path.join(process.cwd(), 'data');
  }

  /**
   * Inicializa la red Besu
   * @param nuevo Si es true, borra todo rastro del nodo anterior; si es false, reutiliza el nodo anterior
   */
  public async initialize(nuevo: boolean = false): Promise<void> {
    this.logger.info(`Inicializando red Besu: ${this.config.name}`);
    
    if (nuevo) {
      this.logger.info('El parámetro `nuevo` es true, se procederá a limpiar la red.');
      // Detener todos los nodos y redes antes de borrar datos
      await this.stop();
      this.logger.info('Contenedores y red detenidos.');

      if (fs.existsSync(this.dataDir)) {
        this.logger.info(`Directorio de datos encontrado en: ${this.dataDir}. Intentando borrar...`);
        try {
          // Borrado recursivo para evitar ENOTEMPTY
          fs.rmSync(this.dataDir, { recursive: true, force: true });
          this.logger.info('Directorio de datos borrado con éxito.');
        } catch (error) {
          this.logger.error('Error al borrar el directorio de datos:', error);
          throw new Error('No se pudo borrar el directorio de datos anterior. Verifique los permisos.');
        }
      } else {
        this.logger.info('No se encontró un directorio de datos anterior. No se requiere limpieza.');
      }
    }
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
    
    this.logger.info(`Configurando red con ${validatorAddresses.length} validadores:`);
    validatorAddresses.forEach((addr, index) => {
      this.logger.info(`  Validador ${index + 1}: ${addr}`);
    });
    
    await this.genesisGenerator.generateGenesisFile(genesisPath, genesisOptions);
    this.logger.info(`Archivo génesis generado en: ${genesisPath}`);
    this.logger.info(`Protocolo de consenso: ${this.config.consensusProtocol}, Período de bloque: ${this.config.blockPeriod}s`);
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
      
      // Generar archivo de configuración solo para el bootnode
      await this.generateBootnodeConfigFile();
      
      await this.startBootNode(bootNode);
      
      // Generar archivos config.toml para los demás nodos con el enode real
      await this.generateNodesConfigFiles();
      
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
      
      // Por defecto, todos los nodos son validadores en redes pequeñas
      const isValidator = true;
      this.logger.info(`Nodo ${nodeName} configurado:`);
      this.logger.info(`  Dirección: ${address}`);
      this.logger.info(`  Es validador: ${isValidator ? 'SÍ' : 'NO'}`);
      this.logger.info(`  Directorio: ${nodeDir}`);
      this.logger.info(`  Puerto RPC: ${this.config.baseRpcPort + i}`);
      this.logger.info(`  Puerto P2P: ${this.config.baseP2pPort + i}`);
      
      // Crear configuración del nodo
      const nodeConfig: BesuNodeConfig = {
        name: nodeName,
        rpcPort: this.config.baseRpcPort + i,
        p2pPort: this.config.baseP2pPort + i,
        dataDir: nodeDir,
        isValidator: isValidator,
        validatorAddress: address,
        privateKey,
        enabledApis: ['ETH', 'NET', 'WEB3', 'ADMIN', 'DEBUG', 'MINER', 'TXPOOL']
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
   * Genera archivo config.toml solo para el bootnode
   */
  async generateBootnodeConfigFile(): Promise<void> {
    this.logger.info('Generando archivo config.toml para el bootnode...');
    
    if (!this.config.nodes || this.config.nodes.length === 0) {
      this.logger.warn('No hay nodos configurados para generar archivo config.toml del bootnode');
      return;
    }

    const bootnodeConfig = this.config.nodes[0];
    await this.configGenerator.generateBootnodeConfig(bootnodeConfig, this.config);
    
    this.logger.info('Archivo config.toml del bootnode generado exitosamente');
  }

  /**
   * Genera archivos config.toml para los nodos no-bootnode con el enode real
   */
  async generateNodesConfigFiles(): Promise<void> {
    this.logger.info('Generando archivos config.toml para los nodos con enode real...');
    
    if (!this.bootnode) {
      throw new Error('No hay bootnode disponible. Debe iniciarse el bootnode primero.');
    }

    if (!this.config.nodes || this.config.nodes.length <= 1) {
      this.logger.warn('No hay nodos adicionales para generar archivos config.toml');
      return;
    }

    // Generar config.toml para todos los nodos excepto el bootnode (índice 0)
    for (let i = 1; i < this.config.nodes.length; i++) {
      const nodeConfig = this.config.nodes[i];
      await this.configGenerator.generateNodeConfig(nodeConfig, this.config, this.bootnode);
      this.logger.info(`Archivo config.toml generado para ${nodeConfig.name} con enode: ${this.bootnode}`);
    }
    
    this.logger.info('Archivos config.toml de los nodos generados exitosamente con el enode real');
  }

  /**
   * Genera archivos config.toml para todos los nodos (método legacy)
   * @deprecated Usar generateBootnodeConfigFile() y generateNodesConfigFiles() en su lugar
   */
  async generateConfigFiles(bootnodeEnode?: string): Promise<void> {
    this.logger.info('Generando archivos config.toml para todos los nodos...');
    
    if (!this.config.nodes || this.config.nodes.length === 0) {
      this.logger.warn('No hay nodos configurados para generar archivos config.toml');
      return;
    }

    for (let i = 0; i < this.config.nodes.length; i++) {
      const nodeConfig = this.config.nodes[i];
      
      if (i === 0) {
        // El primer nodo es el bootnode
        await this.configGenerator.generateBootnodeConfig(nodeConfig, this.config);
      } else {
        // Los demás nodos se conectan al bootnode
        // Si no se proporciona enode, usar uno temporal para la configuración
        const defaultBootnodeEnode = bootnodeEnode || `enode://placeholder@${this.config.nodes[0].name}:30303`;
        await this.configGenerator.generateNodeConfig(nodeConfig, this.config, defaultBootnodeEnode);
      }
    }
    
    this.logger.info('Archivos config.toml generados exitosamente');
  }





  /**
   * Inicia el nodo bootnode
   */
  private async startBootNode(nodeConfig: BesuNodeConfig): Promise<void> {
    this.logger.info(`Iniciando bootnode: ${nodeConfig.name}`);
    
    const containerName = `besu-${nodeConfig.name}`;
    const genesisPath = path.join(this.dataDir, 'genesis.json');
    const configPath = path.join(nodeConfig.dataDir, 'config.toml');
    
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
    
    // Configurar comando usando config.toml (solo parámetros no incluidos en config.toml)
    const command = [
      '--config-file=/data/config.toml',
      '--node-private-key-file=/data/key',
      '--genesis-file=/genesis.json',
      '--data-path=/data',
    ];
    // Añadir opciones adicionales si existen
    if (nodeConfig.additionalOptions) {
      for (const [key, value] of Object.entries(nodeConfig.additionalOptions)) {
        command.push(`--${key}=${value}`);
      }
    }
    
    // Iniciar contenedor
    this.logger.info(JSON.stringify({command}, null, 2));
    
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
    const bootnodeContainer = await this.docker.getContainerInfo(`besu-${nodeConfig.name}`);
    if (bootnodeContainer && bootnodeContainer.ipAddress) {
      const enodeUrl = await this.getEnodeUrl(nodeConfig.rpcPort);
      this.bootnode = enodeUrl.replace('127.0.0.1', bootnodeContainer.ipAddress).replace('0.0.0.0', bootnodeContainer.ipAddress);
      this.logger.info(`Bootnode iniciado con enode: ${this.bootnode}`);
    } else {
      throw new Error('No se pudo obtener la IP del bootnode');
    }
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
    
    // Configurar comando usando config.toml (solo parámetros no incluidos en config.toml)
    const command = [
      '--config-file=/data/config.toml',
      '--data-path=/data',
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
    
    const containerName = `besu-${nodeConfig.name}`;
    
    // Primero verificar que el contenedor esté corriendo
    const maxContainerRetries = 20;
    const containerRetryInterval = 1000;
    
    for (let i = 0; i < maxContainerRetries; i++) {
      const containerInfo = await this.docker.getContainerInfo(containerName);
      if (containerInfo && containerInfo.state === 'running') {
        this.logger.info(`Contenedor ${containerName} está corriendo`);
        break;
      }
      
      if (i === maxContainerRetries - 1) {
        throw new Error(`El contenedor ${containerName} no se inició correctamente`);
      }
      
      await new Promise(resolve => setTimeout(resolve, containerRetryInterval));
    }
    
    // Esperar un poco más para que el servicio RPC esté listo
    this.logger.info(`Esperando a que el servicio RPC del nodo ${nodeConfig.name} esté disponible...`);
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Ahora verificar que el RPC responda
    const maxRpcRetries = 15;
    const rpcRetryInterval = 3000;
    
    for (let i = 0; i < maxRpcRetries; i++) {
      try {
        const blockNumber = await this.getBlockNumber(nodeConfig.rpcPort);
        this.logger.info(`Nodo ${nodeConfig.name} listo, bloque actual: ${blockNumber}`);
        return;
      } catch (error) {
        this.logger.info(`Intento ${i + 1}/${maxRpcRetries} - RPC aún no disponible para ${nodeConfig.name}`);
        
        if (i === maxRpcRetries - 1) {
          throw new Error(`Tiempo de espera agotado para el nodo ${nodeConfig.name}. RPC no responde después de ${maxRpcRetries} intentos.`);
        }
        
        await new Promise(resolve => setTimeout(resolve, rpcRetryInterval));
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
    // Type assertion para evitar error TS18046
    const result = data as { result?: any; error?: { message: string } };
    if (result.error) {
      throw new Error(`Error al obtener el número de bloque: ${result.error.message}`);
    }
    return parseInt(result.result, 16);
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
    // Type assertion para evitar error TS18046
    const result = data as { result?: any; error?: { message: string } };
    if (result.error) {
      throw new Error(`Error al obtener el número de peers: ${result.error.message}`);
    }
    return parseInt(result.result, 16);
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
    // Type assertion para evitar error TS18046
    const result = data as { result?: { enode: string }; error?: { message: string } };
    if (result.error) {
      throw new Error(`Error al obtener la información del nodo: ${result.error.message}`);
    }
    if (!result.result || !result.result.enode) {
      throw new Error('No se pudo obtener el enode del nodo');
    }
    return result.result.enode;
  }
}