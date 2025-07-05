import { NextResponse } from 'next/server';
import { DockerNetworkManager } from 'besu-network-manager';

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const networkId = searchParams.get('id');
    
    if (!networkId) {
      return NextResponse.json(
        { error: 'ID de red requerido' },
        { status: 400 }
      );
    }
    
    const networkManager = new DockerNetworkManager();
    
    // Verificar que la red existe
    const networks = await networkManager.getNetworks();
    const network = networks.find(net => net.Id === networkId);
    
    if (!network) {
      return NextResponse.json(
        { error: 'Red no encontrada' },
        { status: 404 }
      );
    }
    
    // No permitir eliminar redes del sistema
    const systemNetworks = ['bridge', 'host', 'none'];
    if (systemNetworks.includes(network.Name)) {
      return NextResponse.json(
        { error: 'No se pueden eliminar redes del sistema' },
        { status: 403 }
      );
    }
    
    // Eliminar la red usando el nombre, no el ID
    await networkManager.removeNetwork(network.Name);
    
    return NextResponse.json({
      success: true,
      message: `Red '${network.Name}' eliminada exitosamente`
    });
    
  } catch (error: any) {
    console.error('Error eliminando red:', error);
    
    if (error.message?.includes('network has active endpoints')) {
      return NextResponse.json(
        { error: 'No se puede eliminar la red porque tiene contenedores conectados' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}