import { ethers } from 'ethers';
import * as fs from 'fs-extra';
import * as path from 'path';
import { DockerService } from './docker.service';
import { CryptoUtils } from '../utils/crypto';
import {
  NetworkConfig,
  NodeConfig,
  GenesisConfig,
  GenesisFile,
  NetworkStatus,
  AccountGenerationResult,
  TransferResult,
  TransactionConfig
} from '../types';

export class NetworkService {
  private dockerService: DockerService;
  private networkConfig: NetworkConfig;

  constructor(networkConfig: NetworkConfig) {
    this.dockerService = new DockerService();
    this.networkConfig = networkConfig;
  }

  /**
   * Inicializa la red Besu
   */
  async initializeNetwork(): Promise<void> {
    console.log('🚀 Inicializando red Besu...');

    // Verificar Docker
    if (!(await this.dockerService.isDockerAvailable())) {
      throw new Error('Docker no está disponible');
    }

    // Limpiar configuración previa
    await this.cleanup();

    // Validar que hay nodos configurados
    if (!this.networkConfig.nodes || this.networkConfig.nodes.length === 0) {
      throw new Error('No hay nodos configurados');
    }

    console.log(`📋 Nodos configurados: ${this.networkConfig.nodes.length} total`);
    this.networkConfig.nodes.forEach(node => {
      console.log(`  - ${node.name} (${node.type}) - ${node.ip}:${node.port}`);
    });

    // Crear red Docker
    await this.dockerService.createNetwork(
      this.networkConfig.networkName,
      this.networkConfig.subnet
    );

    // Crear directorios y archivos de configuración
    await this.createNetworkFiles();

    // Verificar que todos los archivos se crearon correctamente
    await this.verifyFiles();

    // Desplegar nodos
    await this.deployNodes();

    console.log('✅ Red inicializada correctamente');
  }

  /**
   * Crea los archivos de configuración de la red
   */
  async createNetworkFiles(): Promise<void> {
    const networkDir = path.join(process.cwd(), 'networks', this.networkConfig.networkName);
    await fs.ensureDir(networkDir);

    // Crear directorios para cada nodo
    for (const node of this.networkConfig.nodes) {
      const nodeDir = path.join(networkDir, node.name);
      await fs.ensureDir(nodeDir);
      await fs.ensureDir(path.join(nodeDir, 'data'));
    }

    // Generar claves para los nodos
    await this.generateNodeKeys();

    // Crear archivo genesis
    await this.createGenesisFile();

    // Crear archivos de configuración
    await this.createConfigFiles();
  }

  /**
   * Genera claves para los nodos
   */
  private async generateNodeKeys(): Promise<void> {
    const networkDir = path.join(process.cwd(), 'networks', this.networkConfig.networkName);

    for (const node of this.networkConfig.nodes) {
      const nodeDir = path.join(networkDir, node.name);
      const keyPair = CryptoUtils.generateKeyPair();

      await fs.writeFile(path.join(nodeDir, 'key'), keyPair.privateKey.slice(2));
      await fs.writeFile(path.join(nodeDir, 'address'), keyPair.address.slice(2));
      await fs.writeFile(path.join(nodeDir, 'pub'), keyPair.publicKey.slice(2));

      // Para bootnode, generar enode
      if (node.type === 'bootnode') {
        const enode = this.generateEnode(keyPair.publicKey, node.ip, node.port);
        await fs.writeFile(path.join(nodeDir, 'enode'), enode);
      }
    }
  }

  /**
   * Genera el enode para bootnode
   */
  private generateEnode(publicKey: string, ip: string, port: number): string {
    // Elimina el prefijo '0x' si existe
    let nodeId = publicKey.replace(/^0x/, '');
    // Elimina el prefijo '04' si existe
    if (nodeId.startsWith('04')) nodeId = nodeId.slice(2);
    // Si la longitud es menor a 128, rellena con ceros
    if (nodeId.length < 128) nodeId = nodeId.padEnd(128, '0');
    // Si es mayor, recorta
    nodeId = nodeId.slice(0, 128);
    return `enode://${nodeId}@${ip}:${port}?discport=${port}`;
  }

