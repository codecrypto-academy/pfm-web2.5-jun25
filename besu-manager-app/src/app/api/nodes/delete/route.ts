import { NextResponse } from 'next/server';
import { LogLevel, createBesuNodeManager } from 'besu-network-manager';

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeName = searchParams.get('name');
    const networkId = searchParams.get('networkId');
    
    if (!nodeName) {
      return NextResponse.json(
        { error: 'Nombre del nodo requerido' },
        { status: 400 }
      );
    }

    if (!networkId) {
      return NextResponse.json(
        { error: 'ID de red requerido' },
        { status: 400 }
      );
    }

    const nodeManager = createBesuNodeManager('./temp-nodes', LogLevel.INFO);
    
    // Verificar que el nodo existe y obtener su información
    const nodeStatus = await nodeManager.getNodeStatus(nodeName);
    
    if (!nodeStatus) {
      return NextResponse.json(
        { error: 'Nodo no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que no es un bootnode
    if (nodeStatus.isBootnode) {
      return NextResponse.json(
        { error: 'No se pueden eliminar nodos bootnode' },
        { status: 400 }
      );
    }

    // Usar el método deleteNode del BesuNodeManager que maneja todo el proceso
    await nodeManager.deleteNode(nodeName, networkId);

    return NextResponse.json({
      message: `Nodo ${nodeName} eliminado exitosamente`,
      nodeName
    });

  } catch (error) {
    console.error('Error eliminando nodo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}