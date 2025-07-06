/**
 * Biblioteca para gestionar redes Besu
 */

// Exportar modelos
export * from './models/types';

// Exportar servicios
export { BesuNetworkManager } from './services/BesuNetworkManager';
export { BesuNodeManager } from './services/BesuNodeManager';
export { DockerService } from './services/DockerService';
export { DockerNetworkManager } from './services/DockerNetworkManager';
export { GenesisGenerator } from './services/GenesisGenerator';
export { KeyGenerator } from './services/KeyGenerator';
export { ConfigGenerator } from './services/ConfigGenerator';
export { TransactionService } from './services/TransactionService';

// Exportar utilidades
export { FileSystem } from './utils/FileSystem';
export { Logger, LogLevel } from './utils/Logger';
export { NodeConfigFactory } from './utils/NodeConfigFactory';

import { LogLevel, Logger } from './utils/Logger';

import { BesuNetworkConfig } from './models/types';
import { BesuNetworkManager } from './services/BesuNetworkManager';
import { BesuNodeManager } from './services/BesuNodeManager';
import { ConfigGenerator } from './services/ConfigGenerator';
import { DockerNetworkManager } from './services/DockerNetworkManager';
import { DockerService } from './services/DockerService';
import { FileSystem } from './utils/FileSystem';
import { GenesisGenerator } from './services/GenesisGenerator';
import { KeyGenerator } from './services/KeyGenerator';
import { NodeConfigFactory } from './utils/NodeConfigFactory';

// Función de ayuda para crear una instancia de BesuNetworkManager con todas las dependencias










/**
 * Crea una instancia de BesuNetworkManager con todas las dependencias necesarias
 * @param config Configuración de la red Besu
 * @param logLevel Nivel de log (opcional)
 * @returns Instancia de BesuNetworkManager
 */
export function createBesuNetwork(config: BesuNetworkConfig, logLevel: LogLevel = LogLevel.INFO): BesuNetworkManager {
  const logger = new Logger({ level: logLevel });
  const fs = new FileSystem();
  const docker = new DockerService({}, logger);
  const genesisGenerator = new GenesisGenerator(logger, fs);
  const keyGenerator = new KeyGenerator(logger, fs);
  const configGenerator = new ConfigGenerator(logger, fs);
  const nodeManager = new BesuNodeManager(docker, logger, fs, keyGenerator, config.dataDir || './data');
  
  return new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator, configGenerator, nodeManager);
}

/**
 * Crea una instancia de BesuNodeManager con todas las dependencias necesarias
 * @param dataDir Directorio de datos para los nodos (opcional)
 * @param logLevel Nivel de log (opcional)
 * @returns Instancia de BesuNodeManager
 */
export function createBesuNodeManager(dataDir: string = './temp-nodes', logLevel: LogLevel = LogLevel.INFO): BesuNodeManager {
  const logger = new Logger({ level: logLevel });
  const fs = new FileSystem();
  const docker = new DockerService({}, logger);
  const keyGenerator = new KeyGenerator(logger, fs);
  
  return new BesuNodeManager(docker, logger, fs, keyGenerator, dataDir);
}

/**
 * Crea una instancia de DockerNetworkManager con todas las dependencias necesarias
 * @param logLevel Nivel de log (opcional)
 * @returns Instancia de DockerNetworkManager
 */
export function createDockerNetworkManager(logLevel: LogLevel = LogLevel.INFO): DockerNetworkManager {
  return new DockerNetworkManager(logLevel);
}

/**
 * Crea una instancia de GenesisGenerator con todas las dependencias necesarias
 * @param logLevel Nivel de log (opcional)
 * @returns Instancia de GenesisGenerator
 */
export function createGenesisGenerator(logLevel: LogLevel = LogLevel.INFO): GenesisGenerator {
  const logger = new Logger({ level: logLevel });
  const fs = new FileSystem();
  return new GenesisGenerator(logger, fs);
}

/**
 * Crea una instancia de ConfigGenerator con todas las dependencias necesarias
 * @param logLevel Nivel de log (opcional)
 * @returns Instancia de ConfigGenerator
 */
export function createConfigGenerator(logLevel: LogLevel = LogLevel.INFO): ConfigGenerator {
  const logger = new Logger({ level: logLevel });
  const fs = new FileSystem();
  return new ConfigGenerator(logger, fs);
}

/**
 * Crea una instancia de Logger
 * @param logLevel Nivel de log (opcional)
 * @returns Instancia de Logger
 */
export function createLogger(logLevel: LogLevel = LogLevel.INFO): Logger {
  return new Logger({ level: logLevel });
}

/**
 * Crea una instancia de FileSystem
 * @returns Instancia de FileSystem
 */
export function createFileSystem(): FileSystem {
  return new FileSystem();
}

/**
 * Crea una instancia de DockerService con todas las dependencias necesarias
 * @param logLevel Nivel de log (opcional)
 * @returns Instancia de DockerService
 */
export function createDockerService(logLevel: LogLevel = LogLevel.INFO): DockerService {
  const logger = new Logger({ level: logLevel });
  return new DockerService({}, logger);
}