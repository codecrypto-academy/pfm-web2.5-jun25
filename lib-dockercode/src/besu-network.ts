import { DockerManager } from './docker-manager';
import { 
  BesuNetworkConfig, 
  BesuNodeConfig, 
  BesuNodeStatus, 
  BesuNetworkStatus,
  NetworkCreateOptions,
  ContainerOptions
} from './types';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Gestiona redes Hyperledger Besu usando Docker
 * Extiende DockerManager para funcionalidad específica de blockchain
 */
export class BesuNetwork {
  private dockerManager: DockerManager;
  private networkConfig?: BesuNetworkConfig;
  private nodes: Map<string, BesuNodeStatus> = new Map();

  constructor() {
    this.dockerManager = new DockerManager();
  }

  /**
   * Crea una nueva red Besu con configuración específica
   */
  async createNetwork(config: BesuNetworkConfig, useExistingGenesis: boolean = false): Promise<void> {
    // Guardar configuración
    this.networkConfig = config;

    // Crear red Docker usando DockerManager
    const networkOptions: NetworkCreateOptions = {
      name: config.networkName,
      subnet: config.subnet,
      labels: {
        'besu.network': 'true',
        'besu.chainId': config.chainId.toString()
      }
    };

    await this.dockerManager.createNetwork(networkOptions);
    
    // Solo generar genesis si no existe uno o si se solicita uno nuevo
    if (!useExistingGenesis || !fs.existsSync('genesis.json')) {
      await this.generateGenesisFile(config);
      console.log('✅ Nuevo genesis.json generado');
    } else {
      console.log('🔄 Usando genesis.json existente');
    }
  }

  /**
   * Añade un nodo a la red Besu existente
   */
  async addNode(nodeConfig: BesuNodeConfig): Promise<string> {
    if (!this.networkConfig) {
      throw new Error('Red no inicializada. Llama a createNetwork() primero');
    }

    // Validaciones específicas por tipo de nodo
    this.validateNodeConfig(nodeConfig);

    // Configurar puertos automáticamente si no se especifican
    const rpcPort = nodeConfig.rpcPort || this.getNextAvailablePort(8545);
    const p2pPort = nodeConfig.p2pPort || this.getNextAvailablePort(30303);

    // Preparar opciones del contenedor
    const containerOptions: ContainerOptions = {
      name: nodeConfig.name,
      Image: 'hyperledger/besu:latest',
      networkName: this.networkConfig.networkName,
      ip: nodeConfig.ip,
      ExposedPorts: {
        '8545/tcp': {},
        '30303/tcp': {}
      },
      HostConfig: {
        PortBindings: {
          '8545/tcp': [{ HostPort: rpcPort.toString() }],
          '30303/tcp': [{ HostPort: p2pPort.toString() }]
        },
        Binds: [
          `${process.cwd()}/genesis.json:/var/lib/besu/genesis.json:ro`,
          `${process.cwd()}/password.txt:/var/lib/besu/password.txt:ro`
        ]
      },
      Cmd: this.buildBesuCommand(nodeConfig, this.networkConfig)
    };

    // Crear contenedor usando DockerManager
    const containerId = await this.dockerManager.createContainer(containerOptions);

    // Registrar nodo
    const nodeStatus: BesuNodeStatus = {
      containerId,
      config: { ...nodeConfig, rpcPort, p2pPort },
      status: 'running',
      rpcUrl: `http://localhost:${rpcPort}`,
      containerInfo: await this.dockerManager.getContainerInfo(containerId)
    };

    this.nodes.set(nodeConfig.name, nodeStatus);
    return containerId;
  }

  /**
   * Elimina un nodo específico de la red
   */
  async removeNode(nodeName: string): Promise<void> {
    const node = this.nodes.get(nodeName);
    if (!node) {
      throw new Error(`Nodo ${nodeName} no encontrado`);
    }

    await this.dockerManager.removeContainer(node.containerId);
    this.nodes.delete(nodeName);
  }

