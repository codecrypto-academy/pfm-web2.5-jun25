import { DockerManager } from './DockerManager.js';
import { GenesisGenerator } from './GenesisGenerator.js';
import { KeyGenerator } from './KeyGenerator.js';
import { BesuNodeConfig, NetworkConfig, NetworkInfo, NodeCredentials, ContainerInfo } from './types.js';
import * as fs from 'fs';
import * as path from 'path';

export class NetworkManager {
  private dockerManager: DockerManager;
  private keyGenerator: KeyGenerator;
  private networks: Map<string, NetworkInfo> = new Map();
  private workspaceRoot: string;

  constructor(workspaceRoot: string = '.tmp') {
    this.dockerManager = new DockerManager();
    this.keyGenerator = new KeyGenerator();
    this.workspaceRoot = path.resolve(workspaceRoot);
  }

  private getNetworkPath(networkId: string): string {
    return path.join(this.workspaceRoot, 'networks', networkId);
  }

  private async createNetworkDir(networkId: string): Promise<string> {
    const networkPath = this.getNetworkPath(networkId);
    if (!fs.existsSync(networkPath)) {
      await fs.promises.mkdir(networkPath, { recursive: true });
    }
    return networkPath;
  }

  async createNetwork(networkConfig: NetworkConfig): Promise<NetworkInfo> {
    const networkPath = await this.createNetworkDir(networkConfig.networkId);

    // 1. Generate keys and enodes for all nodes
    const nodeCredentials = new Map<string, NodeCredentials>();
    const bootnodes: string[] = [];

    for (const node of networkConfig.nodes) {
      const credentials = this.keyGenerator.generateKeyPair(node.ip, node.p2pPort);
      nodeCredentials.set(node.id, credentials);
      node.address = credentials.address;
      node.enode = credentials.enode;
      if (node.type === 'bootnode') {
        bootnodes.push(credentials.enode);
      }
    }

    // Assign bootnodes to all other nodes
    for (const node of networkConfig.nodes) {
      if (node.type !== 'bootnode') {
        node.bootnodes = bootnodes;
      }
    }

    // 2. Generate and save keys and config for each node
    for (const node of networkConfig.nodes) {
      const nodePath = path.join(networkPath, node.id);
      await fs.promises.mkdir(nodePath, { recursive: true });
      const creds = nodeCredentials.get(node.id)!;
      await fs.promises.writeFile(path.join(nodePath, 'key'), creds.privateKey.slice(2));
      await fs.promises.writeFile(path.join(nodePath, 'key.pub'), creds.publicKey.slice(2));
      await fs.promises.writeFile(path.join(nodePath, 'address'), creds.address);
      await fs.promises.writeFile(path.join(nodePath, 'enode'), creds.enode);
    }

    // 3. Generate genesis file
    const validatorAddresses = networkConfig.nodes
      .filter(n => n.type === 'miner')
      .map(n => n.address!);
    
    const genesis = networkConfig.genesis || GenesisGenerator.generateGenesis({
      chainId: networkConfig.chainId,
      validators: validatorAddresses,
    });
    const genesisPath = path.join(networkPath, 'genesis.json');
    await fs.promises.writeFile(genesisPath, JSON.stringify(genesis, null, 2));

    // 4. Create Docker network
    const dockerNetworkId = await this.dockerManager.createDockerNetwork(networkConfig);

    // 5. Create containers
    const containers = new Map<string, ContainerInfo>();
    for (const nodeConfig of networkConfig.nodes) {
      const nodePath = path.join(networkPath, nodeConfig.id);
      const container = await this.dockerManager.createBesuContainer(
        networkConfig,
        nodeConfig,
        nodePath
      );
      containers.set(nodeConfig.id, container);
    }

    const networkInfo: NetworkInfo = {
      networkId: networkConfig.networkId,
      dockerNetworkId: dockerNetworkId,
      containers: containers,
      networkPath: networkPath,
      chainId: networkConfig.chainId,
      subnet: networkConfig.subnet,
      gateway: networkConfig.gateway,
    };

    this.networks.set(networkConfig.networkId, networkInfo);
    return networkInfo;
  }

