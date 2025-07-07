import * as path from 'path';
import { BesuNodeConfig, BesuNodeType } from '../models/types';

/**
 * Factory para crear configuraciones de nodos según su tipo
 */
export class NodeConfigFactory {
  /**
   * Crea una configuración de nodo según el tipo especificado
   * @param nodeType Tipo de nodo a crear
   * @param name Nombre del nodo
   * @param rpcPort Puerto RPC
   * @param p2pPort Puerto P2P
   * @param dataDir Directorio de datos
   * @param validatorAddress Dirección del validador (requerida para SIGNER)
   * @param privateKey Clave privada (requerida para SIGNER y MINER)
   * @param additionalOptions Opciones adicionales
   */
  static createNodeConfig(
    nodeType: BesuNodeType,
    name: string,
    rpcPort: number,
    p2pPort: number,
    dataDir: string,
    validatorAddress?: string,
    privateKey?: string,
    additionalOptions?: Record<string, string>
  ): BesuNodeConfig {
    // Validaciones según el tipo de nodo
    this.validateNodeConfig(nodeType, validatorAddress, privateKey);

    const config: BesuNodeConfig = {
      name,
      nodeType,
      rpcPort,
      p2pPort,
      dataDir: path.resolve(dataDir),
      enabledApis: this.getDefaultApis(nodeType),
      additionalOptions: additionalOptions || {}
    };

    // Configuraciones específicas por tipo
    switch (nodeType) {
      case BesuNodeType.SIGNER:
        if (!validatorAddress) {
          throw new Error('validatorAddress es requerida para nodos SIGNER');
        }
        if (!privateKey) {
          throw new Error('privateKey es requerida para nodos SIGNER');
        }
        config.validatorAddress = validatorAddress;
        config.privateKey = privateKey;
        break;

      case BesuNodeType.MINER:
        if (!privateKey) {
          throw new Error('privateKey es requerida para nodos MINER');
        }
        config.privateKey = privateKey;
        // Los mineros pueden tener una dirección para recibir rewards
        if (validatorAddress) {
          config.validatorAddress = validatorAddress;
        }
        break;

      case BesuNodeType.NORMAL:
        // Los nodos normales no requieren configuraciones especiales
        // Pueden tener clave privada opcional para enviar transacciones
        if (privateKey) {
          config.privateKey = privateKey;
        }
        if (validatorAddress) {
          config.validatorAddress = validatorAddress;
        }
        break;

      default:
        throw new Error(`Tipo de nodo no soportado: ${nodeType}`);
    }

    return config;
  }

  /**
   * Valida la configuración según el tipo de nodo
   */
  private static validateNodeConfig(
    nodeType: BesuNodeType,
    validatorAddress?: string,
    privateKey?: string
  ): void {
    switch (nodeType) {
      case BesuNodeType.SIGNER:
        if (!validatorAddress) {
          throw new Error('Los nodos SIGNER requieren una validatorAddress');
        }
        if (!privateKey) {
          throw new Error('Los nodos SIGNER requieren una privateKey');
        }
        break;

      case BesuNodeType.MINER:
        if (!privateKey) {
          throw new Error('Los nodos MINER requieren una privateKey');
        }
        break;

      case BesuNodeType.NORMAL:
        // Los nodos normales no tienen requisitos estrictos
        break;

      default:
        throw new Error(`Tipo de nodo no válido: ${nodeType}`);
    }
  }

  /**
   * Obtiene las APIs por defecto según el tipo de nodo
   */
  private static getDefaultApis(nodeType: BesuNodeType): string[] {
    const baseApis = ['ETH', 'NET', 'WEB3'];
    
    switch (nodeType) {
      case BesuNodeType.SIGNER:
        // Los validadores necesitan APIs adicionales para el consenso
        return [...baseApis, 'CLIQUE', 'ADMIN', 'DEBUG', 'MINER'];

      case BesuNodeType.MINER:
        // Los mineros necesitan APIs de minería
        return [...baseApis, 'MINER', 'ADMIN'];

      case BesuNodeType.NORMAL:
        // Los nodos normales solo necesitan APIs básicas
        return baseApis;

      default:
        return baseApis;
    }
  }

  /**
   * Crea múltiples configuraciones de nodos
   */
  static createMultipleNodeConfigs(
    configs: Array<{
      nodeType: BesuNodeType;
      name: string;
      rpcPort: number;
      p2pPort: number;
      dataDir: string;
      validatorAddress?: string;
      privateKey?: string;
      additionalOptions?: Record<string, string>;
    }>
  ): BesuNodeConfig[] {
    return configs.map(config => 
      this.createNodeConfig(
        config.nodeType,
        config.name,
        config.rpcPort,
        config.p2pPort,
        config.dataDir,
        config.validatorAddress,
        config.privateKey,
        config.additionalOptions
      )
    );
  }

  /**
   * Obtiene la configuración de comando Besu según el tipo de nodo
   */
  static getBesuCommandOptions(nodeConfig: BesuNodeConfig): string[] {
    const options: string[] = [];

    switch (nodeConfig.nodeType) {
      case BesuNodeType.SIGNER:
        // En Clique, los nodos SIGNER validan automáticamente si tienen la clave privada
        // No necesitan miner-enabled=true
        break;

      case BesuNodeType.MINER:
        options.push('--miner-enabled=true');
        // Para nodos MINER en Clique, el miner-coinbase debería ser una dirección de validador
        // que esté en el extraData del genesis, no necesariamente la dirección del nodo
        // Si no se especifica validatorAddress, se puede omitir miner-coinbase
        if (nodeConfig.validatorAddress) {
          options.push(`--miner-coinbase=${nodeConfig.validatorAddress}`);
        }
        break;

      case BesuNodeType.NORMAL:
        // Los nodos normales no tienen opciones especiales de minería
        break;
    }

    return options;
  }
}