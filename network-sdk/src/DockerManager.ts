/**
 * Docker Network Manager - handles only Docker operations
 */
import Docker from "dockerode";
import { NetworkConfig, BesuNodeConfig, ContainerInfo } from "./types.js";
import * as path from "path";

export class DockerManager {
  public docker: Docker;

  constructor() {
    this.docker = new Docker();
  }

  /**
   * Create a Docker network
   */
  async createDockerNetwork(config: NetworkConfig): Promise<string> {
    const networkName = `besu-${config.networkId}`;
    try {
      const network = await this.docker.createNetwork({
        Name: networkName,
        Driver: "bridge",
        IPAM: {
          Config: [
            {
              Subnet: config.subnet,
              Gateway: config.gateway,
            },
          ],
        },
        Labels: {
          "besu.network.id": config.networkId,
        },
      });
      console.info(`Docker network created: ${networkName} (${network.id})`);
      return network.id;
    } catch (error) {
      console.error(`Failed to create Docker network: ${error}`);
      throw error;
    }
  }

  /**
   * Create a Besu container
   */
  /**
   * Create a Besu container
   * @param networkConfig Network configuration
   * @param nodeConfig Node configuration
   * @param nodePath Path to node data
   * @param opts Optional flags (e.g., mining)
   */
  async createBesuContainer(
    networkConfig: NetworkConfig,
    nodeConfig: BesuNodeConfig,
    nodePath: string,
    opts?: { mining?: boolean }
  ): Promise<ContainerInfo> {
    const containerName = `besu-${networkConfig.networkId}-${nodeConfig.id}`;
    const genesisPath = path.join(nodePath, "..", "genesis.json");
    const keyPath = path.join(nodePath, "key");

    const besuArgs = [
      `--data-path=/opt/besu/data`,
      `--genesis-file=/opt/besu/genesis.json`,
      `--node-private-key-file=/opt/besu/key`,
      `--network-id=${networkConfig.chainId}`,
      `--sync-mode=FULL`,
      `--sync-min-peers=1`,
      `--rpc-http-enabled`,
      `--rpc-http-host=0.0.0.0`,
      `--rpc-http-port=${nodeConfig.rpcPort}`,
      `--rpc-http-cors-origins=*`,
      `--rpc-http-api=ETH,NET,CLIQUE,ADMIN`,
      `--host-allowlist=*`,
      `--p2p-host=0.0.0.0`,
      `--p2p-port=${nodeConfig.p2pPort}`,
      `--discovery-enabled=true`,
    ];

    if (nodeConfig.bootnodes && nodeConfig.bootnodes.length > 0) {
      besuArgs.push(`--bootnodes=${nodeConfig.bootnodes.join(",")}`);
    }

    // Only enable mining for miner nodes (not validator-only)
    if (opts?.mining || nodeConfig.type === "miner") {
      besuArgs.push(`--miner-enabled`);
      besuArgs.push(`--miner-coinbase=${nodeConfig.address}`);
    }

    const containerConfig: Docker.ContainerCreateOptions = {
      name: containerName,
      Image: "hyperledger/besu:latest",
      Cmd: besuArgs,
      ExposedPorts: {
        [`${nodeConfig.rpcPort}/tcp`]: {},
        [`${nodeConfig.p2pPort}/tcp`]: {},
        [`${nodeConfig.p2pPort}/udp`]: {},
      },
      HostConfig: {
        PortBindings: {
          [`${nodeConfig.rpcPort}/tcp`]: [
            { HostPort: String(nodeConfig.rpcPort) },
          ],
          [`${nodeConfig.p2pPort}/tcp`]: [
            { HostPort: String(nodeConfig.p2pPort) },
          ],
          [`${nodeConfig.p2pPort}/udp`]: [
            { HostPort: String(nodeConfig.p2pPort) },
          ],
        },
        Binds: [
          `${genesisPath}:/opt/besu/genesis.json:ro`,
          `${keyPath}:/opt/besu/key:ro`,
        ],
      },
      NetworkingConfig: {
        EndpointsConfig: {
          [`besu-${networkConfig.networkId}`]: {
            IPAMConfig: {
              IPv4Address: nodeConfig.ip,
            },
          },
        },
      },
      Labels: {
        "besu.network.id": networkConfig.networkId,
        "besu.node.id": nodeConfig.id,
      },
    };

    try {
      const container = await this.docker.createContainer(containerConfig);
      await container.start();

      const containerInfo: ContainerInfo = {
        id: nodeConfig.id,
        containerId: container.id,
        containerName,
        status: "running",
      };

      console.info(`Container created and started: ${containerName}`);
      return containerInfo;
    } catch (error) {
      console.error(`Failed to create container: ${error}`);
      throw error;
    }
  }

