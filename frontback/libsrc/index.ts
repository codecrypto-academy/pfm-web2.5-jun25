import { NetworkService } from './services/network.service';

// Exportar tipos
export * from './types';

// Exportar utilidades
export { CryptoUtils } from './utils/crypto';

// Exportar servicios
export { NetworkService } from './services/network.service';
export { DockerService } from './services/docker.service';

// Exportar configuración por defecto
export const DEFAULT_NETWORK_CONFIG = {
  chainId: 13371337,
  networkName: 'besu-network',
  subnet: '172.28.0.0/16',
  nodes: [
    {
      name: 'bootnode',
      type: 'bootnode' as const,
      port: 30303,
      ip: '172.28.0.2'
    },
    {
      name: 'miner-node',
      type: 'miner' as const,
      port: 30303,
      rpcPort: 8545,
      ip: '172.28.0.3'
    },
    {
      name: 'rpc-node8545',
      type: 'rpc' as const,
      port: 30303,
      rpcPort: 8546,
      ip: '172.28.0.4'
    }
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

// Función helper para crear una instancia de NetworkService con configuración por defecto
export function createNetworkService(config?: Partial<typeof DEFAULT_NETWORK_CONFIG>) {
  const finalConfig = { ...DEFAULT_NETWORK_CONFIG, ...config };
  return new NetworkService(finalConfig);
} 