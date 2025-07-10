import { NextRequest, NextResponse } from 'next/server';
import { NetworkService } from '@lib/services/network.service';
import { NetworkConfig } from '@lib/types';
import * as fs from 'fs-extra';
import * as path from 'path';

// Configuración de prueba
const testConfig: NetworkConfig = {
  chainId: 13371337,
  networkName: 'test-network',
  subnet: '172.28.0.0/16',
  nodes: [
    { name: 'bootnode', type: 'bootnode', port: 30303, ip: '172.28.0.2' },
    { name: 'miner-node', type: 'miner', port: 30304, ip: '172.28.0.3' },
    { name: 'rpc-node', type: 'rpc', port: 30305, rpcPort: 8545, ip: '172.28.0.4' }
  ],
  genesisConfig: {
    chainId: 13371337,
    gasLimit: '0x1fffffffffffff',
    difficulty: '0x1',
    blockPeriodSeconds: 4,
    epochLength: 30000,
    alloc: {}
  }
};

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Iniciando prueba de creación de archivos...');
    
    const networkService = new NetworkService(testConfig);
    
    // Crear solo los archivos sin desplegar contenedores
    await networkService.createNetworkFiles();
    
    // Verificar que los archivos se crearon correctamente
    const networkDir = path.join(process.cwd(), 'networks', testConfig.networkName);
    
    const filesToCheck = [
      'genesis.json',
      'bootnode/config.toml',
      'bootnode/key',
      'bootnode/address',
      'bootnode/enode',
      'miner-node/config.toml',
      'miner-node/key',
      'miner-node/address',
      'rpc-node/config.toml',
      'rpc-node/key',
      'rpc-node/address'
    ];
    
    const results = [];
    for (const file of filesToCheck) {
      const filePath = path.join(networkDir, file);
      const exists = await fs.pathExists(filePath);
      const content = exists ? await fs.readFile(filePath, 'utf8') : null;
      results.push({
        file,
        exists,
        content: content ? content.substring(0, 100) + '...' : null
      });
    }
    
    // Limpiar después de la prueba
    await networkService.cleanup();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Prueba completada',
      results 
    });
    
  } catch (error) {
    console.error('❌ Error en prueba:', error);
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
} 