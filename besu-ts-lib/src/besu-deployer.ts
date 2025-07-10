import { DockerManager } from './docker-manager';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

export interface BesuNodeConfig {
  name: string;
  ip: string;
  port?: number;
  isBootnode?: boolean;
  isMiner?: boolean;
  isRpc?: boolean;
}

export interface BesuNetworkConfig {
  networkName: string;
  subnet: string;
  dataPath: string;
}

export class BesuDeployer extends DockerManager {
  private networkConfig: BesuNetworkConfig;

  constructor(networkConfig: BesuNetworkConfig) {
    super();
    this.networkConfig = networkConfig;
  }

  /**
   * Despliega una red completa de Besu
   */
  async deployBesuNetwork(nodes: BesuNodeConfig[]): Promise<void> {
    try {
      // 1. Limpiar red existente PRIMERO
      await this.cleanupNetwork();
      
      // 2. Limpiar datos anteriores
      await this.cleanupPreviousData();

      // 3. Crear directorio si no existe
      await this.ensureDataDirectory();
      
      // 4. Crear directorios y llaves para cada nodo
      await this.createNodeDirectories(nodes);
      
      // 5. Actualizar configuración con enode del bootnode
      await this.updateConfigWithBootnode(nodes);

      // 6. Crear red Docker
      await this.createBesuNetwork();

      // 7. Desplegar nodos
      for (const node of nodes) {
        await this.deployBesuNode(node);
        
        // Esperar un poco entre despliegues
        await this.sleep(2000);
      }

      console.log(`Red Besu desplegada con ${nodes.length} nodos`);
    } catch (error) {
      throw new Error(`Error desplegando red Besu: ${(error as Error).message}`);
    }
  }

  /**
   * Limpia datos anteriores de Besu
   */
  private async cleanupPreviousData(): Promise<void> {
    const absolutePath = path.resolve(this.networkConfig.dataPath);
    
    if (fs.existsSync(absolutePath)) {
      console.log('Limpiando datos anteriores...');
      
      // Eliminar todo el directorio y recrearlo
      this.removeDirectoryRecursive(absolutePath);
      
      console.log('Datos anteriores eliminados');
    }
  }

  /**
   * Elimina un directorio de forma recursiva
   */
  private removeDirectoryRecursive(dirPath: string): void {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  }

  /**
   * Asegura que el directorio de datos existe
   */
  private async ensureDataDirectory(): Promise<void> {
    const absolutePath = path.resolve(this.networkConfig.dataPath);
    if (!fs.existsSync(absolutePath)) {
      fs.mkdirSync(absolutePath, { recursive: true });
      console.log(`Directorio creado: ${absolutePath}`);
    }
    
    // Crear archivos de configuración básicos
    await this.createConfigFiles(absolutePath);
  }

  /**
   * Crea archivos de configuración básicos para Besu
   */
  private async createConfigFiles(dataPath: string): Promise<void> {
    // Crear config.toml básico
    const configContent = `genesis-file="/data/genesis.json"
p2p-host="0.0.0.0"
p2p-port="30303"
p2p-enabled=true
discovery-enabled=true
rpc-http-enabled=true
rpc-http-host="0.0.0.0"
rpc-http-port=8545
rpc-http-cors-origins=["*"]
rpc-http-api=["ADMIN","ETH", "CLIQUE", "NET", "TRACE", "DEBUG", "TXPOOL", "PERM"]
host-allowlist=["*"]`;

    // Crear bootnode-config.toml
    const bootnodeConfigContent = `genesis-file="/data/genesis.json"
p2p-host="0.0.0.0"
p2p-port="30303"
p2p-enabled=true
discovery-enabled=true
rpc-http-enabled=true
rpc-http-host="0.0.0.0"
rpc-http-port=8545
rpc-http-cors-origins=["*"]
rpc-http-api=["ADMIN","ETH", "CLIQUE", "NET", "TRACE", "DEBUG", "TXPOOL", "PERM"]
host-allowlist=["*"]`;

    // Crear genesis.json básico
    const genesisContent = {
      config: {
        chainId: 246700,
        londonBlock: 0,
        clique: {
          blockperiodseconds: 4,
          epochlenght: 30000,
          createemptyblocks: true
        }
      },
      extraData: "0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
      gasLimit: "0x1fffffffffffff",
      difficulty: "0x1",
      alloc: {}
    };

    // Escribir archivos
    const configPath = path.join(dataPath, 'config.toml');
    const bootnodeConfigPath = path.join(dataPath, 'bootnode-config.toml');
    const genesisPath = path.join(dataPath, 'genesis.json');
    
    fs.writeFileSync(configPath, configContent);
    fs.writeFileSync(bootnodeConfigPath, bootnodeConfigContent);
    fs.writeFileSync(genesisPath, JSON.stringify(genesisContent, null, 2));
    
    console.log(`Archivos creados:`);
    console.log(`  - ${configPath}`);
    console.log(`  - ${bootnodeConfigPath}`);
    console.log(`  - ${genesisPath}`);
  }

