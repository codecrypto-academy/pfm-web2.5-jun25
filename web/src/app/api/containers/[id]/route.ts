import { NextRequest, NextResponse } from 'next/server';
import { DockerManager } from '@lib/docker-manager';

const dockerManager = new DockerManager();

/**
 * GET /api/containers/[id]
 * Obtiene información detallada de un contenedor específico
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
          error: 'Container ID is required' 
        },
        { status: 400 }
      );
    }

    const containerInfo = await dockerManager.getContainerInfo(id);

    return NextResponse.json({
      success: true,
      data: containerInfo
    });

  } catch (error) {
    console.error('Error getting container info:', error);
    
    // Si es un error de "not found", devolver 404
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Container not found' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get container info',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/containers/[id]
 * Elimina un contenedor específico
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
          error: 'Container ID is required' 
        },
        { status: 400 }
      );
    }

    // Verificar que el contenedor existe antes de eliminarlo
    let containerName = id;
    try {
      const containerInfo = await dockerManager.getContainerInfo(id);
      containerName = containerInfo.name;
      console.log(`Deleting container: ${containerName} (${id})`);
    } catch (error) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Container not found' 
        },
        { status: 404 }
      );
    }

    // Eliminar el contenedor
    await dockerManager.removeContainer(id);

    return NextResponse.json({
      success: true,
      message: `Container '${containerName}' (${id}) has been removed`
    });

  } catch (error) {
    console.error('Error deleting container:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete container',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}