  /**
   * Stop and remove a container
   */
  async removeContainer(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.stop();
      await container.remove();
      console.info(`Container removed: ${containerId}`);
    } catch (error: any) {
      // Ignore if container is already removed
      if (error.statusCode !== 404) {
        console.error(`Failed to remove container ${containerId}: ${error}`);
        throw error;
      }
    }
  }

  /**
   * Remove Docker network and all containers
   */
  async removeDockerNetwork(networkId: string): Promise<void> {
    const networkName = `besu-${networkId}`;
    try {
      const networks = await this.docker.listNetworks({
        filters: { name: [networkName] },
      });
      
      if (networks.length === 0) {
        console.warn(`No Docker network found with name: ${networkName}`);
        return;
      }
      
      // Remove all matching networks (in case of duplicates)
      for (const networkInfo of networks) {
        if (networkInfo && networkInfo.Id) {
          const network = this.docker.getNetwork(networkInfo.Id);
          await network.remove();
          console.info(`Docker network removed: ${networkName} (${networkInfo.Id})`);
        }
      }
      
      if (networks.length > 1) {
        console.warn(`Removed ${networks.length} networks with name ${networkName} (duplicates detected)`);
      }
    } catch (error) {
      console.error(`Failed to remove Docker network ${networkName}: ${error}`);
      throw error;
    }
  }

  /**
   * Remove a specific node from a network by finding and removing its container
   */
  async removeNodeFromNetwork(
    networkId: string,
    nodeId: string
  ): Promise<void> {
    const containerName = `besu-${networkId}-${nodeId}`;

    try {
      // Find the container by name
      const containers = await this.docker.listContainers({
        all: true,
        filters: {
          name: [containerName],
          label: [`besu.network.id=${networkId}`, `besu.node.id=${nodeId}`],
        },
      });

      if (containers.length === 0) {
        console.warn(
          `No container found for node ${nodeId} in network ${networkId}`
        );
        return;
      }
      
      if (containers.length > 1) {
        console.warn(
          `Found ${containers.length} containers for node ${nodeId} in network ${networkId}. Removing all of them.`
        );
      }

      // Remove all matching containers (in case of duplicates/orphans)
      for (const containerInfo of containers) {
        if (!containerInfo || !containerInfo.Id) {
          continue;
        }

        const container = this.docker.getContainer(containerInfo.Id);

        // Stop the container if it's running
        try {
          await container.stop();
        } catch (error: any) {
          // Ignore if container is already stopped
          if (error.statusCode !== 304) {
            console.warn(
              `Could not stop container ${containerInfo.Id}: ${error.message}`
            );
          }
        }

        // Remove the container
        await container.remove();
        console.info(
          `Container removed: ${containerInfo.Id} (${containerInfo.Names?.[0] || 'unknown'})`
        );
      }
      
      console.info(
        `Node ${nodeId} removed from network ${networkId} (${containers.length} container(s) processed)`
      );
    } catch (error) {
      console.error(
        `Failed to remove node ${nodeId} from network ${networkId}: ${error}`
      );
      throw error;
    }
  }

  /**
   * Find containers belonging to a specific network
   */
  async findNetworkContainers(
    networkId: string
  ): Promise<Docker.ContainerInfo[]> {
    try {
      const containers = await this.docker.listContainers({
        all: true,
        filters: {
          label: [`besu.network.id=${networkId}`],
        },
      });
      return containers;
    } catch (error) {
      console.error(
        `Failed to find containers for network ${networkId}: ${error}`
      );
      throw error;
    }
  }

  /**
   * Find a specific node container in a network
   */
  async findNodeContainer(
    networkId: string,
    nodeId: string
  ): Promise<Docker.ContainerInfo | null> {
    try {
      const containers = await this.docker.listContainers({
        all: true,
        filters: {
          label: [`besu.network.id=${networkId}`, `besu.node.id=${nodeId}`],
        },
      });
      
      if (containers.length === 0) {
        return null;
      }
      
      if (containers.length > 1) {
        console.warn(
          `Found ${containers.length} containers for node ${nodeId} in network ${networkId}. Returning the first one.`
        );
      }
      
      return containers[0] || null;
    } catch (error) {
      console.error(
        `Failed to find container for node ${nodeId} in network ${networkId}: ${error}`
      );
      throw error;
    }
  }

  /**
   * Check if Docker is available
   */
  async isDockerAvailable(): Promise<boolean> {
    try {
      await this.docker.ping();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Add a node to an existing Docker network
   * Assumes the network already exists and node files are prepared
   */
  async addNodeToNetwork(
    networkConfig: NetworkConfig,
    nodeConfig: BesuNodeConfig,
    nodePath: string
  ): Promise<ContainerInfo> {
    // Check if network exists first
    const networkName = `besu-${networkConfig.networkId}`;
    const networks = await this.docker.listNetworks({
      filters: { name: [networkName] },
    });
    
    if (networks.length === 0) {
      throw new Error(`Docker network ${networkName} does not exist. Create the network first.`);
    }

    // Check if a container with this node ID already exists
    const existingContainer = await this.findNodeContainer(networkConfig.networkId, nodeConfig.id);
    if (existingContainer) {
      throw new Error(`Node ${nodeConfig.id} already exists in network ${networkConfig.networkId}`);
    }

    // Create and start the container
    return await this.createBesuContainer(networkConfig, nodeConfig, nodePath);
  }

  /**
   * Check if a Docker network exists
   */
  async networkExists(networkId: string): Promise<boolean> {
    try {
      const networkName = `besu-${networkId}`;
      const networks = await this.docker.listNetworks({
        filters: { name: [networkName] },
      });
      return networks.length > 0;
    } catch (error) {
      console.error(`Failed to check if network ${networkId} exists: ${error}`);
      return false;
    }
  }
}
