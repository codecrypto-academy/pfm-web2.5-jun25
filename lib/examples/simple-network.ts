/**
 * Ejemplo de uso de la biblioteca para crear una red Besu simple
 */
import * as path from 'path';
import { createBesuNetwork, BesuNetworkConfig, LogLevel } from '../src';

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

    // Inicializar la red (generar claves y archivo génesis)
    await besuNetwork.initialize();

    // Iniciar la red
    await besuNetwork.start();

    // Mostrar el estado de la red
    const status = await besuNetwork.getStatus();
    console.log('Estado de la red:');
    console.log(JSON.stringify(status, null, 2));

    // Mantener la red en ejecución hasta que se pulse Ctrl+C
    console.log('\nRed Besu iniciada. Presiona Ctrl+C para detener...');
    process.on('SIGINT', async () => {
      console.log('\nDeteniendo la red Besu...');
      await besuNetwork.stop();
      console.log('Red Besu detenida.');
      process.exit(0);
    });
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Ejecutar la función principal
main();