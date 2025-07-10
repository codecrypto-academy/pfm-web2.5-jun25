import { BesuDeployer, BesuNodeConfig } from '../besu-deployer';

async function deployBesuNetwork(additionalNodes: number = 0) {
  const deployer = new BesuDeployer({
    networkName: 'besu-network',
    subnet: '172.25.0.0/16',
    dataPath: './besu-network'
  });

  // Configurar nodos base
  const nodes: BesuNodeConfig[] = [
    {
      name: 'bootnode',
      ip: '172.25.0.10',
      isBootnode: true
    },
    {
      name: 'rpc-node', 
      ip: '172.25.0.11',
      isRpc: true
    },
    {
      name: 'miner-node',
      ip: '172.25.0.12', 
      isMiner: true
    }
  ];

  // Agregar nodos adicionales
  for (let i = 1; i <= additionalNodes; i++) {
    nodes.push({
      name: `node-${i}`,
      ip: `172.25.0.${12 + i}`,
      isMiner: true
    });
  }

  try {
    console.log(`Desplegando red con ${nodes.length} nodos...`);
    await deployer.deployBesuNetwork(nodes);
    
    // Mostrar estado de la red
    const status = await deployer.getNetworkStatus();
    console.log('\n=== RED DESPLEGADA EXITOSAMENTE ===');
    console.log(`Nodos totales: ${status.network.totalNodes}`);
    console.log(`Subnet: ${status.network.subnet}`);
    console.log('\nNodos:');
    status.nodes.forEach((node: any) => {
      console.log(`  - ${node.name}: ${node.ip}`);
    });
    console.log('===================================');
    
  } catch (error) {
    console.error('Error desplegando red:', error);
    process.exit(1);
  }
}

// Uso desde línea de comandos
const additionalNodes = process.argv[2] ? parseInt(process.argv[2]) : 0;

if (require.main === module) {
  deployBesuNetwork(additionalNodes)
    .then(() => console.log('Deployment completed'))
    .catch(console.error);
}

export { deployBesuNetwork };