  async stopNetwork(networkId: string): Promise<void> {
    const networkInfo = this.networks.get(networkId);
    if (!networkInfo) {
      console.warn(`Network ${networkId} not found or not running.`);
      // still try to cleanup
      await this.dockerManager.removeDockerNetwork(networkId);
      const networkPath = this.getNetworkPath(networkId);
      if (fs.existsSync(networkPath)) {
        await fs.promises.rm(networkPath, { recursive: true, force: true });
      }
      return;
    }

    for (const container of networkInfo.containers.values()) {
      await this.dockerManager.removeContainer(container.containerId);
    }

    await this.dockerManager.removeDockerNetwork(networkId);

    const networkPath = this.getNetworkPath(networkId);
    if (fs.existsSync(networkPath)) {
      await fs.promises.rm(networkPath, { recursive: true, force: true });
    }
    this.networks.delete(networkId);
  }

  /**
   * Add a single node to an existing network
   */
  async addNode(networkId: string, nodeConfig: BesuNodeConfig): Promise<ContainerInfo> {
    const networkInfo = this.networks.get(networkId);
    if (!networkInfo) {
      throw new Error(`Network ${networkId} not found or not running`);
    }

    // Check if node ID already exists
    if (networkInfo.containers.has(nodeConfig.id)) {
      throw new Error(`Node ${nodeConfig.id} already exists in network ${networkId}`);
    }

    const networkPath = networkInfo.networkPath;

    // 1. Generate keys and enode for the new node
    const credentials = this.keyGenerator.generateKeyPair(nodeConfig.ip, nodeConfig.p2pPort);
    nodeConfig.address = credentials.address;
    nodeConfig.enode = credentials.enode;

    // 2. Find existing bootnode-type nodes to use as bootnodes
    const existingBootnodes: string[] = [];
    for (const [nodeId, container] of networkInfo.containers) {
      // Only use actual bootnode-type containers as bootnodes
      if (container.containerName.includes('bootnode')) {
        const existingNodePath = path.join(networkPath, nodeId);
        const enodeFile = path.join(existingNodePath, 'enode');
        if (fs.existsSync(enodeFile)) {
          const enodeContent = await fs.promises.readFile(enodeFile, 'utf8');
          existingBootnodes.push(enodeContent.trim());
        }
      }
    }
    
    // Assign bootnodes to new node (only if it's not a bootnode itself)
    if (nodeConfig.type !== 'bootnode') {
      nodeConfig.bootnodes = existingBootnodes;
    }
    
    console.info(`Setting ${existingBootnodes.length} bootnodes for new node ${nodeConfig.id}:`, existingBootnodes);

    // 3. Create node directory and save credentials
    const nodePath = path.join(networkPath, nodeConfig.id);
    await fs.promises.mkdir(nodePath, { recursive: true });
    await fs.promises.writeFile(path.join(nodePath, 'key'), credentials.privateKey.slice(2));
    await fs.promises.writeFile(path.join(nodePath, 'key.pub'), credentials.publicKey.slice(2));
    await fs.promises.writeFile(path.join(nodePath, 'address'), credentials.address);
    await fs.promises.writeFile(path.join(nodePath, 'enode'), credentials.enode);

    // 4. Create network config using stored network information
    const networkConfig: NetworkConfig = {
      networkId: networkId,
      chainId: networkInfo.chainId,
      subnet: networkInfo.subnet,
      gateway: networkInfo.gateway,
      nodes: [nodeConfig]
    };

    // 5. Create the container and connect to existing Docker network
    const container = await this.dockerManager.createBesuContainer(
      networkConfig,
      nodeConfig,
      nodePath
    );

    // 6. Update network info
    networkInfo.containers.set(nodeConfig.id, container);

    console.info(`✅ Node ${nodeConfig.id} added to network ${networkId}`);
    return container;
  }

