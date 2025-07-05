/**
 * Ejemplo de funcionalidades desacopladas
 * 
 * Este ejemplo demuestra cómo usar BesuNodeManager y BesuNetworkManager
 * por separado para gestionar nodos y redes de forma independiente.
 */

import * as path from 'path';
import {
  BesuNetworkManager,
  BesuNodeManager,
  DockerService,
  DockerNetworkManager,
  GenesisGenerator,
  KeyGenerator,
  ConfigGenerator,
  FileSystem,
  Logger,
  LogLevel,
  NodeConfigFactory,
  BesuNodeType,
  BesuNetworkConfig,
  BesuNodeConfig,
  NodeCreationConfig
} from '../src/index';

async function decoupledFunctionalityExample() {
  console.log('🚀 Iniciando ejemplo de funcionalidades desacopladas');

  // Configurar servicios base
  const logger = new Logger({ level: LogLevel.INFO });
  const fs = new FileSystem();
  const docker = new DockerService({}, logger);
  const genesisGenerator = new GenesisGenerator(logger, fs);
  const keyGenerator = new KeyGenerator(logger, fs);
  const configGenerator = new ConfigGenerator(logger, fs);
  
  // Crear gestores independientes
  const dockerNetworkManager = new DockerNetworkManager(LogLevel.INFO);

  const nodeManager = new BesuNodeManager(
    docker,
    logger,
    fs,
    keyGenerator,
    './data'
  );
  
  const networkConfig: BesuNetworkConfig = {
    name: 'decoupled-network',
    chainId: 1337,
    consensusProtocol: 'clique',
    blockPeriod: 5,
    nodeCount: 3,
    baseRpcPort: 8545,
    baseP2pPort: 30303,
    dataDir: './data/decoupled-network'
  };
  
  const networkManager = new BesuNetworkManager(
    networkConfig,
    docker,
    logger,
    fs,
    genesisGenerator,
    keyGenerator,
    configGenerator,
    nodeManager
  );

  try {
    // 1. Gestión independiente de red Docker
    console.log('\n🌐 === GESTIÓN INDEPENDIENTE DE RED ===');
    console.log(`Inicializando red Docker: ${networkConfig.name}`);
    await dockerNetworkManager.createNetwork(networkConfig.name);
    
    console.log('✅ Red Docker creada exitosamente');
    
    // Verificar estado de la red
    const networks = await dockerNetworkManager.getNetworks();
    const currentNetwork = networks.find(net => net.Name === networkConfig.name);
    console.log(`Estado de la red: ${currentNetwork ? 'Activa' : 'No encontrada'}`);
    console.log(`ID de la red: ${currentNetwork?.Id}`);
    
    // La red Docker ya está creada y lista para usar

    // Generar archivo genesis
    console.log('\n📄 Generando archivo genesis...');
    const genesisPath = path.resolve('./genesis.json');
    await genesisGenerator.generateGenesisFile(genesisPath, {
      chainId: networkConfig.chainId,
      consensusProtocol: networkConfig.consensusProtocol,
      blockPeriod: networkConfig.blockPeriod,
      validatorAddresses: [] // Se llenará después de crear los nodos
    });
    console.log('✅ Archivo genesis generado');

    // 2. Gestión independiente de nodos
    console.log('\n🔧 Gestionando nodos independientemente...');
    
    // Crear configuraciones de nodos
    const nodeConfigs: NodeCreationConfig[] = [
      {
        name: 'bootnode',
        nodeType: BesuNodeType.SIGNER,
        isValidator: true,
        isBootnode: true,
        rpcPort: 8545,
        p2pPort: 30303
      },
      {
        name: 'validator-1',
        nodeType: BesuNodeType.SIGNER,
        isValidator: true,
        linkedTo: 'bootnode',
        rpcPort: 8546,
        p2pPort: 30304
      },
      {
        name: 'normal-node',
        nodeType: BesuNodeType.NORMAL,
        linkedTo: 'bootnode',
        rpcPort: 8547,
        p2pPort: 30305
      }
    ];

    // Crear y iniciar nodos uno por uno
    for (const config of nodeConfigs) {
      console.log(`\n🔨 Creando nodo: ${config.name}`);
      const fullNodeConfig = await nodeManager.createNode(config);
      
      // Generar archivo config.toml para el nodo
      console.log(`📝 Generando configuración para: ${config.name}`);
      if (config.isBootnode) {
        await configGenerator.generateBootnodeConfig(fullNodeConfig, networkConfig);
      } else {
        // Para nodos no-bootnode, necesitamos el enode del bootnode
        // Por simplicidad, usaremos un enode placeholder
        const bootnodeEnode = "enode://placeholder@127.0.0.1:30303";
        await configGenerator.generateNodeConfig(fullNodeConfig, networkConfig, bootnodeEnode);
      }
      
      console.log(`▶️  Iniciando nodo: ${config.name}`);
      await nodeManager.startNode(fullNodeConfig, networkConfig.name, genesisPath, []);
      
      // Verificar estado del nodo
      const nodeStatus = await nodeManager.getNodeStatus(config.name);
      if (nodeStatus) {
        console.log(`✅ Nodo ${config.name} iniciado:`, {
          containerStatus: nodeStatus.containerStatus,
          nodeType: nodeStatus.nodeType,
          ports: nodeStatus.ports
        });
      }
    }

    // 3. Obtener estado de todos los nodos
    console.log('\n📊 Estado de todos los nodos:');
    const allNodesStatus = await nodeManager.getAllNodesStatus();
    allNodesStatus.forEach(node => {
      console.log(`- ${node.name}: ${node.containerStatus} (${node.nodeType})`);
    });

    // 4. Demostrar gestión independiente - parar un nodo específico
    console.log('\n⏹️  Parando nodo normal...');
    await nodeManager.stopNode('normal-node');
    
    const updatedStatus = await nodeManager.getNodeStatus('normal-node');
    if (updatedStatus) {
      console.log(`Estado actualizado del nodo normal: ${updatedStatus.containerStatus}`);
    }

    // 5. Reiniciar el nodo
    console.log('\n🔄 Reiniciando nodo normal...');
    // Para reiniciar, necesitamos la configuración completa del nodo
    const normalNodeConfig = nodeConfigs.find(config => config.name === 'normal-node');
    if (normalNodeConfig) {
      const fullConfig = await nodeManager.createNode(normalNodeConfig);
      
      // Generar configuración para el nodo reiniciado
      console.log(`📝 Regenerando configuración para: ${normalNodeConfig.name}`);
      const bootnodeEnode = "enode://placeholder@127.0.0.1:30303";
      await configGenerator.generateNodeConfig(fullConfig, networkConfig, bootnodeEnode);
      
      await nodeManager.startNode(fullConfig, networkConfig.name, genesisPath, []);
    }
    
    const restartedStatus = await nodeManager.getNodeStatus('normal-node');
    if (restartedStatus) {
      console.log(`Estado después del reinicio: ${restartedStatus.containerStatus}`);
    }

    // 6. Demostrar que la red sigue funcionando
    console.log('\n🌐 Verificando estado final de la red...');
    const finalNetworks = await dockerNetworkManager.getNetworks();
    const finalNetwork = finalNetworks.find(net => net.Name === networkConfig.name);
    console.log(`Estado final de la red: ${finalNetwork ? 'Activa' : 'No encontrada'}`);
    
    const finalAllNodesStatus = await nodeManager.getAllNodesStatus();
    console.log('Estado final de la red:', {
      name: networkConfig.name,
      activeNodes: finalAllNodesStatus.filter(n => n.containerStatus === 'running').length,
      totalNodes: finalAllNodesStatus.length
    });

    console.log('\n✅ Ejemplo de funcionalidades desacopladas completado exitosamente!');
    console.log('\n📝 Resumen de capacidades demostradas:');
    console.log('   - Gestión independiente de redes Docker');
    console.log('   - Creación y gestión individual de nodos');
    console.log('   - Control granular del ciclo de vida de nodos');
    console.log('   - Monitoreo independiente de estado');
    console.log('   - Operaciones sin afectar otros componentes');

  } catch (error) {
    console.error('❌ Error en el ejemplo:', error);
  } finally {
    // Limpieza
    console.log('\n🧹 Limpiando recursos...');
    try {
      // Parar todos los nodos
      const allNodes = await nodeManager.getAllNodesStatus();
      for (const node of allNodes) {
        if (node.containerStatus === 'running') {
          await nodeManager.stopNode(node.name);
        }
      }
      
      // Eliminar red Docker
      await dockerNetworkManager.removeNetwork(networkConfig.name);
      
      console.log('✅ Limpieza completada');
    } catch (cleanupError) {
      console.error('⚠️  Error durante la limpieza:', cleanupError);
    }
  }
}

// Ejecutar el ejemplo si se llama directamente
if (require.main === module) {
  decoupledFunctionalityExample()
    .then(() => {
      console.log('\n🎉 Ejemplo finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

export { decoupledFunctionalityExample };