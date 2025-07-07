/**
 * Biblioteca para gestionar redes Besu
 */

// Exportar tipos utilizados
export { BesuNodeType, BesuNodeConfig, NodeCreationConfig } from './models/types';

// Exportar servicios utilizados
export { BesuNodeManager } from './services/BesuNodeManager';
export { DockerService } from './services/DockerService';
export { DockerNetworkManager } from './services/DockerNetworkManager';
export { GenesisGenerator } from './services/GenesisGenerator';
export { ConfigGenerator } from './services/ConfigGenerator';

// Exportar utilidades utilizadas
export { FileSystem } from './utils/FileSystem';
export { Logger, LogLevel } from './utils/Logger';

import { LogLevel, Logger } from './utils/Logger';

import { BesuNodeManager } from './services/BesuNodeManager';
import { ConfigGenerator } from './services/ConfigGenerator';
import { DockerNetworkManager } from './services/DockerNetworkManager';
import { DockerService } from './services/DockerService';
import { FileSystem } from './utils/FileSystem';
import { GenesisGenerator } from './services/GenesisGenerator';

/**
 * Crea una instancia de BesuNodeManager con todas las dependencias necesarias
 * @param dataDir Directorio de datos para los nodos (opcional)
 * @param logLevel Nivel de log (opcional)
 * @returns Instancia de BesuNodeManager
 */
export function createBesuNodeManager(dataDir?: string, logLevel: LogLevel = LogLevel.INFO): BesuNodeManager {
  const logger = new Logger({ level: logLevel });
  const fs = new FileSystem();
  const docker = new DockerService({}, logger);
  
  // Si no se proporciona dataDir, usar una ruta absoluta por defecto
  const defaultDataDir = dataDir || require('path').resolve(process.cwd(), 'temp-nodes');
  
  return new BesuNodeManager(docker, logger, fs, defaultDataDir);
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