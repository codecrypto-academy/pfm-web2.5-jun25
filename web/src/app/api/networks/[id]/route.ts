import { NextRequest, NextResponse } from 'next/server';
import { DockerManager } from '@lib/docker-manager';

const dockerManager = new DockerManager();

/**
 * GET /api/networks/[id]
 * Obtiene información detallada de una red específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Network ID is required' 
        },
        { status: 400 }
      );
    }

    const networkInfo = await dockerManager.getNetworkInfo(id);

    return NextResponse.json({
      success: true,
      data: networkInfo
    });

  } catch (error) {
    console.error('Error getting network info:', error);
    
    // Si es un error de "not found", devolver 404
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Network not found' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get network info',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/networks/[id]
 * Elimina una red específica y todos sus contenedores
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Network ID is required' 
        },
        { status: 400 }
      );
    }

    // Verificar que la red existe antes de eliminarla
    try {
      const networkInfo = await dockerManager.getNetworkInfo(id);
      console.log(`Deleting network: ${networkInfo.name} (${id})`);
    } catch (error) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Network not found' 
        },
        { status: 404 }
      );
    }

    // Eliminar la red y todos sus contenedores (por defecto removeContainers=true)
    await dockerManager.removeNetwork(id, true);

    return NextResponse.json({
      success: true,
      message: `Network ${id} and all its containers have been removed`
    });

  } catch (error) {
    console.error('Error deleting network:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete network',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
