import { BesuNodeConfig, NodeCredentials, NetworkInfo } from './types.js';

/**
 * Generator for Besu node configurations and Docker containers
 */
export class ConfigGenerator {
  
  /**
   * Generate Docker container configuration for a Besu node
   */
  generateNodeConfig(
    nodeConfig: BesuNodeConfig,
    credentials: NodeCredentials,
    networkInfo: NetworkInfo,
    ip: string
  ): any {
    const { config } = networkInfo;
    const besuVersion = config.besuVersion || 'latest';
    const containerName = nodeConfig.containerName || `besu-${config.networkId}-${nodeConfig.id}-${Date.now()}`;
    
    // Generate Besu command line arguments
    const besuArgs = this.generateBesuArgs(nodeConfig, credentials, networkInfo, ip);
    
    // Generate environment variables
    const env = this.generateEnvironment(nodeConfig, config.env);
    
    // Generate port bindings
    const portBindings = this.generatePortBindings(nodeConfig);
    
    const containerConfig = {
      name: containerName,
      Image: `hyperledger/besu:${besuVersion}`,
      Cmd: besuArgs,
      Env: env,
      ExposedPorts: this.generateExposedPorts(nodeConfig),
      HostConfig: {
        PortBindings: portBindings,
        NetworkMode: `besu-${config.networkId}`,
        RestartPolicy: {
          Name: 'unless-stopped'
        }
      },
      NetworkingConfig: {
        EndpointsConfig: {
          [`besu-${config.networkId}`]: {
            IPAMConfig: {
              IPv4Address: ip
            }
          }
        }
      },
      Labels: {
        'besu.network.id': config.networkId,
        'besu.network.chainId': (config.chainId ?? 1337).toString(),
        'besu.node.id': nodeConfig.id,
        'besu.node.type': nodeConfig.type,
        'besu.version': besuVersion,
        'besu.network.subnet': networkInfo.subnet
      }
    };
    
    return containerConfig;
  }
  
  /**
   * Generate Besu command line arguments
   */
  private generateBesuArgs(
    nodeConfig: BesuNodeConfig,
    credentials: NodeCredentials,
    networkInfo: NetworkInfo,
    _ip: string
  ): string[] {
    const args = [
      '--data-path=/opt/besu/data',
      '--genesis-file=/opt/besu/genesis.json',
      `--network-id=${networkInfo.config.chainId ?? 1337}`,
      '--host-allowlist=*',
      '--rpc-http-enabled=true',
      '--rpc-http-host=0.0.0.0',
      `--rpc-http-port=${nodeConfig.rpcPort || 8545}`,
      '--rpc-http-cors-origins=*',
      '--rpc-http-api=ETH,NET,CLIQUE,DEBUG,MINER,WEB3,TXPOOL',
      '--p2p-enabled=true',
      '--p2p-host=0.0.0.0',
      `--p2p-port=${nodeConfig.p2pPort || 30303}`,
      '--discovery-enabled=true'
    ];
    
    // Add node-specific configuration
    if (nodeConfig.type === 'bootnode') {
      // Bootnode specific configuration
      args.push('--discovery-enabled=true');
    } else {
      // Connect to bootnode for other nodes
      const bootnodeInfo = this.findBootnode(networkInfo);
      if (bootnodeInfo) {
        const enodeUrl = this.generateEnodeUrl(bootnodeInfo.credentials, bootnodeInfo.ip, bootnodeInfo.config.p2pPort || 30303);
        args.push(`--bootnodes=${enodeUrl}`);
      }
    }
    
    // Mining configuration
    if (nodeConfig.mining || nodeConfig.type === 'miner') {
      args.push('--miner-enabled=true');
      args.push(`--miner-coinbase=${credentials.address}`);
    }
    
    // Add extra arguments
    if (nodeConfig.extraArgs) {
      args.push(...nodeConfig.extraArgs);
    }
    
    return args;
  }
  
  /**
   * Generate environment variables for the container
   */
  private generateEnvironment(nodeConfig: BesuNodeConfig, networkEnv: Record<string, string> = {}): string[] {
    const env: string[] = [];
    
    // Add network-wide environment variables
    Object.entries(networkEnv).forEach(([key, value]) => {
      env.push(`${key}=${value}`);
    });
    
    // Add node-specific environment variables
    if (nodeConfig.env) {
      Object.entries(nodeConfig.env).forEach(([key, value]) => {
        env.push(`${key}=${value}`);
      });
    }
    
    return env;
  }
  
  /**
   * Generate port bindings for Docker container
   */
  private generatePortBindings(nodeConfig: BesuNodeConfig): Record<string, any> {
    const bindings: Record<string, any> = {};
    
    // RPC port
    const rpcPort = nodeConfig.rpcPort || 8545;
    bindings[`${rpcPort}/tcp`] = [{ HostPort: rpcPort.toString() }];
    
    // P2P port
    const p2pPort = nodeConfig.p2pPort || 30303;
    bindings[`${p2pPort}/tcp`] = [{ HostPort: p2pPort.toString() }];
    bindings[`${p2pPort}/udp`] = [{ HostPort: p2pPort.toString() }];
    
    return bindings;
  }
  
  /**
   * Generate exposed ports for Docker container
   */
  private generateExposedPorts(nodeConfig: BesuNodeConfig): Record<string, {}> {
    const exposed: Record<string, {}> = {};
    
    const rpcPort = nodeConfig.rpcPort || 8545;
    const p2pPort = nodeConfig.p2pPort || 30303;
    
    exposed[`${rpcPort}/tcp`] = {};
    exposed[`${p2pPort}/tcp`] = {};
    exposed[`${p2pPort}/udp`] = {};
    
    return exposed;
  }
  
  /**
   * Find bootnode in the network
   */
  private findBootnode(networkInfo: NetworkInfo): any {
    for (const [_, nodeInfo] of networkInfo.nodes) {
      if (nodeInfo.type === 'bootnode') {
        return nodeInfo;
      }
    }
    return null;
  }
  
  /**
   * Generate enode URL for a node
   */
  private generateEnodeUrl(credentials: NodeCredentials, ip: string, port: number): string {
    // Extract the public key without the 0x04 prefix for enode URL
    const publicKeyHex = credentials.publicKey.replace('0x04', '').replace('0x', '');
    return `enode://${publicKeyHex}@${ip}:${port}`;
  }
}
