import { NextRequest, NextResponse } from 'next/server';
import { NetworkService } from '@lib/services/network.service';
import { NetworkConfig } from '@lib/types';
import { networkService, setNetworkService } from '../../../networkServiceInstance';

// Example default config (should be replaced by frontend input)
const defaultConfig: NetworkConfig = {
  chainId: 2025,
  networkName: 'besu-demo',
  subnet: '172.25.0.0/16',
  nodes: [
    { name: 'bootnode-1', type: 'bootnode', port: 30303, ip: '172.25.0.2' },
    { name: 'miner-1', type: 'miner', port: 30304, ip: '172.25.0.3' },
    { name: 'rpc-1', type: 'rpc', port: 30305, rpcPort: 8545, ip: '172.25.0.4' }
  ],
  genesisConfig: {
    chainId: 2025,
    gasLimit: '0x1fffffffffffff',
    difficulty: '0x1',
    blockPeriodSeconds: 5,
    epochLength: 30000,
    alloc: {}
  }
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const config: NetworkConfig = body.config || defaultConfig;
    
    // Validar configuración básica
    if (!config.chainId || isNaN(Number(config.chainId))) {
      return NextResponse.json({ 
        success: false, 
        error: 'Chain ID debe ser un número válido' 
      }, { status: 400 });
    }

    if (!config.networkName || config.networkName.length < 3) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nombre de red debe tener al menos 3 caracteres' 
      }, { status: 400 });
    }

    if (!/^\d+\.\d+\.\d+\.\d+\/\d+$/.test(config.subnet)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Subnet debe tener formato válido (ej: 172.25.0.0/16)' 
      }, { status: 400 });
    }

    // Validar lista de nodos
    if (!config.nodes || !Array.isArray(config.nodes) || config.nodes.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Se requiere al menos un nodo configurado' 
      }, { status: 400 });
    }

    // Validar tipos de nodos requeridos
    const bootnodes = config.nodes.filter(n => n.type === 'bootnode');
    const miners = config.nodes.filter(n => n.type === 'miner');
    const rpcNodes = config.nodes.filter(n => n.type === 'rpc');

    if (bootnodes.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Se requiere al menos 1 bootnode' 
      }, { status: 400 });
    }

    if (miners.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Se requiere al menos 1 nodo minero' 
      }, { status: 400 });
    }

    if (rpcNodes.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Se requiere al menos 1 nodo RPC' 
      }, { status: 400 });
    }

    if (bootnodes.length > 5) {
      return NextResponse.json({ 
        success: false, 
        error: 'Máximo 5 bootnodes permitidos' 
      }, { status: 400 });
    }

    if (miners.length > 10) {
      return NextResponse.json({ 
        success: false, 
        error: 'Máximo 10 nodos mineros permitidos' 
      }, { status: 400 });
    }

    if (rpcNodes.length > 10) {
      return NextResponse.json({ 
        success: false, 
        error: 'Máximo 10 nodos RPC permitidos' 
      }, { status: 400 });
    }

    // Validar nombres únicos
    const nodeNames = config.nodes.map(n => n.name);
    const uniqueNames = new Set(nodeNames);
    if (uniqueNames.size !== nodeNames.length) {
      return NextResponse.json({ 
        success: false, 
        error: 'Todos los nombres de nodos deben ser únicos' 
      }, { status: 400 });
    }

    // Validar IPs únicas
    const nodeIPs = config.nodes.map(n => n.ip);
    const uniqueIPs = new Set(nodeIPs);
    if (uniqueIPs.size !== nodeIPs.length) {
      return NextResponse.json({ 
        success: false, 
        error: 'Todas las IPs de nodos deben ser únicas' 
      }, { status: 400 });
    }

    // Validar puertos únicos
    const nodePorts = config.nodes.map(n => n.port);
    const uniquePorts = new Set(nodePorts);
    if (uniquePorts.size !== nodePorts.length) {
      return NextResponse.json({ 
        success: false, 
        error: 'Todos los puertos de nodos deben ser únicos' 
      }, { status: 400 });
    }

    setNetworkService(new NetworkService(config));
    await networkService!.initializeNetwork();
    
    return NextResponse.json({ 
      success: true, 
      message: `Red ${config.networkName} creada exitosamente con ${config.nodes.length} nodos` 
    });
  } catch (error) {
    console.error('Error creating network:', error);
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}

export async function DELETE() {
  if (!networkService) {
    return NextResponse.json({ 
      success: false, 
      error: 'Red no inicializada' 
    }, { status: 400 });
  }
  try {
    await networkService.cleanup();
    setNetworkService(null);
    return NextResponse.json({ 
      success: true, 
      message: 'Red eliminada correctamente' 
    });
  } catch (error) {
    console.error('Error deleting network:', error);
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}

export async function GET() {
  if (!networkService) {
    return NextResponse.json({ 
      success: false, 
      error: 'Red no inicializada' 
    }, { status: 400 });
  }
  try {
    const status = await networkService.getNetworkStatus();
    return NextResponse.json({ 
      success: true, 
      totalNodes: status.totalNodes ?? 0
    });
  } catch (error) {
    console.error('Error getting network status:', error);
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
} 