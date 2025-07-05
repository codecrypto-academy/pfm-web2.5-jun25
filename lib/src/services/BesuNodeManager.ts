import * as path from 'path';

import { BesuNodeConfig, BesuNodeStatus, BesuNodeType, NodeCreationConfig } from '../models/types';

import { DockerService } from './DockerService';
import { FileSystem } from '../utils/FileSystem';
import { KeyGenerator } from './KeyGenerator';
import { Logger } from '../utils/Logger';
import { NodeConfigFactory } from '../utils/NodeConfigFactory';

export class BesuNodeManager {
  private docker: DockerService;
  private logger: Logger;
  private fs: FileSystem;
  private keyGenerator: KeyGenerator;
  private dataDir: string;

  constructor(
    docker: DockerService,
    logger: Logger,
    fs: FileSystem,
    keyGenerator: KeyGenerator,
    dataDir: string
  ) {
    this.docker = docker;
    this.logger = logger;
    this.fs = fs;
    this.keyGenerator = keyGenerator;
    this.dataDir = dataDir;
  }

  public async createNode(nodeConfig: NodeCreationConfig): Promise<BesuNodeConfig> {
    this.logger.info(`Creating a new node: ${nodeConfig.name}`);
    const nodeDir = path.join(this.dataDir, nodeConfig.name);
    await this.fs.ensureDir(nodeDir);

    const { privateKey, publicKey, address } = await this.keyGenerator.generateNodeKeys(nodeDir);

    const fullNodeConfig = NodeConfigFactory.createNodeConfig(
      nodeConfig.nodeType,
      nodeConfig.name,
      nodeConfig.rpcPort || 0,
      nodeConfig.p2pPort || 0,
      nodeDir,
      address,
      privateKey,
      nodeConfig.additionalOptions || {}
    );

    this.logger.info(`Node ${nodeConfig.name} created successfully.`);
    return fullNodeConfig;
  }

  public async startNode(nodeConfig: BesuNodeConfig, networkName: string, genesisPath: string, bootnodes: string[]): Promise<void> {
    this.logger.info(`Starting node: ${nodeConfig.name}`);
    const containerName = `besu-${nodeConfig.name}`;

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
    });

    await this.waitForNodeReady(nodeConfig);
    this.logger.info(`Node ${nodeConfig.name} started.`);
  }

  public async stopNode(besuNodeName: string): Promise<void> {
    const containerName = `besu-${besuNodeName}`;
    this.logger.info(`Stopping node: ${besuNodeName}`);
    await this.docker.stopContainer(containerName);
    this.logger.info(`Node ${besuNodeName} stopped.`);
  }

  public async getNodeStatus(besuNodeName: string): Promise<BesuNodeStatus | null> {
    const containerName = `besu-${besuNodeName}`;
    const containerInfo = await this.docker.getContainerInfo(containerName);

    if (!containerInfo) {
      return null;
    }

    const nodeStatus: BesuNodeStatus = {
      containerId: containerInfo.id,
      name: besuNodeName,
      nodeType: BesuNodeType.NORMAL, // This would need to be stored/retrieved
      containerStatus: containerInfo.state,
      ports: { rpc: 0, p2p: 0 }, // This would need to be stored/retrieved
      isMining: false,
      isValidating: false,
    };

    try {
      const rpcPort = 0; // This needs to be retrieved from the node config
      const blockNumber = await this.getBlockNumber(rpcPort);
      nodeStatus.blockNumber = blockNumber;

      const peerCount = await this.getPeerCount(rpcPort);
      nodeStatus.peerCount = peerCount;

      const enodeUrl = await this.getEnodeUrl(rpcPort);
      nodeStatus.enodeUrl = enodeUrl;

      nodeStatus.ipAddress = containerInfo.ipAddress;
    } catch (error) {
      this.logger.error(`Error getting status for node ${besuNodeName}:`, error);
    }

    return nodeStatus;
  }

  public async getAllNodesStatus(): Promise<BesuNodeStatus[]> {
    const containers = await this.docker.listContainers({ all: true });
    const nodes: BesuNodeStatus[] = [];
    for (const container of containers) {
      if (container.Names.some((name: string) => name.startsWith('/besu-'))) {
        const besuNodeName = container.Names[0].replace('/besu-', '');
        const status = await this.getNodeStatus(besuNodeName);
        if (status) {
          nodes.push(status);
        }
      }
    }
    return nodes;
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

  private async getEnodeUrl(rpcPort: number): Promise<string> {
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
    return result.result.enode;
  }
}