  /**
   * Crea el archivo genesis.json
   */
  private async createGenesisFile(): Promise<void> {
    const networkDir = path.join(process.cwd(), 'networks', this.networkConfig.networkName);
    const genesisPath = path.join(networkDir, 'genesis.json');

    // Obtener dirección del primer nodo minero
    const minerNodes = this.networkConfig.nodes.filter(n => n.type === 'miner');
    if (minerNodes.length === 0) {
      throw new Error('No se encontró nodo minero en la configuración');
    }

    const firstMinerNode = minerNodes[0];
    const minerAddressPath = path.join(networkDir, firstMinerNode.name, 'address');
    const minerAddress = await fs.readFile(minerAddressPath, 'utf8');

    // Crear el archivo genesis.json con la estructura correcta para Clique PoA
    const genesis: GenesisFile = {
      config: {
        chainId: this.networkConfig.genesisConfig.chainId,
        londonBlock: 0,
        clique: {
          blockperiodseconds: this.networkConfig.genesisConfig.blockPeriodSeconds,
          epochlength: this.networkConfig.genesisConfig.epochLength,
          createemptyblocks: true
        }
      },
      extraData: `0x0000000000000000000000000000000000000000000000000000000000000000${minerAddress}0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000`,
      gasLimit: this.networkConfig.genesisConfig.gasLimit,
      difficulty: this.networkConfig.genesisConfig.difficulty,
      alloc: {
        [`0x${minerAddress}`]: {
          balance: '0x200000000000000000000000000000000000000000000000000000000000000'
        },
        ...this.networkConfig.genesisConfig.alloc
      }
    };

    await fs.writeJson(genesisPath, genesis, { spaces: 2 });
  }

  /**
   * Crea los archivos de configuración de los nodos
   */
  private async createConfigFiles(): Promise<void> {
    const networkDir = path.join(process.cwd(), 'networks', this.networkConfig.networkName);

    // Obtener enodes de todos los bootnodes
    const bootnodes = this.networkConfig.nodes.filter(n => n.type === 'bootnode');
    const bootnodeEnodes: string[] = [];
    
    for (const bootnode of bootnodes) {
      const enodePath = path.join(networkDir, bootnode.name, 'enode');
      const enode = await fs.readFile(enodePath, 'utf8');
      bootnodeEnodes.push(enode);
    }

    // Crear config.toml para cada nodo en su directorio específico
    for (const node of this.networkConfig.nodes) {
      const nodeDir = path.join(networkDir, node.name);
      const configPath = path.join(nodeDir, 'config.toml');

      // Configuración base para todos los nodos
      let config = `genesis-file="/data/genesis.json"
p2p-host="0.0.0.0"
p2p-port=${node.port}
p2p-enabled=true
discovery-enabled=true
rpc-http-enabled=true
rpc-http-host="0.0.0.0"
rpc-http-port=${node.rpcPort || 8545}
rpc-http-cors-origins=["*"]
rpc-http-api=["ADMIN","ETH", "CLIQUE", "NET", "TRACE", "DEBUG", "TXPOOL", "PERM"]
host-allowlist=["*"]`;

      // Agregar bootnodes solo si no es un bootnode y hay bootnodes configurados
      if (node.type !== 'bootnode' && bootnodeEnodes.length > 0) {
        const bootnodesConfig = bootnodeEnodes.map(enode => `"${enode}"`).join(',');
        config = config.replace('discovery-enabled=true', `discovery-enabled=true\nbootnodes=[${bootnodesConfig}]`);
      }

      await fs.writeFile(configPath, config);
    }
  }

  /**
   * Verifica que todos los archivos necesarios existen
   */
  private async verifyFiles(): Promise<void> {
    const networkDir = path.join(process.cwd(), 'networks', this.networkConfig.networkName);
    
    // Verificar archivo genesis.json
    const genesisPath = path.join(networkDir, 'genesis.json');
    if (!(await fs.pathExists(genesisPath))) {
      throw new Error('El archivo genesis.json no se creó correctamente');
    }
    
    // Verificar archivos de cada nodo
    for (const node of this.networkConfig.nodes) {
      const nodeDir = path.join(networkDir, node.name);
      const requiredFiles = [
        'config.toml',
        'key',
        'address',
        'pub'
      ];
      
      // Para bootnode, también verificar enode
      if (node.type === 'bootnode') {
        requiredFiles.push('enode');
      }
      
      for (const file of requiredFiles) {
        const filePath = path.join(nodeDir, file);
        if (!(await fs.pathExists(filePath))) {
          throw new Error(`El archivo ${file} no se creó correctamente para el nodo ${node.name}`);
        }
      }
      
      console.log(`✅ Archivos verificados para nodo ${node.name}`);
    }
    
    console.log('✅ Todos los archivos verificados correctamente');
  }

  /**
   * Despliega los nodos
   */
  private async deployNodes(): Promise<void> {
    const networkDir = path.join(process.cwd(), 'networks', this.networkConfig.networkName);

    for (const node of this.networkConfig.nodes) {
      console.log(`📦 Desplegando nodo ${node.name}...`);
      
      const containerId = await this.dockerService.createBesuContainer(
        node.name,
        node,
        this.networkConfig.networkName,
        networkDir
      );

      await this.dockerService.startContainer(containerId);
      console.log(`✅ Nodo ${node.name} desplegado`);
    }

    // Esperar a que los nodos estén listos
    console.log('⏳ Esperando a que los nodos estén listos...');
    await new Promise(resolve => setTimeout(resolve, 15000));
  }

