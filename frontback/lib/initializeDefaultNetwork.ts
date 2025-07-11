import { setDefaultNetwork } from './networkManager';

// Función para inicializar la red por defecto desde el .env
export async function initializeDefaultNetwork(): Promise<void> {
  try {
    // Obtener configuración del .env
    const rpcUrl = process.env.RPC_URL;
    const privateKey = process.env.PRIVATE_KEY;
    
    if (!rpcUrl || !privateKey) {
      console.log('No RPC_URL or PRIVATE_KEY found in .env, skipping default network initialization');
      return;
    }
    
    console.log('Initializing default network from .env...');
    
    // Importar dinámicamente el SDK para evitar problemas en build time
    const { BesuNetworkBuilder } = await import('besu-sdk');
    
    // Extraer el puerto del RPC_URL (ej: http://localhost:8545 -> 8545)
    const rpcUrlMatch = rpcUrl.match(/localhost:(\d+)/);
    const rpcPort = rpcUrlMatch ? parseInt(rpcUrlMatch[1]) : 8545;
    
    // Crear la red usando el BesuNetworkBuilder
    // Esta red representa la red ya desplegada por script.sh
    const builder = new BesuNetworkBuilder()
      .withNetworkName('besu-local')
      .withChainId(1337) // Chain ID por defecto de Besu
      .withBlockPeriod(5) // Período de bloque por defecto
      .withSubnet('172.20.0.0/16') // Subnet por defecto
      .withDataDirectory('./besu-networks') // Directorio de datos
      // Agregar el nodo validador principal (el que está en el .env)
      .addValidator('validator-1', '172.20.0.10', {
        initialBalance: '1000000000' // Balance inicial alto para el validador
      });
    
    // Construir la red
    const network = await builder.build();
    
    // Registrar como red por defecto
    setDefaultNetwork(network);
    
    console.log('Default network initialized successfully');
    
  } catch (error) {
    console.error('Error initializing default network:', error);
    // No lanzar el error para no romper la aplicación
  }
}

// Función para obtener la información de la red por defecto
export function getDefaultNetworkInfo() {
  return {
    id: 'besu-local',
    name: 'Besu Local',
    rpcUrl: process.env.RPC_URL || 'http://localhost:8545',
    chainId: 1337,
    currencySymbol: 'ETH',
    explorerUrl: '',
    color: 'blue-500'
  };
}