  /**
   * Destruye completamente la red y todos sus nodos
   */
  async destroyNetwork(): Promise<void> {
    if (!this.networkConfig) {
      throw new Error('No hay red activa para destruir');
    }

    // Eliminar todos los nodos
    for (const nodeName of this.nodes.keys()) {
      await this.removeNode(nodeName);
    }

    // Eliminar red Docker
    await this.dockerManager.removeNetwork(this.networkConfig.networkName);
    
    // Limpiar estado
    this.networkConfig = undefined;
    this.nodes.clear();
  }

  /**
   * Obtiene el estado actual de la red
   */
  async getNetworkStatus(): Promise<BesuNetworkStatus> {
    if (!this.networkConfig) {
      throw new Error('No hay red activa');
    }

    const networkInfo = await this.dockerManager.getNetworkInfo(this.networkConfig.networkName);
    
    return {
      config: this.networkConfig,
      networkInfo,
      nodes: Array.from(this.nodes.values()),
      isOperational: this.nodes.size > 0 && Array.from(this.nodes.values()).every(n => n.status === 'running')
    };
  }

  /**
   * Construye el comando Besu específico para cada tipo de nodo
   */
  private buildBesuCommand(nodeConfig: BesuNodeConfig, networkConfig: BesuNetworkConfig): string[] {
    const baseCmd = [
      '--data-path=/var/lib/besu',
      '--genesis-file=/var/lib/besu/genesis.json',
      `--network-id=${networkConfig.chainId}`,
      '--rpc-http-enabled',
      '--rpc-http-host=0.0.0.0',
      '--host-allowlist=*',
      `--rpc-http-api=${nodeConfig.rpcApis?.join(',') || 'ETH,NET,WEB3,ADMIN,MINER'}`
    ];

    // Configuración específica por tipo
    switch (nodeConfig.type) {
      case 'signer':
        if (!nodeConfig.coinbaseAddress) {
          throw new Error('Nodos firmantes requieren coinbaseAddress');
        }
        baseCmd.push(
          '--miner-enabled',
          `--miner-coinbase=${nodeConfig.coinbaseAddress}`
        );
        break;
      
      case 'rpc':
        // Los nodos RPC solo exponen APIs, sin minería
        break;
      
      case 'observer':
        // Los observadores se conectan pero no minan
        if (this.nodes.size > 0) {
          // Si hay otros nodos, conectarse como bootnode
          const firstNode = Array.from(this.nodes.values())[0];
          // Aquí habría que obtener el enode del primer nodo
          // Por simplicidad, omitimos esto por ahora
        }
        break;
    }

    return baseCmd;
  }

  /**
   * Valida la configuración del nodo según su tipo
   */
  private validateNodeConfig(nodeConfig: BesuNodeConfig): void {
    if (nodeConfig.type === 'signer' && !nodeConfig.coinbaseAddress) {
      throw new Error('Los nodos firmantes requieren coinbaseAddress');
    }

    if (nodeConfig.coinbaseAddress && !/^0x[a-fA-F0-9]{40}$/.test(nodeConfig.coinbaseAddress)) {
      throw new Error('coinbaseAddress debe ser una dirección Ethereum válida');
    }
  }

  /**
   * Genera el archivo genesis.json basado en la configuración
   */
  private async generateGenesisFile(config: BesuNetworkConfig): Promise<void> {
    // Construir extraData para Clique (validadores iniciales)
    const validatorsHex = config.initialValidators
      .map(addr => addr.replace('0x', ''))
      .join('');
    
    const extraData = '0x' + '0'.repeat(64) + validatorsHex + '0'.repeat(130);

    const genesis = {
      config: {
        chainId: config.chainId,
        clique: {
          period: 5,
          epoch: 30000
        }
      },
      difficulty: '0x1',
      gasLimit: '0x47b760',
      extraData,
      alloc: config.genesisAccounts || {}
    };

    // Guardar archivo
    await fs.promises.writeFile('genesis.json', JSON.stringify(genesis, null, 2));
  }

  /**
   * Obtiene el siguiente puerto disponible
   */
  private getNextAvailablePort(basePort: number): number {
    const usedPorts = new Set(
      Array.from(this.nodes.values()).flatMap(node => [
        node.config.rpcPort, 
        node.config.p2pPort
      ]).filter(Boolean)
    );

    let port = basePort;
    while (usedPorts.has(port)) {
      port++;
    }
    return port;
  }
}