  /**
   * Genera cuentas derivadas de un mnemónico
   */
  async generateAccounts(mnemonic: string, count: number = 10): Promise<AccountGenerationResult> {
    if (!CryptoUtils.isValidMnemonic(mnemonic)) {
      throw new Error('Mnemónico inválido');
    }

    const addresses = CryptoUtils.generateDerivedAddresses(mnemonic, count);
    const wallets = CryptoUtils.generateDerivedWallets(mnemonic, count);

    const accounts = wallets.map((wallet, index) => ({
      address: wallet.address,
      privateKey: wallet.privateKey,
      balance: '0'
    }));

    const accountsFile = path.join(process.cwd(), 'accounts.json');
    await CryptoUtils.saveAddressesToFile(addresses, accountsFile);

    return {
      mnemonic,
      accounts,
      accountsFile
    };
  }

  /**
   * Realiza transferencias en la red
   */
  async performTransfers(
    rpcUrl: string,
    minerPrivateKey: string,
    mnemonic: string,
    accountsFile: string
  ): Promise<TransferResult[]> {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const minerWallet = new ethers.Wallet(minerPrivateKey, provider);
    const addresses = await CryptoUtils.loadAddressesFromFile(accountsFile);
    const wallets = CryptoUtils.generateDerivedWallets(mnemonic, addresses.length);

    const results: TransferResult[] = [];

    // Transferencias desde el minero
    console.log('💰 Realizando transferencias desde el minero...');
    for (let i = 0; i < addresses.length; i++) {
      try {
        const tx = await minerWallet.sendTransaction({
          to: addresses[i],
          value: ethers.parseEther('20'),
          gasLimit: 21000
        });

        const receipt = await tx.wait();
        results.push({
          from: minerWallet.address,
          to: addresses[i],
          amount: '20',
          txHash: tx.hash,
          blockNumber: receipt?.blockNumber || 0,
          gasUsed: receipt?.gasUsed.toString() || '0',
          success: true
        });

        console.log(`✅ Transferencia ${i + 1} completada`);
      } catch (error) {
        results.push({
          from: minerWallet.address,
          to: addresses[i],
          amount: '20',
          txHash: '',
          blockNumber: 0,
          gasUsed: '0',
          success: false,
          error: (error as Error).message
        });
        console.log(`❌ Error en transferencia ${i + 1}:`, (error as Error).message);
      }
    }

    // Transferencias entre direcciones derivadas
    console.log('🔄 Realizando transferencias entre direcciones...');
    const transfers = [
      { from: 0, to: 2, amount: '12.5' },
      { from: 1, to: 4, amount: '15.3' },
      { from: 3, to: 7, amount: '11.8' },
      { from: 5, to: 9, amount: '13.2' },
      { from: 6, to: 1, amount: '14.7' }
    ];

    for (let i = 0; i < transfers.length; i++) {
      const transfer = transfers[i];
      const senderWallet = wallets[transfer.from].connect(provider);
      const receiverAddress = addresses[transfer.to];

      try {
        const tx = await senderWallet.sendTransaction({
          to: receiverAddress,
          value: ethers.parseEther(transfer.amount),
          gasLimit: 21000
        });

        const receipt = await tx.wait();
        results.push({
          from: senderWallet.address,
          to: receiverAddress,
          amount: transfer.amount,
          txHash: tx.hash,
          blockNumber: receipt?.blockNumber || 0,
          gasUsed: receipt?.gasUsed.toString() || '0',
          success: true
        });

        console.log(`✅ Transferencia entre direcciones ${i + 1} completada`);
      } catch (error) {
        results.push({
          from: senderWallet.address,
          to: receiverAddress,
          amount: transfer.amount,
          txHash: '',
          blockNumber: 0,
          gasUsed: '0',
          success: false,
          error: (error as Error).message
        });
        console.log(`❌ Error en transferencia entre direcciones ${i + 1}:`, (error as Error).message);
      }
    }

    return results;
  }

  /**
   * Obtiene el estado de la red
   */
  async getNetworkStatus(): Promise<NetworkStatus> {
    const containers = await this.dockerService.getContainers();
    // Eliminar toda la lógica y depuración relacionada con total de nodos y console.log
    return {
      isRunning: containers.some(c => 
        c.labels?.network === 'besu-demo' && /up/i.test(c.status || '')
      ),
      nodes: containers.filter(c => 
        c.labels?.network === 'besu-demo' && /up/i.test(c.status || '')
      ),
      totalNodes: 0, // No se calcula aquí
      runningNodes: 0 // No se calcula aquí
    };
  }

  /**
   * Limpia la red
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Limpiando red...');
    
    await this.dockerService.cleanupNetworkContainers(this.networkConfig.networkName);
    await this.dockerService.removeNetwork(this.networkConfig.networkName);
    
    const networkDir = path.join(process.cwd(), 'networks', this.networkConfig.networkName);
    if (await fs.pathExists(networkDir)) {
      await fs.remove(networkDir);
    }
  }
} 