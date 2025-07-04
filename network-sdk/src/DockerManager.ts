/**
 * Docker Network Manager - handles only Docker operations
 */
import Docker from 'dockerode';
import { NetworkConfig, BesuNodeConfig, ContainerInfo } from './types.js';
import * as fs from 'fs';
import * as path from 'path';

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
        Driver: 'bridge',
        IPAM: {
          Config: [{
            Subnet: config.subnet,
            Gateway: config.gateway
          }]
        },
        Labels: {
          'besu.network.id': config.networkId,
        }
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
  async createBesuContainer(
    networkConfig: NetworkConfig,
    nodeConfig: BesuNodeConfig,
    nodePath: string
  ): Promise<ContainerInfo> {
    const containerName = `besu-${networkConfig.networkId}-${nodeConfig.id}`;
    const genesisPath = path.join(nodePath, '..', 'genesis.json');
    const configTomlPath = path.join(nodePath, 'config.toml');
    const keyPath = path.join(nodePath, 'key');

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
      besuArgs.push(`--bootnodes=${nodeConfig.bootnodes.join(',')}`);
    }

    if (nodeConfig.type === 'miner') {
      besuArgs.push(`--miner-enabled`);
      besuArgs.push(`--miner-coinbase=${nodeConfig.address}`);
    }

    const containerConfig: Docker.ContainerCreateOptions = {
      name: containerName,
      Image: 'hyperledger/besu:latest',
      Cmd: besuArgs,
      ExposedPorts: {
        [`${nodeConfig.rpcPort}/tcp`]: {},
        [`${nodeConfig.p2pPort}/tcp`]: {},
        [`${nodeConfig.p2pPort}/udp`]: {}
      },
      HostConfig: {
        PortBindings: {
          [`${nodeConfig.rpcPort}/tcp`]: [{ HostPort: String(nodeConfig.rpcPort) }],
          [`${nodeConfig.p2pPort}/tcp`]: [{ HostPort: String(nodeConfig.p2pPort) }],
          [`${nodeConfig.p2pPort}/udp`]: [{ HostPort: String(nodeConfig.p2pPort) }]
        },
        Binds: [
          `${genesisPath}:/opt/besu/genesis.json:ro`,
          `${keyPath}:/opt/besu/key:ro`
        ],
      },
      NetworkingConfig: {
        EndpointsConfig: {
          [`besu-${networkConfig.networkId}`]: {
            IPAMConfig: {
              IPv4Address: nodeConfig.ip
            }
          }
        }
      },
      Labels: {
        'besu.network.id': networkConfig.networkId,
        'besu.node.id': nodeConfig.id,
      }
    };

    try {
      const container = await this.docker.createContainer(containerConfig);
      await container.start();
      
      const containerInfo: ContainerInfo = {
        id: nodeConfig.id,
        containerId: container.id,
        containerName,
        status: 'running'
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
      const networks = await this.docker.listNetworks({ filters: { name: [networkName] } });
      if (networks.length > 0 && networks[0]) {
        const network = this.docker.getNetwork(networks[0].Id);
        await network.remove();
        console.info(`Docker network removed: ${networkName}`);
      }
    } catch (error) {
      console.error(`Failed to remove Docker network ${networkName}: ${error}`);
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
}
