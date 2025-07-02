import { LogLevel, Logger } from '../src/utils/Logger';

import { BesuNetworkConfig } from '../src/models/types';
import { FileSystem } from '../src/utils/FileSystem';
import { createBesuNetwork } from '../src/index';

/**
 * Ejemplo de uso del ConfigGenerator para crear archivos config.toml
 * para nodos Besu que se conectan al bootnode
 */
async function generateConfigTomlExample() {
  const logger = new Logger({ level: LogLevel.INFO });
  const fs = new FileSystem();

  // Configuración de la red
  const networkConfig: BesuNetworkConfig = {
    name: 'red-ejemplo-toml',
    chainId: 1337,
    consensusProtocol: 'clique',
    blockPeriod: 15,
    nodeCount: 4,
    baseRpcPort: 8545,
    baseP2pPort: 30303,
    dataDir: './data/red-ejemplo-toml'
  };

  // Crear el manager de red
  const networkManager = createBesuNetwork(networkConfig);

  try {
    logger.info('=== Ejemplo: Generación de archivos config.toml ===');
    
    // 1. Inicializar la red (esto genera las claves y el genesis)
    await networkManager.initialize(true); // true para limpiar datos existentes
    
    // 2. Generar archivos config.toml para consenso Clique
    logger.info('\n--- Generando archivos config.toml para Clique ---');
    await networkManager.generateConfigFiles();
    
    // 3. Ejemplo con enode del bootnode específico
    const bootnodeEnode = 'enode://abc123...@172.18.0.2:30303';
    logger.info('\n--- Generando archivos config.toml con bootnode específico ---');
    await networkManager.generateConfigFiles(bootnodeEnode);
    

    
    logger.info('\n=== Archivos config.toml generados exitosamente ===');
    logger.info('Los archivos se encuentran en los directorios de cada nodo:');
    
    if (networkConfig.nodes) {
      networkConfig.nodes.forEach((node, index) => {
        logger.info(`  Nodo ${index}: ${node.dataDir}/config.toml`);
      });
    }
    
    logger.info('\n=== Contenido de ejemplo de config.toml para Clique ===');
    logger.info(`
# Configuración del Nodo Besu: red-ejemplo-toml-node-1
# Generado automáticamente para consenso Clique

# Configuración de datos
data-path="/data"
genesis-file="/genesis.json"

# Configuración de red
network-id=1337
p2p-enabled=true
p2p-host="0.0.0.0"
p2p-port=30303
max-peers=25
discovery-enabled=true

# Configuración de bootnode
bootnodes=["${bootnodeEnode}"]

# Configuración RPC
rpc-http-enabled=true
rpc-http-host="0.0.0.0"
rpc-http-port=8545
rpc-http-cors-origins=["*"]
rpc-http-api=["ETH", "NET", "WEB3", "ADMIN", "DEBUG"]

# Configuración de minería para Clique
miner-enabled=true
miner-coinbase="0x..."
miner-stratum-enabled=false

# Configuración de sincronización
sync-mode="FULL"

# Configuración de seguridad
host-allowlist=["*"]

# Configuración de logging
logging="INFO"
`);
    
  } catch (error) {
    logger.error('Error al generar archivos config.toml:', error);
  }
}

/**
 * Ejemplo de uso con Docker usando archivos config.toml
 */
async function dockerWithConfigTomlExample() {
  const logger = new Logger({ level: LogLevel.INFO });
  
  logger.info('\n=== Ejemplo: Uso de config.toml con Docker ===');
  logger.info(`
# Comando Docker para iniciar nodo con config.toml:
docker run -d \\
  --name besu-node-1 \\
  --network besu-network \\
  -v /ruta/al/nodo/data:/data \\
  -v /ruta/al/genesis.json:/genesis.json \\
  -v /ruta/al/config.toml:/config.toml \\
  -p 8545:8545 \\
  -p 30303:30303 \\
  hyperledger/besu:latest \\
  --config-file=/config.toml
`);
  
  logger.info(`
# Ventajas de usar config.toml:
- Configuración más limpia y legible
- Fácil mantenimiento y versionado
- Menos parámetros en línea de comandos
- Configuración reutilizable
- Mejor organización de opciones complejas
`);
}

// Ejecutar ejemplos
if (require.main === module) {
  generateConfigTomlExample()
    .then(() => dockerWithConfigTomlExample())
    .then(() => {
      console.log('\n✅ Ejemplos completados exitosamente');
    })
    .catch((error) => {
      console.error('❌ Error en los ejemplos:', error);
      process.exit(1);
    });
}

export { generateConfigTomlExample, dockerWithConfigTomlExample };