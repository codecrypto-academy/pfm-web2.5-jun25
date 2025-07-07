import { createDockerNetworkManager } from 'besu-network-manager';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'El nombre de la red es requerido' },
        { status: 400 }
      );
    }
    
    // Validar que el nombre no contenga caracteres especiales
    if (!/^[a-zA-Z0-9_\-]+$/.test(name)) {
      return NextResponse.json(
        { error: 'El nombre de la red solo puede contener letras, números, guiones y guiones bajos' },
        { status: 400 }
      );
    }
    
    const networkManager = createDockerNetworkManager();
    
    // Agregar prefijo 'besu-' al nombre de la red
    const networkName = `besu-${name}`;
    
    // Verificar si la red ya existe
    const existingNetworks = await networkManager.getNetworks();
    const networkExists = existingNetworks.some(network => network.Name === networkName);
    
    if (networkExists) {
      return NextResponse.json(
        { error: 'Ya existe una red con ese nombre' },
        { status: 409 }
      );
    }
    
    // Crear la nueva red usando la librería
    const networkId = await networkManager.createNetwork(networkName);
    
    return NextResponse.json({
      success: true,
      networkId: networkId,
      message: `Red '${networkName}' creada exitosamente`
    });
    
  } catch (error) {
    console.error('Error al crear la red:', error);
    
    // Manejar errores específicos de Docker
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return NextResponse.json(
          { error: 'Ya existe una red con ese nombre' },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor al crear la red' },
      { status: 500 }
    );
  }
}