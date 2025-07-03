/**
 * Ejemplo funcional de tipos de nodos en una red Besu
 * Levanta una red real con configuraciones específicas de nodos
 * Demuestra el uso de las nuevas propiedades: isValidator, isBootnode, linkedTo, nodeType
 */
import * as path from 'path';

import { BesuNetworkConfig, BesuNodeType, NodeCreationConfig, createBesuNetwork } from '../src';

/**
 * Función principal para levantar la red Besu con diferentes tipos de nodos
 */
async function main() {
  try {
    console.log('=== Iniciando red Besu con configuraciones específicas de nodos ===');
    
    // Configuración específica de cada nodo con las nuevas propiedades
    const nodeCreationConfigs: NodeCreationConfig[] = [
      {
        name: 'validator-bootnode',
        nodeType: BesuNodeType.SIGNER,
        isValidator: true,
        isBootnode: true,
        rpcPort: 8545,
        p2pPort: 30303,
        additionalOptions: {
          'logging': 'INFO'
        }
      },
      {
        name: 'miner-node',
        nodeType: BesuNodeType.MINER,
        isValidator: false,
        isBootnode: false,
        linkedTo: 'validator-bootnode',
        rpcPort: 8546,
        p2pPort: 30304
      },
      {
        name: 'normal-node-1',
        nodeType: BesuNodeType.NORMAL,
        isValidator: false,
        isBootnode: false,
        linkedTo: 'validator-bootnode',
        rpcPort: 8547,
        p2pPort: 30305
      },
      {
        name: 'normal-node-2',
        nodeType: BesuNodeType.NORMAL,
        isValidator: false,
        isBootnode: false,
        linkedTo: 'miner-node',
        rpcPort: 8548,
        p2pPort: 30306
      }
    ];
    
    // Configuración de la red usando las nuevas configuraciones de nodos
    const networkConfig: BesuNetworkConfig = {
      name: 'advanced-node-types-network',
      chainId: 1337,
      consensusProtocol: 'clique',
      blockPeriod: 5,
      nodeCount: 4, // Se mantiene para compatibilidad, pero se usará nodeCreationConfigs
      baseRpcPort: 8545,
      baseP2pPort: 30303,
      dataDir: path.resolve(process.cwd(), 'data'),
      // Usar las nuevas configuraciones de creación de nodos
      nodeCreationConfigs: nodeCreationConfigs
    };

    console.log('\n=== Configuración de red ===');
    console.log(`Nombre: ${networkConfig.name}`);
    console.log(`Chain ID: ${networkConfig.chainId}`);
    console.log(`Consenso: ${networkConfig.consensusProtocol}`);
    console.log(`Número de nodos: ${networkConfig.nodeCount}`);
    
    console.log('\n=== Configuraciones de nodos ===');
    nodeCreationConfigs.forEach((config, index) => {
      console.log(`Nodo ${index + 1}: ${config.name}`);
      console.log(`  Tipo: ${config.nodeType}`);
      console.log(`  Es Validador: ${config.isValidator}`);
      console.log(`  Es Bootnode: ${config.isBootnode}`);
      console.log(`  Vinculado a: ${config.linkedTo || 'Ninguno'}`);
      console.log(`  Puerto RPC: ${config.rpcPort}`);
      console.log(`  Puerto P2P: ${config.p2pPort}`);
    });

    // Crear la red Besu
    console.log('\n=== Creando red Besu ===');
    const network = createBesuNetwork(networkConfig);

    // Inicializar la red (limpiando datos anteriores)
    console.log('\n=== Inicializando red ===');
    await network.initialize(true); // true = limpiar datos anteriores
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
      
      // Mostrar las nuevas propiedades si están disponibles
      const nodeConfig = networkConfig.nodeCreationConfigs?.find(config => config.name === node.name);
      if (nodeConfig) {
        console.log(`  Es Validador: ${nodeConfig.isValidator ? 'SÍ' : 'NO'}`);
        console.log(`  Es Bootnode: ${nodeConfig.isBootnode ? 'SÍ' : 'NO'}`);
        console.log(`  Vinculado a: ${nodeConfig.linkedTo || 'Ninguno'}`);
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
    console.log('\nCaracterísticas implementadas:');
    console.log('✅ Configuración específica de nodos con propiedades personalizadas');
    console.log('✅ isValidator: Control explícito de validadores');
    console.log('✅ isBootnode: Designación de nodos de arranque');
    console.log('✅ linkedTo: Vinculación entre nodos');
    console.log('✅ nodeType: Tipos específicos (SIGNER, MINER, NORMAL)');
    console.log('✅ Puertos personalizados por nodo');
    console.log('✅ Generación de nodos integrada en BesuNetworkManager');
    
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