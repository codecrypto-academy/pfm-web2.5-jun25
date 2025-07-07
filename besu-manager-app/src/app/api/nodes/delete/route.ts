import { NextResponse } from 'next/server';
import { LogLevel, createBesuNodeManager, createDockerService } from 'besu-network-manager';
import * as fs from 'fs/promises';
import * as path from 'path';

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
    const dockerService = createDockerService(LogLevel.INFO);
    
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

    // Obtener el nombre del contenedor usando la nueva convención de nombres
    const containers = await dockerService.listContainers({ all: true });
    let containerName = '';
    
    for (const container of containers) {
      const name = container.Names[0].startsWith('/') ? container.Names[0].substring(1) : container.Names[0];
      
      // Verificar si es el contenedor correcto usando ambas convenciones
      if (name === `besu-${nodeName}` || name.startsWith(`${networkId}-`) && name.endsWith(`-${nodeName}`)) {
        containerName = name;
        break;
      }
    }

    if (!containerName) {
      return NextResponse.json(
        { error: 'Contenedor del nodo no encontrado' },
        { status: 404 }
      );
    }

    // Detener y eliminar el contenedor
    try {
      await dockerService.stopContainer(containerName);
    } catch (error) {
      // Si el contenedor ya está detenido, continuar
      console.log(`Contenedor ${containerName} ya estaba detenido:`, error);
    }

    // El método stopContainer ya incluye la eliminación del contenedor
    // No necesitamos llamar removeContainer por separado

    // Eliminar la carpeta de datos del nodo
    // El directorio se crea con el formato: {networkId}-{nodeType}-besu-{nodeName}
    // Necesitamos usar el mismo formato que se usa en la creación
    const nodeDataDir = path.resolve(process.cwd(), 'temp-nodes', containerName);
    console.log(`Intentando eliminar carpeta: ${nodeDataDir}`);
    
    try {
      // Verificar si la carpeta existe antes de intentar eliminarla
      const exists = await fs.access(nodeDataDir).then(() => true).catch(() => false);
      if (exists) {
        await fs.rm(nodeDataDir, { recursive: true, force: true });
        console.log(`Carpeta de datos eliminada exitosamente: ${nodeDataDir}`);
      } else {
        console.log(`La carpeta de datos no existe: ${nodeDataDir}`);
        
        // Intentar también con el formato antiguo por compatibilidad
        const oldFormatDir = path.resolve(process.cwd(), 'temp-nodes', `besu-${nodeName}`);
        console.log(`Intentando formato antiguo: ${oldFormatDir}`);
        const oldExists = await fs.access(oldFormatDir).then(() => true).catch(() => false);
        if (oldExists) {
          await fs.rm(oldFormatDir, { recursive: true, force: true });
          console.log(`Carpeta de datos eliminada (formato antiguo): ${oldFormatDir}`);
        }
      }
    } catch (error) {
      console.error(`Error eliminando carpeta de datos ${nodeDataDir}:`, error);
      // No fallar la operación si no se puede eliminar la carpeta
    }

    return NextResponse.json({
      message: `Nodo ${nodeName} eliminado exitosamente`,
      nodeName,
      containerName,
      dataDir: nodeDataDir
    });

  } catch (error) {
    console.error('Error eliminando nodo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}