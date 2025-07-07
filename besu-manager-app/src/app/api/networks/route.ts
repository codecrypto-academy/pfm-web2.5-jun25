import { NextResponse } from 'next/server';
import { createDockerNetworkManager } from 'besu-network-manager';

export async function GET() {
  try {
    const networkManager = createDockerNetworkManager();
    
    // Obtener todas las redes Docker
    const networks = await networkManager.getNetworks();
    
    // Filtrar solo las redes que empiecen con 'besu-'
    const besuNetworks = networks.filter((network: unknown) => 
      typeof network === 'object' && network !== null && 'Name' in network &&
      typeof (network as Record<string, unknown>).Name === 'string' &&
      (network as Record<string, unknown>).Name.startsWith('besu-')
    );
    
    // Formatear los datos para el frontend
    const formattedNetworks = besuNetworks.map((network: unknown) => ({
      id: (network as Record<string, unknown>).Id || '',
      name: (network as Record<string, unknown>).Name || 'Sin nombre',
      driver: (network as Record<string, unknown>).Driver || 'unknown',
      scope: (network as Record<string, unknown>).Scope || 'local'
    }));
    
    return NextResponse.json(formattedNetworks);
  } catch (error) {
    console.error('Error al obtener redes:', error);
    return NextResponse.json(
      { error: 'Error al obtener las redes Docker' },
      { status: 500 }
    );
  }
}