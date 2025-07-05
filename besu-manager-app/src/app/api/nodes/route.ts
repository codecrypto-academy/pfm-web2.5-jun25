import Docker from 'dockerode';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const docker = new Docker();
    
    // Obtener todos los contenedores (incluyendo los detenidos)
    const containers = await docker.listContainers({ all: true });
    
    // Filtrar solo los contenedores de Besu
    const besuContainers = containers.filter(container => {
      const image = container.Image || '';
      const names = container.Names || [];
      
      // Buscar contenedores que usen la imagen de Besu o tengan nombres relacionados
      return image.includes('besu') || 
             image.includes('hyperledger/besu') ||
             names.some(name => name.toLowerCase().includes('besu'));
    });
    
    // Formatear los datos para el frontend
    const formattedNodes = besuContainers.map(container => {
      const ports = container.Ports?.map(port => {
        if (port.PublicPort && port.PrivatePort) {
          return `${port.PublicPort}:${port.PrivatePort}`;
        }
        return port.PrivatePort?.toString() || '';
      }).filter(Boolean) || [];
      
      // Obtener el ID de red del primer network
      const networkIds = Object.keys(container.NetworkSettings?.Networks || {});
      const networkId = networkIds.length > 0 ? networkIds[0] : 'default';
      
      return {
        id: container.Id || '',
        name: container.Names?.[0]?.replace('/', '') || 'Sin nombre',
        status: container.State || 'unknown',
        ports: ports,
        networkId: networkId
      };
    });
    
    return NextResponse.json(formattedNodes);
  } catch (error) {
    console.error('Error al obtener nodos:', error);
    return NextResponse.json(
      { error: 'Error al obtener los nodos Besu' },
      { status: 500 }
    );
  }
}