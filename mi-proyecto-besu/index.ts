import { BesuNetworkConfig, LogLevel, createBesuNetwork } from 'besu-network-manager';

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import {rimraf} from 'rimraf';

const execAsync = promisify(exec);

// Generar un nombre único para la red
const networkName = `mi-red-besu`;

// Configuración de la red con parámetros adicionales
const networkConfig: BesuNetworkConfig = {
  name: networkName,
  chainId: 1337,
  consensusProtocol: 'clique',
  blockPeriod: 5,
  nodeCount: 5, // Reducido a 1 nodo para simplificar
  baseRpcPort: 8545,
  baseP2pPort: 30303,
  dataDir: path.join(process.cwd(), 'data'),
  // Añadir cualquier configuración adicional que pueda ayudar
  additionalOptions: {
    // Configuración adicional para Besu
    "enable-p2p": "true",
    "enable-discovery": "true"
  }
};

// Función para limpiar el directorio de datos
function cleanDataDir(dirPath: string) {
  console.log(`Limpiando directorio de datos: ${dirPath}`);
  if (fs.existsSync(dirPath)) {
    console.log('El directorio de datos existe, eliminando...');
    rimraf.sync(dirPath);
    console.log('Directorio de datos eliminado correctamente');
  }
  // Crear el directorio vacío
  fs.mkdirSync(dirPath, { recursive: true });
  console.log('Directorio de datos creado correctamente');
}

// Función para esperar un tiempo específico
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Función principal
async function main() {
  try {
    
    // Crear la red Besu usando la función de fábrica
    console.log(`Creando la red ${networkName}...`);
    const besuNetwork = createBesuNetwork(networkConfig, LogLevel.DEBUG);
    
    // Limpiar la red
    console.log(`Limpiando la red ${networkName}...`);
    await besuNetwork.stop();
    // Limpiar directorio de datos antes de inicializar
    cleanDataDir(networkConfig.dataDir); 
    
    // Inicializar la red
    console.log(`Inicializando la red ${networkName}...`);
    await besuNetwork.initialize();
    
    // Iniciar la red
    console.log(`Iniciando la red ${networkName}...`);
    try {
      await besuNetwork.start();
      console.log('Red iniciada correctamente');
    } catch (error) {
      console.error(`Error al iniciar la red: ${error}`);
      // Intentar continuar a pesar del error
      console.log('Intentando continuar a pesar del error...');
    }
    
    // Esperar un tiempo mucho más largo para que la red se estabilice
    console.log('Esperando a que la red se estabilice...');
    await sleep(20000); // Esperar 60 segundos
    
    // Obtener el estado de la red
    console.log('Obteniendo el estado de la red...');
    try {
      const status = await besuNetwork.getStatus();
      console.log('Estado de la red:');
      console.log(JSON.stringify(status, null, 2));
    } catch (error) {
      console.error(`Error al obtener el estado de la red: ${error}`);
      // Continuar a pesar del error
    }
    
    // Esperar antes de detener la red
    console.log('\nLa red está en funcionamiento. Presiona Ctrl+C para detenerla...');
    
    // Manejar la señal de interrupción para detener la red correctamente
    process.on('SIGINT', async () => {
      console.log('\nDeteniendo la red...');
      try {
        await besuNetwork.stop();
        console.log('Red detenida correctamente.');
      } catch (error) {
        console.error(`Error al detener la red: ${error}`);
        // Intentar limpiar manualmente
        /* await cleanDockerResources(); */
      }
      process.exit(0);
    });
  } catch (error) {
    console.error('Error:', error);
    // Intentar limpiar recursos
    /* await cleanDockerResources(); */
    process.exit(1);
  }
}

// Ejecutar la función principal
main();