  /**
   * Crea directorios y archivos básicos para cada nodo
   */
  private async createNodeDirectories(nodes: BesuNodeConfig[]): Promise<void> {
    const basePath = path.resolve(this.networkConfig.dataPath);
    
    for (const node of nodes) {
      const nodePath = path.join(basePath, node.name);
      const dataPath = path.join(nodePath, 'data');
      
      // Crear directorios
      fs.mkdirSync(nodePath, { recursive: true });
      fs.mkdirSync(dataPath, { recursive: true });
      
      // Generar llave privada real (32 bytes = 64 caracteres hex)
      const privateKey = crypto.randomBytes(32);
      const privateKeyHex = '0x' + privateKey.toString('hex');
      
      // Simular dirección (en producción usarías la derivada de la llave pública)
      const addressBytes = crypto.randomBytes(20);
      const address = addressBytes.toString('hex');
      
      // Escribir archivos - Besu necesita la llave sin salto de línea
      fs.writeFileSync(path.join(nodePath, 'key'), privateKeyHex, { flag: 'w' });
      fs.writeFileSync(path.join(nodePath, 'address'), address, { flag: 'w' });
      
      // Si es bootnode, crear enode
      if (node.isBootnode) {
        // Para el enode necesitamos la clave pública (64 bytes = 128 caracteres hex)
        const publicKeyBytes = crypto.randomBytes(64);
        const publicKey = publicKeyBytes.toString('hex');
        const enode = `enode://${publicKey}@${node.ip}:30303`;
        fs.writeFileSync(path.join(nodePath, 'enode'), enode, { flag: 'w' });
        console.log(`Enode creado para bootnode: ${enode}`);
      }
      
      console.log(`Directorio y llaves creados para ${node.name}`);
      console.log(`  - Llave privada: ${privateKeyHex.substring(0, 18)}...`);
      console.log(`  - Dirección: 0x${address}`);
      
      // Verificar que el archivo de llave tiene el tamaño correcto
      const keyContent = fs.readFileSync(path.join(nodePath, 'key'), 'utf8');
      console.log(`  - Tamaño de llave: ${keyContent.length} caracteres`);
    }
  }

