import * as fs from 'fs';
import * as path from 'path';

import { BesuNetworkConfig, BesuNetworkStatus, BesuNodeConfig, BesuNodeStatus, BesuNodeType, GenesisOptions } from '../models/types';

import { BesuNodeManager } from './BesuNodeManager';
import { ConfigGenerator } from './ConfigGenerator';
import { DockerService } from './DockerService';
import { FileSystem } from '../utils/FileSystem';
import { GenesisGenerator } from './GenesisGenerator';
import { KeyGenerator } from './KeyGenerator';
import { Logger } from '../utils/Logger';
import { NodeConfigFactory } from '../utils/NodeConfigFactory';

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
  private nodeManager: BesuNodeManager;
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
    configGenerator: ConfigGenerator,
    nodeManager: BesuNodeManager
  ) {
    this.config = config;
    this.docker = docker;
    this.logger = logger;
    this.fs = fs;
    this.genesisGenerator = genesisGenerator;
    this.keyGenerator = keyGenerator;
    this.configGenerator = configGenerator;
    this.nodeManager = nodeManager;
    this.networkName = `${config.name}`;
    this.dataDir = config.dataDir || path.join(process.cwd(), 'data');
  }

  /**
   * Initializes the Besu network.
   */
  public async initialize(): Promise<void> {
    this.logger.info(`Initializing Besu network: ${this.config.name}`);
    await this.fs.ensureDir(this.dataDir);
    this.logger.info('Besu network initialized successfully.');
  }

  /**
   * Starts the Besu network.
   */
  public async start(): Promise<void> {
    this.logger.info(`Starting Besu network: ${this.config.name}`);
    await this.docker.createNetwork(this.networkName);
    this.logger.info(`Docker network ${this.networkName} created.`);
  }

  /**
   * Stops the Besu network.
   */
  public async stop(): Promise<void> {
    this.logger.info(`Stopping Besu network: ${this.config.name}`);
    await this.docker.removeNetwork(this.networkName);
    this.logger.info(`Besu network stopped: ${this.config.name}`);
  }

  /**
   * Gets the current status of the network.
   */
  public async getStatus(): Promise<BesuNetworkStatus> {
    const networks = await this.docker.listNetworks();
    const networkInfo = networks.find((n: any) => n.Name === this.networkName);
    const nodes = await this.nodeManager.getAllNodesStatus();

    return {
      name: this.config.name,
      networkId: networkInfo ? networkInfo.Id : '',
      nodes,
      uptime: 0, // TODO: Calculate uptime
      lastBlock: nodes.reduce((max, node) => Math.max(max, node.blockNumber || 0), 0)
    };
  }
}