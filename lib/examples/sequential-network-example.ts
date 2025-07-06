/**
 * Ejemplo de levantamiento secuencial de una red Besu
 * Demuestra cómo levantar nodos de forma secuencial:
 * 1. Bootnode validador (SIGNER)
 * 2. Nodo minero (MINER) conectado al bootnode
 * 3. Nodo normal (NORMAL) conectado al bootnode
 */
import * as path from 'path';

import {
  BesuNetworkConfig,
  BesuNodeConfig,
  BesuNodeType,
  LogLevel,
  NodeCreationConfig,
  createBesuNetwork,
  createBesuNodeManager
} from '../src';

import { ConfigGenerator } from '../src/services/ConfigGenerator';
import { FileSystem } from '../src/utils/FileSystem';
import { GenesisGenerator } from '../src/services/GenesisGenerator';
import { Logger } from '../src/utils/Logger';

/**
 * Función principal para el levantamiento secuencial
 */
async function main() {
  try {
    console.log('=== 🚀 Iniciando Red Besu Secuencial ===\n');
    
    const networkName = 'sequential-besu-network';
    const chainId = 1337;
    const dataDir = path.resolve(process.cwd(), 'data-sequential');
    const genesisPath = path.join(dataDir, 'genesis.json');

    console.log(`📋 Configuración de red:`);
    console.log(`   Nombre: ${networkName}`);
    console.log(`   Chain ID: ${chainId}`);
    console.log(`   Consenso: clique`);
    console.log(`   Directorio: ${dataDir}\n`);

    // Crear instancias de servicios
    const nodeManager = createBesuNodeManager(dataDir);
    const logger = new Logger({ level: LogLevel.INFO });
    const fs = new FileSystem();
    const configGenerator = new ConfigGenerator(logger, fs);
    const genesisGenerator = new GenesisGenerator(logger, fs);
    
    // Crear una red básica solo para la infraestructura Docker
    const networkConfig: BesuNetworkConfig = {
      name: networkName,
      chainId: chainId,
      consensusProtocol: 'clique',
      blockPeriod: 5,
      nodeCount: 1,
      baseRpcPort: 8545,
      baseP2pPort: 30303,
      dataDir: dataDir,
      nodeCreationConfigs: []
    };
    
    const network = createBesuNetwork(networkConfig);

    // Limpiar datos anteriores e inicializar
    console.log('🧹 Limpiando datos anteriores...');
    await network.initialize();
    console.log('✅ Datos limpiados\n');

    // Crear la red Docker
    console.log('🌐 Creando red Docker...');
    await network.start();
    console.log('✅ Red Docker creada\n');

    // Generar archivo genesis
    console.log('📄 Generando archivo genesis...');
    await genesisGenerator.generateGenesisFile(genesisPath, {
      chainId: chainId,
      consensusProtocol: 'clique',
      blockPeriod: 5,
      validatorAddresses: [] // Se agregará el validador después de crear el bootnode
    });
    console.log('✅ Archivo genesis generado\n');

    // ========================================
    // PASO 1: Crear y Levantar Bootnode Validador
    // ========================================
    console.log('=== PASO 1: Creando Bootnode Validador ===');
    
    const bootnodeConfig: BesuNodeConfig = await nodeManager.createNode({
      name: 'bootnode-validator',
      nodeType: BesuNodeType.SIGNER,
      isValidator: true,
      isBootnode: true,
      rpcPort: 8545,
      p2pPort: 30303,
      additionalOptions: {
        'logging': 'INFO'
      }
    });

    console.log(`🔧 Bootnode configurado:`);
     console.log(`   Nombre: ${bootnodeConfig.name}`);
     console.log(`   Tipo: ${bootnodeConfig.nodeType}`);
     console.log(`   Puerto RPC: ${bootnodeConfig.rpcPort}`);
     console.log(`   Puerto P2P: ${bootnodeConfig.p2pPort}`);
     console.log(`   Directorio: ${bootnodeConfig.dataDir}`);
     
     // Generar archivo config.toml para el bootnode
     console.log('📝 Generando config.toml para bootnode...');
     await configGenerator.generateBootnodeConfig(bootnodeConfig, networkConfig);
     
     console.log('🚀 Iniciando bootnode...');
    await nodeManager.startNode(bootnodeConfig, networkName, genesisPath, []);
    
    // Esperar a que el bootnode se estabilice
    console.log('⏳ Esperando estabilización del bootnode (15s)...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Verificar estado del bootnode
    console.log('🔍 Verificando estado del bootnode...');
    const bootnodeStatus = await nodeManager.getNodeStatus('bootnode-validator');
    console.log('🔍 Debug - Estado del bootnode:', JSON.stringify(bootnodeStatus, null, 2));
    
    if (!bootnodeStatus) {
      throw new Error('❌ Error: Bootnode no encontrado');
    }
    
    if (bootnodeStatus.containerStatus !== 'running') {
      console.log(`⚠️ Bootnode estado: ${bootnodeStatus.containerStatus}`);
      throw new Error('❌ Error: Bootnode no está ejecutándose');
    }
    
    console.log('✅ Bootnode iniciado correctamente');
    console.log(`   Estado: ${bootnodeStatus.containerStatus}`);
    console.log(`   Bloque actual: ${bootnodeStatus.blockNumber || 'N/A'}`);
    console.log(`   Peers: ${bootnodeStatus.peerCount || 'N/A'}`);
    if (bootnodeStatus.enodeUrl) {
      console.log(`   Enode: ${bootnodeStatus.enodeUrl.substring(0, 60)}...`);
    }
    
    console.log('\n');

    // ========================================
     // PASO 2: Crear y Levantar Nodo Minero
     // ========================================
     console.log('=== PASO 2: Creando Nodo Minero ===');
     
     const minerNodeConfig: BesuNodeConfig = await nodeManager.createNode({
       name: 'miner-node',
       nodeType: BesuNodeType.MINER,
       isValidator: false,
       isBootnode: false,
       linkedTo: 'bootnode-validator',
       rpcPort: 8546,
       p2pPort: 30304
     });

    console.log(`🔧 Nodo miner configurado:`);
     console.log(`   Nombre: ${minerNodeConfig.name}`);
     console.log(`   Tipo: ${minerNodeConfig.nodeType}`);
     console.log(`   Puerto RPC: ${minerNodeConfig.rpcPort}`);
     console.log(`   Puerto P2P: ${minerNodeConfig.p2pPort}`);
     console.log(`   Directorio: ${minerNodeConfig.dataDir}`);
     
     // Obtener el enode del bootnode para usarlo como bootnode
      const bootnodeEnode = bootnodeStatus?.enodeUrl || '';
     
     // Generar archivo config.toml para el nodo miner
     console.log('📝 Generando config.toml para nodo miner...');
     await configGenerator.generateNodeConfig(minerNodeConfig, networkConfig, bootnodeEnode);
     
     const bootnodes = bootnodeStatus?.enodeUrl ? [bootnodeStatus.enodeUrl] : [];
    console.log(`🔗 Conectando al bootnode: ${bootnodes.length > 0 ? 'SÍ' : 'NO'}`);
    
    console.log('🚀 Iniciando nodo minero...');
    await nodeManager.startNode(minerNodeConfig, networkName, genesisPath, bootnodes);
    
    console.log('⏳ Esperando estabilización del minero (15s)...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Verificar estado del nodo minero
    console.log('🔍 Verificando estado del nodo minero...');
    const minerStatus = await nodeManager.getNodeStatus('miner-node');
    
    if (!minerStatus || minerStatus.containerStatus !== 'running') {
      console.log('⚠️ Nodo minero no está ejecutándose correctamente');
      throw new Error('❌ Error: Nodo minero no se inició correctamente');
    } else {
      console.log('✅ Nodo minero iniciado correctamente');
      console.log(`   Estado: ${minerStatus.containerStatus}`);
      console.log(`   Bloque actual: ${minerStatus.blockNumber || 'N/A'}`);
      console.log(`   Peers: ${minerStatus.peerCount || 'N/A'}`);
    }
    console.log('\n');

    // ========================================
     // PASO 3: Crear y Levantar Nodo Normal
     // ========================================
     console.log('=== PASO 3: Creando Nodo Normal ===');
     
     const normalNodeConfig: BesuNodeConfig = await nodeManager.createNode({
       name: 'normal-node',
       nodeType: BesuNodeType.NORMAL,
       isValidator: false,
       isBootnode: false,
       linkedTo: 'bootnode-validator',
       rpcPort: 8547,
       p2pPort: 30305
     });

    console.log(`🔧 Nodo normal configurado:`);
     console.log(`   Nombre: ${normalNodeConfig.name}`);
     console.log(`   Tipo: ${normalNodeConfig.nodeType}`);
     console.log(`   Puerto RPC: ${normalNodeConfig.rpcPort}`);
     console.log(`   Puerto P2P: ${normalNodeConfig.p2pPort}`);
     console.log(`   Directorio: ${normalNodeConfig.dataDir}`);
     
     // Generar archivo config.toml para el nodo normal
     console.log('📝 Generando config.toml para nodo normal...');
     await configGenerator.generateNodeConfig(normalNodeConfig, networkConfig, bootnodeEnode);
     
     console.log('🚀 Iniciando nodo normal...');
    await nodeManager.startNode(normalNodeConfig, networkName, genesisPath, bootnodes);
    
    console.log('⏳ Esperando estabilización del nodo normal (15s)...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Verificar estado del nodo normal
    console.log('🔍 Verificando estado del nodo normal...');
    const normalStatus = await nodeManager.getNodeStatus('normal-node');
    
    if (!normalStatus || normalStatus.containerStatus !== 'running') {
      console.log('⚠️ Nodo normal no está ejecutándose correctamente');
    } else {
      console.log('✅ Nodo normal iniciado correctamente');
      console.log(`   Estado: ${normalStatus.containerStatus}`);
      console.log(`   Bloque actual: ${normalStatus.blockNumber || 'N/A'}`);
      console.log(`   Peers: ${normalStatus.peerCount || 'N/A'}`);
    }
    
    // ========================================
    // VERIFICACIÓN FINAL
    // ========================================
    console.log('\n=== 📊 ESTADO FINAL DE LA RED ===');
    
    // Obtener estado de todos los nodos
    const allNodes = [
      await nodeManager.getNodeStatus('bootnode-validator'),
      await nodeManager.getNodeStatus('miner-node'),
      await nodeManager.getNodeStatus('normal-node')
    ].filter(Boolean);
    
    console.log(`Red: ${networkName}`);
    console.log(`Chain ID: ${chainId}`);
    console.log(`Número de nodos: ${allNodes.length}\n`);

    // Mostrar detalles de cada nodo
    console.log('📋 Detalles de nodos:');
    for (const node of allNodes) {
      if (node) {
        console.log(`\n🔹 ${node.name}:`);
        console.log(`   Tipo: ${node.nodeType}`);
        console.log(`   Estado: ${node.containerStatus}`);
        console.log(`   Puerto RPC: ${node.ports.rpc}`);
        console.log(`   Puerto P2P: ${node.ports.p2p}`);
        console.log(`   Bloque actual: ${node.blockNumber || 'N/A'}`);
        console.log(`   Peers: ${node.peerCount || 'N/A'}`);
        console.log(`   Minando: ${node.isMining ? 'SÍ' : 'NO'}`);
        
        if (node.nodeType === BesuNodeType.SIGNER) {
          console.log(`   Validando: ${node.isValidating ? 'SÍ' : 'NO'}`);
        }
        
        if (node.enodeUrl) {
          console.log(`   Enode: ${node.enodeUrl.substring(0, 50)}...`);
        }
      }
    }

    // URLs de conexión
    console.log('\n🌐 URLs de conexión:');
    for (const node of allNodes) {
      if (node) {
        console.log(`   ${node.name}: http://localhost:${node.ports.rpc}`);
      }
    }

    console.log('=== ✅ RED SECUENCIAL COMPLETADA ===');
    console.log('Todos los nodos han sido creados y iniciados individualmente usando NodeManager.');
    console.log('\n🎯 Secuencia ejecutada:');
    console.log('   1. ✅ Bootnode validador (SIGNER) - Creado y iniciado individualmente');
    console.log('   2. ✅ Nodo minero (MINER) - Creado y conectado al bootnode');
    console.log('   3. ✅ Nodo normal (NORMAL) - Creado y conectado al bootnode');
    
    console.log('\n📝 Características demostradas:');
    console.log('   ✅ Levantamiento secuencial de nodos individuales');
    console.log('   ✅ Bootnode como punto de entrada');
    console.log('   ✅ Conexión de nodos posteriores al bootnode');
    console.log('   ✅ Diferentes tipos de nodos (SIGNER, MINER, NORMAL)');
    console.log('   ✅ Verificación de estado en cada paso');
    console.log('   ✅ Gestión de puertos únicos');
    console.log('   ✅ Uso del NodeManager para gestión individual');
    
    console.log('\n🔧 Comandos útiles:');
    console.log('   Para detener: nodeManager.stopNode(<node_name>)');
    console.log('   Para limpiar: network.cleanup()');
    console.log('   Para ver logs: docker logs <container_name>');
    console.log('   Para ver estado: nodeManager.getNodeStatus(<node_name>)');
    
    // Mantener la red corriendo
    console.log('\n=== 🏃 Red en funcionamiento ===');
    console.log('La red está corriendo con nodos gestionados individualmente.');
    console.log('Presiona Ctrl+C para detener todos los nodos.');
    
    // Manejar la señal de interrupción
    process.on('SIGINT', async () => {
      console.log('\n\n=== 🛑 Deteniendo red secuencial ===');
      try {
        await nodeManager.stopNode('bootnode-validator');
        await nodeManager.stopNode('miner-node');
        await nodeManager.stopNode('normal-node');
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
    console.error('❌ Error en el levantamiento secuencial:', error);
    process.exit(1);
  }
}

/**
 * Función auxiliar para mostrar el progreso
 */
function showProgress(step: number, total: number, description: string) {
  const percentage = Math.round((step / total) * 100);
  const progressBar = '█'.repeat(Math.floor(percentage / 10)) + '░'.repeat(10 - Math.floor(percentage / 10));
  console.log(`[${progressBar}] ${percentage}% - ${description}`);
}

// Ejecutar el ejemplo
if (require.main === module) {
  main().catch(console.error);
}

export { main };