  /**
   * Actualiza la configuración con el enode del bootnode
   */
  private async updateConfigWithBootnode(nodes: BesuNodeConfig[]): Promise<void> {
    const basePath = path.resolve(this.networkConfig.dataPath);
    const bootnode = nodes.find(node => node.isBootnode);
    
    if (!bootnode) {
      console.log('No se encontró bootnode, saltando configuración de bootnodes');
      return;
    }
    
    // Leer el enode del bootnode
    const enodePath = path.join(basePath, bootnode.name, 'enode');
    const enode = fs.readFileSync(enodePath, 'utf8').trim();
    
    // Actualizar config.toml con el bootnode
    const configContent = `genesis-file="/data/genesis.json"
p2p-host="0.0.0.0"
p2p-port="30303"
p2p-enabled=true
bootnodes=["${enode}"]
discovery-enabled=true
rpc-http-enabled=true
rpc-http-host="0.0.0.0"
rpc-http-port=8545
rpc-http-cors-origins=["*"]
rpc-http-api=["ADMIN","ETH", "CLIQUE", "NET", "TRACE", "DEBUG", "TXPOOL", "PERM"]
host-allowlist=["*"]`;

    const configPath = path.join(basePath, 'config.toml');
    fs.writeFileSync(configPath, configContent);
    
    // Actualizar genesis.json con las direcciones de los validadores
    await this.updateGenesisWithValidators(nodes);
    
    console.log(`Configuración actualizada con bootnode: ${enode}`);
  }

  /**
   * Actualiza el genesis.json con las direcciones de los validadores
   */
  private async updateGenesisWithValidators(nodes: BesuNodeConfig[]): Promise<void> {
    const basePath = path.resolve(this.networkConfig.dataPath);
    
    // Obtener direcciones de nodos mineros/validadores
    const minerNodes = nodes.filter(node => node.isMiner || node.isBootnode);
    let extraData = "0x0000000000000000000000000000000000000000000000000000000000000000";
    
    // Agregar direcciones de validadores al extraData
    for (const node of minerNodes) {
      const addressPath = path.join(basePath, node.name, 'address');
      const address = fs.readFileSync(addressPath, 'utf8').trim();
      extraData += address;
    }
    
    // Agregar sufijo requerido para Clique
    extraData += "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
    
    // Crear balance inicial para el primer minero
    const firstMinerAddress = fs.readFileSync(path.join(basePath, minerNodes[0].name, 'address'), 'utf8').trim();
    
    const genesisContent = {
      config: {
        chainId: 246700,
        londonBlock: 0,
        clique: {
          blockperiodseconds: 4,
          epochlenght: 30000,
          createemptyblocks: true
        }
      },
      extraData: extraData,
      gasLimit: "0x1fffffffffffff",
      difficulty: "0x1",
      alloc: {
        [`0x${firstMinerAddress}`]: {
          balance: "0x20000000000000000000000000000000000000000000000000000000000"
        }
      }
    };

    const genesisPath = path.join(basePath, 'genesis.json');
    fs.writeFileSync(genesisPath, JSON.stringify(genesisContent, null, 2));
    
    console.log(`Genesis actualizado con ${minerNodes.length} validadores`);
    console.log(`  - extraData: ${extraData.substring(0, 50)}...`);
  }

  /**
   * Crea la red Docker para Besu
   */
  private async createBesuNetwork(): Promise<void> {
    await this.createNetwork({
      name: this.networkConfig.networkName,
      subnet: this.networkConfig.subnet,
      labels: {
        'network': this.networkConfig.networkName,
        'type': 'besu'
      }
    });
  }

  /**
   * Despliega un nodo Besu individual
   */
  private async deployBesuNode(nodeConfig: BesuNodeConfig): Promise<string> {
    const containerOptions = this.buildBesuContainerOptions(nodeConfig);
    
    console.log(`\n--- Desplegando ${nodeConfig.name} ---`);
    console.log(`  IP: ${nodeConfig.ip}`);
    console.log(`  Tipo: ${this.getNodeType(nodeConfig)}`);
    
    try {
      const containerId = await this.createContainer(containerOptions);
      console.log(`  Container ID: ${containerId.substring(0, 12)}`);
      
      // Esperar un poco más para que el contenedor se inicie
      console.log(`  Esperando que ${nodeConfig.name} se inicie...`);
      await this.sleep(3000);
      
      // Verificar que el contenedor se inició correctamente
      const containerInfo = await this.getContainerInfo(containerId);
      console.log(`  Estado: ${containerInfo.state}`);
      
      if (containerInfo.state !== 'running') {
        console.log(`  ⚠️  ${nodeConfig.name} no está corriendo!`);
      } else {
        console.log(`  ✅ ${nodeConfig.name} funcionando correctamente`);
      }
      
      return containerId;
    } catch (error) {
      console.error(`❌ Error desplegando ${nodeConfig.name}:`, error);
      throw error;
    }
  }

