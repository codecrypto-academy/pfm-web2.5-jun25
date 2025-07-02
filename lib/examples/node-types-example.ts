/**
 * Ejemplo funcional de tipos de nodos en una red Besu
 * Levanta una red real con 1 SIGNER, 1 MINER y 2 NORMAL
 */
import * as path from 'path';

import { BesuNetworkConfig, BesuNodeType, createBesuNetwork } from '../src';

/**
 * Función principal para levantar la red Besu con diferentes tipos de nodos
 */
async function main() {
  try {
    console.log('=== Iniciando red Besu con tipos de nodos específicos ===');
    
    // Configuración de la red con tipos específicos de nodos
    const networkConfig: BesuNetworkConfig = {
      name: 'node-types-network',
      chainId: 1337,
      consensusProtocol: 'clique',
      blockPeriod: 5,
      nodeCount: 4,
      baseRpcPort: 8545,
      baseP2pPort: 30303,
      dataDir: path.join(__dirname, '../data'),
      // Especificar tipos de nodos: 1 SIGNER, 1 MINER, 2 NORMAL
      nodeTypes: [
        BesuNodeType.SIGNER,  // Nodo 0: Validador
        BesuNodeType.MINER,   // Nodo 1: Minero
        BesuNodeType.NORMAL,  // Nodo 2: Normal
        BesuNodeType.NORMAL   // Nodo 3: Normal
      ]
    };

    console.log('\n=== Configuración de red ===');
    console.log(`Nombre: ${networkConfig.name}`);
    console.log(`Chain ID: ${networkConfig.chainId}`);
    console.log(`Consenso: ${networkConfig.consensusProtocol}`);
    console.log(`Número de nodos: ${networkConfig.nodeCount}`);
    console.log(`Tipos de nodos: ${networkConfig.nodeTypes?.join(', ') || 'No especificados'}`);

    // Crear la red Besu
    console.log('\n=== Creando red Besu ===');
    const network = createBesuNetwork(networkConfig);

    // Inicializar la red
    console.log('\n=== Inicializando red ===');
    await network.initialize();
    console.log('✅ Red inicializada correctamente');

    // Iniciar la red
    console.log('\n=== Iniciando nodos ===');
    await network.start();
    console.log('✅ Red iniciada correctamente');

    // Esperar un momento para que los nodos se estabilicen
    console.log('\n=== Esperando estabilización de nodos ===');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Obtener el estado de la red
    console.log('\n=== Estado de la red ===');
    const status = await network.getStatus();
    
    console.log(`Red: ${status.name}`);
    console.log(`Network ID: ${status.networkId}`);
    console.log(`Tiempo activo: ${Math.round(status.uptime / 1000)}s`);
    console.log(`Último bloque: ${status.lastBlock || 'N/A'}`);
    console.log(`Número de nodos: ${status.nodes.length}`);

    // Mostrar detalles de cada nodo
    console.log('\n=== Detalles de nodos ===');
    for (const node of status.nodes) {
      console.log(`\nNodo: ${node.name}`);
      console.log(`  Tipo: ${node.nodeType || 'N/A'}`);
      console.log(`  Estado: ${node.containerStatus}`);
      console.log(`  Puerto RPC: ${node.ports.rpc}`);
      console.log(`  Puerto P2P: ${node.ports.p2p}`);
      console.log(`  IP: ${node.ipAddress || 'N/A'}`);
      console.log(`  Bloque actual: ${node.blockNumber || 'N/A'}`);
      console.log(`  Peers: ${node.peerCount || 'N/A'}`);
      console.log(`  Minando: ${node.isMining ? 'SÍ' : 'NO'}`);
      if (node.nodeType === BesuNodeType.SIGNER) {
        console.log(`  Validando: ${node.isValidating ? 'SÍ' : 'NO'}`);
      }
      if (node.enodeUrl) {
        console.log(`  Enode: ${node.enodeUrl.substring(0, 50)}...`);
      }
    }

    // Mostrar URLs de conexión
    console.log('\n=== URLs de conexión ===');
    for (const node of status.nodes) {
      console.log(`${node.name}: http://localhost:${node.ports.rpc}`);
    }

    console.log('\n=== Red funcionando correctamente ===');
    console.log('\nTipos de nodos configurados:');
    console.log('✅ SIGNER: Nodo validador que puede firmar bloques');
    console.log('✅ MINER: Nodo que procesa transacciones');
    console.log('✅ NORMAL: Nodos que sincronizan la blockchain');
    
    console.log('\n=== Comandos útiles ===');
    console.log('Para detener la red: network.stop()');
    console.log('Para limpiar datos: network.cleanup()');
    console.log('Para ver logs: docker logs <container_name>');
    
    // Mantener la red corriendo
    console.log('\n=== Red en funcionamiento ===');
    console.log('La red está corriendo. Presiona Ctrl+C para detener.');
    
    // Manejar la señal de interrupción para limpiar recursos
    process.on('SIGINT', async () => {
      console.log('\n\n=== Deteniendo red ===');
      try {
        await network.stop();
        console.log('✅ Red detenida correctamente');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error al detener la red:', error);
        process.exit(1);
      }
    });

    // Mantener el proceso vivo
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Ejecutar el ejemplo
if (require.main === module) {
  main().catch(console.error);
}

export { main };