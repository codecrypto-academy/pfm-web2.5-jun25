import * as path from 'path';

import { BesuNetworkConfig, BesuNodeConfig, BesuNodeType } from '../models/types';

import { FileSystem } from '../utils/FileSystem';
import { Logger } from '../utils/Logger';
import { NodeConfigFactory } from '../utils/NodeConfigFactory';

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
    // Normalizar el path para usar forward slashes en todos los sistemas operativos
    const configPath = path.join(nodeConfig.dataDir, './config.toml').replace(/\\/g, '/');
    
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
rpc-http-api=[${nodeConfig.enabledApis.map(api => `"${api}"`).join(',')}]

# Configuración de minería
${this.getMiningConfig(nodeConfig)}

# Configuración de sincronización
sync-mode="FULL"

# Configuración de seguridad
host-allowlist=["*"]

${this.getLoggingAndAdditionalConfig(nodeConfig)}
`;

    await this.fs.writeFile(configPath, config);
    this.logger.info(`Generando archivo config.toml para bootnode`);
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
    // Normalizar el path para usar forward slashes en todos los sistemas operativos
    const configPath = path.join(nodeConfig.dataDir, './config.toml').replace(/\\/g, '/');
    
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
rpc-http-api=[${nodeConfig.enabledApis.map(api => `"${api}"`).join(',')}]

# Configuración de minería
${this.getMiningConfig(nodeConfig)}

# Configuración de sincronización
sync-mode="FULL"

# Configuración de seguridad
host-allowlist=["*"]

${this.getLoggingAndAdditionalConfig(nodeConfig)}
`;

    await this.fs.writeFile(configPath, config);
    this.logger.info(`Generando archivo config.toml para ${nodeConfig.name}`);
  }

  /**
   * Genera la configuración de minería según el tipo de nodo
   * @param nodeConfig Configuración del nodo
   */
  private getMiningConfig(nodeConfig: BesuNodeConfig): string {
    switch (nodeConfig.nodeType) {
      case BesuNodeType.SIGNER:
        return `miner-enabled=true
miner-coinbase="${nodeConfig.validatorAddress || ''}"`;
      
      case BesuNodeType.MINER:
        return `miner-enabled=true
miner-coinbase="${nodeConfig.validatorAddress || ''}"`;
      
      case BesuNodeType.NORMAL:
      default:
        return `miner-enabled=false`;
    }
  }

  /**
   * Genera configuración adicional específica por tipo de nodo
   * @param nodeConfig Configuración del nodo
   */
  private getNodeTypeSpecificConfig(nodeConfig: BesuNodeConfig): string {
    const additionalOptions = NodeConfigFactory.getBesuCommandOptions(nodeConfig);
    
    if (additionalOptions.length === 0) {
      return '';
    }

    return `\n# Configuración específica del tipo de nodo (${nodeConfig.nodeType})\n` +
           additionalOptions.map(option => {
             const [key, value] = option.replace('--', '').split('=');
             return value ? `${key}=${value}` : `${key}=true`;
           }).join('\n');
  }

  /**
   * Genera configuración adicional del nodo
   * @param nodeConfig Configuración del nodo
   */
  private getAdditionalOptionsConfig(nodeConfig: BesuNodeConfig): string {
    if (!nodeConfig.additionalOptions || Object.keys(nodeConfig.additionalOptions).length === 0) {
      return '';
    }

    const options = Object.entries(nodeConfig.additionalOptions)
      .map(([key, value]) => {
        // Si el valor es 'true' o 'false', no usar comillas
        if (value === 'true' || value === 'false') {
          return `${key}=${value}`;
        }
        // Para otros valores, usar comillas
        return `${key}="${value}"`;
      })
      .join('\n');

    return `\n# Opciones adicionales\n${options}`;
  }

  /**
   * Genera configuración de logging y opciones adicionales sin duplicaciones
   * @param nodeConfig Configuración del nodo
   */
  private getLoggingAndAdditionalConfig(nodeConfig: BesuNodeConfig): string {
    let config = '# Configuración de logging\n';
    
    // Verificar si logging está en additionalOptions
    const hasLoggingInAdditional = nodeConfig.additionalOptions && 'logging' in nodeConfig.additionalOptions;
    
    if (hasLoggingInAdditional) {
      // Si logging está en additionalOptions, usar ese valor
      config += `logging="${nodeConfig.additionalOptions!.logging}"\n`;
      
      // Generar otras opciones adicionales excluyendo logging
      const otherOptions = Object.entries(nodeConfig.additionalOptions!)
        .filter(([key]) => key !== 'logging')
        .map(([key, value]) => {
          if (value === 'true' || value === 'false') {
            return `${key}=${value}`;
          }
          return `${key}="${value}"`;
        })
        .join('\n');
      
      if (otherOptions) {
        config += `\n# Opciones adicionales\n${otherOptions}`;
      }
    } else {
      // Si no hay logging en additionalOptions, usar valor por defecto
      config += 'logging="INFO"\n';
      
      // Agregar todas las opciones adicionales
      const additionalConfig = this.getAdditionalOptionsConfig(nodeConfig);
      if (additionalConfig) {
        config += additionalConfig;
      }
    }
    
    return config;
  }
}