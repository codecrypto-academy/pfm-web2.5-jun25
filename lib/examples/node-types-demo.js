/**
 * Demostración de tipos de nodos Besu (JavaScript)
 * Este ejemplo muestra cómo funcionan los diferentes tipos de nodos sin depender de Docker
 */
const path = require('path');

// Simulación de los tipos de nodos
const BesuNodeType = {
  SIGNER: 'signer',
  MINER: 'miner', 
  NORMAL: 'normal'
};

/**
 * Simula la funcionalidad de NodeConfigFactory
 */
class NodeConfigFactory {
  static createNodeConfig(name, nodeType, rpcPort, p2pPort, dataDir, validatorAddress, privateKey) {
    return {
      name,
      nodeType,
      rpcPort,
      p2pPort,
      dataDir: path.resolve(dataDir),
      validatorAddress: nodeType === BesuNodeType.SIGNER ? validatorAddress : undefined,
      privateKey: nodeType !== BesuNodeType.NORMAL ? privateKey : undefined,
      enabledApis: this.getDefaultApis(nodeType),
      additionalOptions: {}
    };
  }

  static getDefaultApis(nodeType) {
    const baseApis = ['ETH', 'NET', 'WEB3'];
    
    switch (nodeType) {
      case BesuNodeType.SIGNER:
        return [...baseApis, 'CLIQUE', 'DEBUG', 'TXPOOL'];
      case BesuNodeType.MINER:
        return [...baseApis, 'MINER', 'TXPOOL'];
      case BesuNodeType.NORMAL:
      default:
        return baseApis;
    }
  }

  static getBesuCommandOptions(nodeConfig) {
    const options = [];
    
    switch (nodeConfig.nodeType) {
      case BesuNodeType.SIGNER:
        options.push('--miner-enabled=true');
        if (nodeConfig.validatorAddress) {
          options.push(`--miner-coinbase=${nodeConfig.validatorAddress}`);
        }
        break;
      case BesuNodeType.MINER:
        options.push('--miner-enabled=true');
        if (nodeConfig.validatorAddress) {
          options.push(`--miner-coinbase=${nodeConfig.validatorAddress}`);
        }
        break;
      case BesuNodeType.NORMAL:
      default:
        options.push('--miner-enabled=false');
        break;
    }
    
    return options;
  }
}

/**
 * Función principal para demostrar la funcionalidad
 */
function main() {
  console.log('=== Demostración de tipos de nodos Besu ===');
  
  // Configuración de la red con tipos específicos de nodos
  const networkConfig = {
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
  console.log(`Tipos de nodos: ${networkConfig.nodeTypes.join(', ')}`);

  console.log('\n=== Configuraciones de nodos generadas ===');
  
  // Crear configuraciones para cada tipo de nodo
  for (let i = 0; i < networkConfig.nodeCount; i++) {
    const nodeType = networkConfig.nodeTypes[i] || BesuNodeType.NORMAL;
    const rpcPort = networkConfig.baseRpcPort + i;
    const p2pPort = networkConfig.baseP2pPort + i;
    const dataDir = path.join(networkConfig.dataDir, `node${i}`);
    
    const nodeConfig = NodeConfigFactory.createNodeConfig(
      `node${i}`,
      nodeType,
      rpcPort,
      p2pPort,
      dataDir,
      `0x${i.toString().padStart(40, '0')}`, // Dirección ficticia
      `0x${'1'.repeat(64)}` // Clave privada ficticia
    );

    console.log(`\nNodo ${i} (${nodeType}):`);
    console.log(`  Nombre: ${nodeConfig.name}`);
    console.log(`  Tipo: ${nodeConfig.nodeType}`);
    console.log(`  Puerto RPC: ${nodeConfig.rpcPort}`);
    console.log(`  Puerto P2P: ${nodeConfig.p2pPort}`);
    console.log(`  APIs habilitadas: ${nodeConfig.enabledApis.join(', ')}`);
    console.log(`  Dirección validador: ${nodeConfig.validatorAddress || 'N/A'}`);
    console.log(`  Tiene clave privada: ${nodeConfig.privateKey ? 'SÍ' : 'NO'}`);
    
    // Mostrar opciones específicas del tipo de nodo
    const besuOptions = NodeConfigFactory.getBesuCommandOptions(nodeConfig);
    console.log(`  Opciones Besu: ${besuOptions.join(' ')}`);
  }

  console.log('\n=== Descripción de tipos de nodos ===');
  console.log('SIGNER: Nodos validadores que pueden firmar bloques y participar en el consenso');
  console.log('        - Habilitado para minar');
  console.log('        - APIs adicionales: CLIQUE, DEBUG, TXPOOL');
  console.log('        - Requiere dirección de validador y clave privada');
  console.log('');
  console.log('MINER:  Nodos que minan transacciones pero no participan en la validación');
  console.log('        - Habilitado para minar');
  console.log('        - APIs adicionales: MINER, TXPOOL');
  console.log('        - Requiere clave privada');
  console.log('');
  console.log('NORMAL: Nodos regulares que solo sincronizan la blockchain');
  console.log('        - No habilitado para minar');
  console.log('        - APIs básicas: ETH, NET, WEB3');
  console.log('        - No requiere claves adicionales');
  
  console.log('\n=== Demostración completada exitosamente ===');
  console.log('\nEsta funcionalidad permite:');
  console.log('✅ Configurar diferentes tipos de nodos en una red Besu');
  console.log('✅ Asignar automáticamente APIs apropiadas según el tipo');
  console.log('✅ Generar opciones de comando específicas para cada tipo');
  console.log('✅ Gestionar claves y direcciones según los requisitos del tipo');
  
  console.log('\n=== Integración con la biblioteca ===');
  console.log('Para usar esta funcionalidad en tu código TypeScript:');
  console.log('');
  console.log('```typescript');
  console.log('import { BesuNetworkConfig, BesuNodeType, createBesuNetwork } from "besu-network-manager";');
  console.log('');
  console.log('const config: BesuNetworkConfig = {');
  console.log('  name: "mi-red",');
  console.log('  chainId: 1337,');
  console.log('  consensusProtocol: "clique",');
  console.log('  nodeCount: 3,');
  console.log('  nodeTypes: [');
  console.log('    BesuNodeType.SIGNER,');
  console.log('    BesuNodeType.MINER,');
  console.log('    BesuNodeType.NORMAL');
  console.log('  ],');
  console.log('  // ... otras opciones');
  console.log('};');
  console.log('');
  console.log('const network = createBesuNetwork(config);');
  console.log('await network.initialize();');
  console.log('await network.start();');
  console.log('```');
}

// Ejecutar la demostración
if (require.main === module) {
  main();
}

module.exports = { BesuNodeType, NodeConfigFactory, main };