  /**
   * Construye las opciones del contenedor para un nodo Besu
   */
  private buildBesuContainerOptions(nodeConfig: BesuNodeConfig) {
    // Convertir a ruta absoluta
    const absolutePath = path.resolve(this.networkConfig.dataPath);
    const volumeMount = `${absolutePath}:/data`;
    const labels = {
      'network': this.networkConfig.networkName,
      'node-type': this.getNodeType(nodeConfig)
    };

    const cmd = this.buildBesuCommand(nodeConfig);
    const portBindings: any = {};

    // Si es nodo RPC, exponer puerto
    if (nodeConfig.isRpc) {
      portBindings['8545/tcp'] = [{ HostPort: '1002' }];
    }

    return {
      name: nodeConfig.name,
      Image: 'hyperledger/besu:latest',
      Cmd: cmd,
      ExposedPorts: nodeConfig.isRpc ? { '8545/tcp': {} } : undefined,
      HostConfig: {
        Binds: [volumeMount],
        PortBindings: Object.keys(portBindings).length > 0 ? portBindings : undefined
      },
      Labels: labels,
      networkName: this.networkConfig.networkName,
      ip: nodeConfig.ip
    };
  }

  /**
   * Construye el comando para ejecutar Besu
   */
  private buildBesuCommand(nodeConfig: BesuNodeConfig): string[] {
    const configFile = nodeConfig.isBootnode ? 
      '/data/bootnode-config.toml' : 
      '/data/config.toml';

    const cmd = [
      `--config-file=${configFile}`,
      `--data-path=/data/${nodeConfig.name}/data`,
      `--node-private-key-file=/data/${nodeConfig.name}/key`
    ];

    if (nodeConfig.isMiner) {
      cmd.push('--miner-enabled=true');
      cmd.push(`--miner-coinbase=0x$(cat /data/${nodeConfig.name}/address)`);
    }

    return cmd;
  }

  /**
   * Limpia la red existente
   */
  private async cleanupNetwork(): Promise<void> {
    try {
      // Eliminar contenedores de la red
      await this.removeNetwork(this.networkConfig.networkName, true);
    } catch (error) {
      // Si la red no existe, continuar
      console.log('Red no existe o ya fue eliminada');
    }
  }

  /**
   * Obtiene el tipo de nodo para labels
   */
  private getNodeType(nodeConfig: BesuNodeConfig): string {
    if (nodeConfig.isBootnode) return 'bootnode';
    if (nodeConfig.isRpc) return 'rpc';
    if (nodeConfig.isMiner) return 'miner';
    return 'validator';
  }

  /**
   * Espera un tiempo determinado
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Obtiene información de todos los nodos de la red
   */
  async getNetworkStatus(): Promise<any> {
    try {
      const networkInfo = await this.getNetworkInfo(this.networkConfig.networkName);
      return {
        network: {
          name: networkInfo.name,
          subnet: networkInfo.config.subnet,
          totalNodes: networkInfo.containers.length
        },
        nodes: networkInfo.containers.map(container => ({
          name: container.name,
          ip: container.ip,
          id: container.id
        }))
      };
    } catch (error) {
      throw new Error(`Error obteniendo estado de la red: ${(error as Error).message}`);
    }
  }

  /**
   * Obtiene los logs de un contenedor específico (útil para debugging)
   */
  async getNodeLogs(nodeName: string): Promise<string> {
    try {
      // Acceder al docker instance del padre
      const dockerInstance = (this as any).docker;
      const container = dockerInstance.getContainer(nodeName);
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail: 50
      });
      return logs.toString();
    } catch (error) {
      throw new Error(`Error obteniendo logs de ${nodeName}: ${(error as Error).message}`);
    }
  }
}