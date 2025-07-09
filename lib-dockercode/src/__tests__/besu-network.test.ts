import { BesuNetwork } from '../besu-network';
import { BesuNetworkConfig, BesuNodeConfig } from '../types';
import * as fs from 'fs';

describe('BesuNetwork - Test Básico', () => {
  let network: BesuNetwork;
  
  const config: BesuNetworkConfig = {
    networkName: 'test-network',
    chainId: 2025,
    subnet: '172.21.0.0/16',
    initialValidators: ['0xfe3b557e8fb62b89f4916b721be55ceb828dbd73']
  };

  beforeEach(() => {
    network = new BesuNetwork();
  });

  afterEach(async () => {
    try {
      await network.destroyNetwork();
    } catch (error) {
      // No pasa nada si falla
    }
    
    if (fs.existsSync('genesis.json')) {
      fs.unlinkSync('genesis.json');
    }
  });

  it('debe crear red, añadir nodo y eliminarlo', async () => {
    // 1. Crear red
    await network.createNetwork(config);
    
    // 2. Añadir nodo
    const nodeConfig: BesuNodeConfig = {
      name: 'test-node',
      type: 'signer',
      coinbaseAddress: '0xfe3b557e8fb62b89f4916b721be55ceb828dbd73'
    };
    
    const containerId = await network.addNode(nodeConfig);
    expect(containerId).toBeDefined();
    
    // 3. Verificar que está ahí
    const status = await network.getNetworkStatus();
    expect(status.nodes).toHaveLength(1);
    
    // 4. Eliminar nodo
    await network.removeNode('test-node');
    
    // 5. Verificar que se eliminó
    const statusAfter = await network.getNetworkStatus();
    expect(statusAfter.nodes).toHaveLength(0);
  });
});