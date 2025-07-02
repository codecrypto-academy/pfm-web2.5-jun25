/**
 * Biblioteca para gestionar redes Besu
 */

// Exportar modelos
export * from './models/types';

// Exportar servicios
export { BesuNetworkManager } from './services/BesuNetworkManager';
export { DockerService } from './services/DockerService';
export { GenesisGenerator } from './services/GenesisGenerator';
export { KeyGenerator } from './services/KeyGenerator';
export { TransactionService } from './services/TransactionService';

// Exportar utilidades
export { FileSystem } from './utils/FileSystem';
export { Logger, LogLevel } from './utils/Logger';
export { NodeConfigFactory } from './utils/NodeConfigFactory';

import { LogLevel, Logger } from './utils/Logger';

// Función de ayuda para crear una instancia de BesuNetworkManager con todas las dependencias
import { BesuNetworkConfig } from './models/types';
import { BesuNetworkManager } from './services/BesuNetworkManager';
import { ConfigGenerator } from './services/ConfigGenerator';
import { DockerService } from './services/DockerService';
import { FileSystem } from './utils/FileSystem';
import { GenesisGenerator } from './services/GenesisGenerator';
import { KeyGenerator } from './services/KeyGenerator';
import { NodeConfigFactory } from './utils/NodeConfigFactory';

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
  
  return new BesuNetworkManager(config, docker, logger, fs, genesisGenerator, keyGenerator, configGenerator);
}