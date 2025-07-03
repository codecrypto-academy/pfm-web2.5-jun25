import { DockerNetworkManager, LogLevel } from '../src';

async function main() {
  // Crear una instancia del gestor de redes Docker
  const dockerManager = new DockerNetworkManager(LogLevel.INFO);

  try {
    // 1. Crear una nueva red Docker
    console.log('Creando red Docker...');
    const networkName = 'mi-red-besu';
    await dockerManager.createNetwork(networkName);

    // 2. Listar las redes existentes
    console.log('\nListando redes Docker:');
    const networks = await dockerManager.getNetworks();
    console.log(networks.map(n => n.Name));

    // 3. Crear un nodo Besu en la red
    console.log('\nCreando nodo Besu...');
    const containerId = await dockerManager.createBesuContainer({
      name: 'mi-nodo-besu',
      network: networkName,
      rpcPort: '8545',
      p2pPort: '30303',
      volumes: ['/tmp/besu-data:/data'],
      additionalOptions: {
        'BESU_NETWORK': 'dev'
      }
    });
    console.log(`Contenedor creado con ID: ${containerId}`);

    // 4. Obtener información del contenedor
    console.log('\nObteniendo información del contenedor:');
    const containerInfo = await dockerManager.getContainerInfo('mi-nodo-besu');
    console.log(containerInfo);

    // 5. Listar contenedores en la red
    console.log('\nListando contenedores en la red:');
    const containers = await dockerManager.getNetworkContainers(networkName);
    console.log(containers.map(c => c.name));

    // 6. Eliminar el contenedor
    console.log('\nEliminando contenedor...');
    await dockerManager.removeContainer('mi-nodo-besu');

    // 7. Eliminar la red
    console.log('\nEliminando red Docker...');
    await dockerManager.removeNetwork(networkName);

    console.log('\n¡Ejemplo completado con éxito!');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Ejecutar el ejemplo
main().catch(console.error);