  /**
   * Remove a single node from an existing network
   */
  async removeNode(networkId: string, nodeId: string): Promise<void> {
    const networkInfo = this.networks.get(networkId);
    if (!networkInfo) {
      throw new Error(`Network ${networkId} not found or not running`);
    }

    const container = networkInfo.containers.get(nodeId);
    if (!container) {
      throw new Error(`Node ${nodeId} not found in network ${networkId}`);
    }

    // 1. Stop and remove the container
    await this.dockerManager.removeContainer(container.containerId);

    // 2. Remove node directory
    const nodePath = path.join(networkInfo.networkPath, nodeId);
    if (fs.existsSync(nodePath)) {
      await fs.promises.rm(nodePath, { recursive: true, force: true });
    }

    // 3. Update network info
    networkInfo.containers.delete(nodeId);

    console.info(`✅ Node ${nodeId} removed from network ${networkId}`);
  }

  /**
   * Get the status of a specific node in a network
   */
  async getNodeStatus(networkId: string, nodeId: string): Promise<{
    nodeId: string;
    networkId: string;
    container: ContainerInfo;
    dockerStatus: string;
    isHealthy: boolean;
    rpcPort: number;
    p2pPort: number;
    nodeType: string;
    enode?: string | undefined;
    address?: string | undefined;
  }> {
    const networkInfo = this.networks.get(networkId);
    if (!networkInfo) {
      throw new Error(`Network ${networkId} not found or not running`);
    }

    const container = networkInfo.containers.get(nodeId);
    if (!container) {
      throw new Error(`Node ${nodeId} not found in network ${networkId}`);
    }

    // Get detailed container information from Docker
    const dockerContainer = this.dockerManager.docker.getContainer(container.containerId);
    const containerInspect = await dockerContainer.inspect();

    // Read node files
    const nodePath = path.join(networkInfo.networkPath, nodeId);
    let enode: string | undefined;
    let address: string | undefined;
    let nodeType: string = 'unknown';

    try {
      if (fs.existsSync(path.join(nodePath, 'enode'))) {
        enode = await fs.promises.readFile(path.join(nodePath, 'enode'), 'utf8');
        enode = enode.trim();
      }
      if (fs.existsSync(path.join(nodePath, 'address'))) {
        address = await fs.promises.readFile(path.join(nodePath, 'address'), 'utf8');
        address = address.trim();
      }
    } catch (error) {
      console.warn(`Warning: Could not read node files for ${nodeId}: ${error}`);
    }

    // Extract node type and ports from container labels or config
    const labels = containerInspect.Config.Labels || {};
    const ports = containerInspect.NetworkSettings.Ports || {};

    // Find RPC and P2P ports
    let rpcPort = 0;
    let p2pPort = 0;
    
    for (const [containerPort, hostBindings] of Object.entries(ports)) {
      if (hostBindings && hostBindings.length > 0 && hostBindings[0]) {
        const hostPort = parseInt(hostBindings[0].HostPort || '0');
        if (containerPort.includes('854')) { // RPC ports (8545, 8546, etc.)
          rpcPort = hostPort;
        } else if (containerPort.includes('303')) { // P2P ports (30303, 30304, etc.)
          p2pPort = hostPort;
        }
      }
    }

    // Determine node type from container name or labels
    if (container.containerName.includes('bootnode')) {
      nodeType = 'bootnode';
    } else if (container.containerName.includes('miner')) {
      nodeType = 'miner';
    } else if (container.containerName.includes('rpc')) {
      nodeType = 'rpc';
    }

    return {
      nodeId,
      networkId,
      container,
      dockerStatus: containerInspect.State.Status,
      isHealthy: containerInspect.State.Health?.Status === 'healthy' || containerInspect.State.Status === 'running',
      rpcPort,
      p2pPort,
      nodeType,
      enode,
      address
    };
  }

  getNetwork(networkId: string): NetworkInfo | undefined {
    return this.networks.get(networkId);
  }
}
