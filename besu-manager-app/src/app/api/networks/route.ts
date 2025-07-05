import { NextResponse } from 'next/server';
import { DockerNetworkManager } from 'besu-network-manager';

export async function GET() {
  try {
    const networkManager = new DockerNetworkManager();
    
    // Obtener todas las redes Docker
    const networks = await networkManager.getNetworks();
    
    // Formatear los datos para el frontend
    const formattedNetworks = networks.map(network => ({
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