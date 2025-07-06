import { NextResponse } from 'next/server';
import { createDockerNetworkManager } from 'besu-network-manager';

export async function GET() {
  try {
    const networkManager = createDockerNetworkManager();
    
    // Obtener todas las redes Docker
    const networks = await networkManager.getNetworks();
    
    // Filtrar solo las redes que empiecen con 'besu-'
    const besuNetworks = networks.filter((network: any) => 
      network.Name && network.Name.startsWith('besu-')
    );
    
    // Formatear los datos para el frontend
    const formattedNetworks = besuNetworks.map((network: any) => ({
      id: network.Id || '',
      name: network.Name || 'Sin nombre',
      driver: network.Driver || 'unknown',
      scope: network.Scope || 'local'
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