/**
 * Ejemplo de uso de la biblioteca para crear una red Besu simple
 */
import * as path from 'path';

import { BesuNetworkConfig, LogLevel, createBesuNetwork } from '../src';

// Importar ejemplo de config.toml
import { generateConfigTomlExample } from './config-toml-example';

/**
 * Función principal
 */
async function main() {
  try {
    // Configuración de la red
    const config: BesuNetworkConfig = {
      name: 'simple-network',
      chainId: 1337,
      consensusProtocol: 'clique',
      blockPeriod: 5,
      nodeCount: 3,
      baseRpcPort: 8545,
      baseP2pPort: 30303,
      dataDir: path.join(__dirname, '../data')
    };

    // Crear la red Besu
    const besuNetwork = createBesuNetwork(config, LogLevel.DEBUG);

    // Inicializar la red (forzar creación nueva)
    await besuNetwork.initialize(true);

    // Iniciar la red (ahora genera los config.toml automáticamente en la secuencia correcta)
    await besuNetwork.start();

    // Mostrar el estado de la red
    const status = await besuNetwork.getStatus();
    console.log("Network status:", status);

    console.log("La red está en ejecución. Pulsa Ctrl+C para detenerla.");
    // Mantener el proceso en ejecución hasta Ctrl+C
    process.stdin.resume();
    process.on("SIGINT", async () => {
      console.log("\nDeteniendo la red...");
      await besuNetwork.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

/**
 * Ejemplo adicional: Generar archivos config.toml para Clique
 */
async function runConfigTomlExample() {
  console.log('\n=== Ejecutando ejemplo de config.toml para Clique ===');
  console.log('Para ver un ejemplo completo de generación de archivos config.toml,');
  console.log('ejecuta: npm run example:config-toml');
  console.log('O revisa el archivo: examples/config-toml-example.ts');
  console.log('Documentación: docs/CONFIG-TOML.md');
  console.log('Nota: Solo se soporta consenso Clique');
}

// Ejecutar el ejemplo
if (require.main === module) {
  main()
    .then(() => runConfigTomlExample())
    .catch(console.error);
}