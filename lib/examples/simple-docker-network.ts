import { DockerNetworkManager, LogLevel } from '../src';

async function main() {
  // Crear una instancia del gestor de redes Docker
  const dockerManager = new DockerNetworkManager(LogLevel.INFO);

  try {
    // 1. Crear una red Docker simple
    console.log('Creando red Docker básica...');
    const networkName = 'mi-red-simple';
    await dockerManager.createNetwork(networkName);

    // 2. Listar todas las redes para verificar
    console.log('\nListando todas las redes Docker:');
    const networks = await dockerManager.getNetworks();
    console.log(networks.map(n => n.Name));

    // 3. Obtener contenedores en la red (estará vacía)
    console.log('\nContenedores en la red:');
    const containers = await dockerManager.getNetworkContainers(networkName);
    console.log(containers.length === 0 ? 'No hay contenedores' : containers);

    // 4. Eliminar la red
    console.log('\nEliminando la red...');
    await dockerManager.removeNetwork(networkName);

    console.log('\n¡Ejemplo completado con éxito!');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Ejecutar el ejemplo
main().catch(console.error);