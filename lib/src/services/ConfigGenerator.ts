import * as path from 'path';

import { BesuNetworkConfig, BesuNodeConfig } from '../models/types';

import { FileSystem } from '../utils/FileSystem';
import { Logger } from '../utils/Logger';

/**
 * Generador de archivos de configuración TOML para nodos Besu
 */
export class ConfigGenerator {
  private logger: Logger;
  private fs: FileSystem;

  constructor(logger: Logger, fs: FileSystem) {
    this.logger = logger;
    this.fs = fs;
  }

  /**
   * Genera archivo config.toml para el bootnode
   * @param nodeConfig Configuración del nodo
   * @param networkConfig Configuración de la red
   */
  async generateBootnodeConfig(
    nodeConfig: BesuNodeConfig,
    networkConfig: BesuNetworkConfig
  ): Promise<void> {
    const configPath = path.join(nodeConfig.dataDir, './config.toml');
    
    const config = `# Configuración del Bootnode Besu
# Generado automáticamente

# Configuración de datos
genesis-file="/genesis.json"

# Configuración de red
network-id=${networkConfig.chainId}
p2p-enabled=true
p2p-host="0.0.0.0"
p2p-port=30303
max-peers=25
discovery-enabled=true

# Configuración RPC
rpc-http-enabled=true
rpc-http-host="0.0.0.0"
rpc-http-port=8545
rpc-http-cors-origins=["*"]
rpc-http-api=[${nodeConfig.enabledApis.map(api => `"${api}"`).join(', ')}]

# Configuración de minería
miner-enabled=${nodeConfig.isValidator}
miner-coinbase="${nodeConfig.validatorAddress}"

# Configuración de sincronización
sync-mode="FULL"

# Configuración de seguridad
host-allowlist=["*"]

# Configuración de logging
logging="INFO"
`;

    await this.fs.writeFile(configPath, config);
    this.logger.info(`Archivo config.toml generado para bootnode en: ${configPath}`);
  }

  /**
   * Genera archivo config.toml para un nodo regular
   * @param nodeConfig Configuración del nodo
   * @param networkConfig Configuración de la red
   * @param bootnodeEnode URL del bootnode
   */
  async generateNodeConfig(
    nodeConfig: BesuNodeConfig,
    networkConfig: BesuNetworkConfig,
    bootnodeEnode: string
  ): Promise<void> {
    const configPath = path.join(nodeConfig.dataDir, './config.toml');
    
    // Extraer la IP real del enode del bootnode
    // El formato del enode es: enode://publickey@ip:port
    let bootnodeEnodeWithRealIP = bootnodeEnode;
    const enodeMatch = bootnodeEnode.match(/enode:\/\/([^@]+)@([^:]+):(\d+)/);
    if (enodeMatch) {
      const [, publicKey, ip, port] = enodeMatch;
      // Si la IP es 0.0.0.0 o 127.0.0.1, mantener el enode original
      // ya que debería haber sido corregido en el BesuNetworkManager
      bootnodeEnodeWithRealIP = `enode://${publicKey}@${ip}:${port}`;
      this.logger.info(`Usando bootnode con IP real: ${ip}:${port}`);
    }
    
    const config = `# Configuración del Nodo Besu: ${nodeConfig.name}
# Generado automáticamente

# Configuración de datos
genesis-file="/genesis.json"

# Configuración de red
network-id=${networkConfig.chainId}
p2p-enabled=true
p2p-host="0.0.0.0"
p2p-port=30303
max-peers=25
discovery-enabled=true

# Configuración de bootnode
bootnodes=["${bootnodeEnodeWithRealIP}"]

# Configuración RPC
rpc-http-enabled=true
rpc-http-host="0.0.0.0"
rpc-http-port=8545
rpc-http-cors-origins=["*"]
rpc-http-api=[${nodeConfig.enabledApis.map(api => `"${api}"`).join(', ')}]

# Configuración de minería
miner-enabled=${nodeConfig.isValidator}
miner-coinbase="${nodeConfig.validatorAddress}"
miner-stratum-enabled=false

# Configuración de sincronización
sync-mode="FULL"

# Configuración de seguridad
host-allowlist=["*"]

# Configuración de logging
logging="INFO"
`;

    await this.fs.writeFile(configPath, config);
    this.logger.info(`Archivo config.toml generado para nodo ${nodeConfig.name} en: ${configPath}`);
  }




}