import { NextRequest, NextResponse } from 'next/server';
import { DockerService } from '@lib/services/docker.service';
import * as fs from 'fs-extra';
import * as path from 'path';

export async function POST(req: NextRequest) {
  try {
    console.log('🧹 Iniciando limpieza completa...');
    
    const dockerService = new DockerService();
    
    // Limpiar todos los contenedores de redes Besu
    const containers = await dockerService.getContainers();
    const besuContainers = containers.filter(c => 
      c.name.includes('besu') || c.name.includes('bootnode') || c.name.includes('miner') || c.name.includes('rpc')
    );
    
    console.log(`🗑️ Eliminando ${besuContainers.length} contenedores...`);
    for (const container of besuContainers) {
      try {
        await dockerService.removeContainer(container.id);
        console.log(`✅ Contenedor ${container.name} eliminado`);
      } catch (error) {
        console.warn(`⚠️ No se pudo eliminar contenedor ${container.name}:`, error);
      }
    }
    
    // Eliminar redes de Docker
    const networks = ['besu-network', 'besu-demo', 'test-network'];
    for (const networkName of networks) {
      try {
        await dockerService.removeNetwork(networkName);
        console.log(`✅ Red ${networkName} eliminada`);
      } catch (error) {
        console.warn(`⚠️ No se pudo eliminar red ${networkName}:`, error);
      }
    }
    
    // Eliminar directorios de redes
    const networksDir = path.join(process.cwd(), 'networks');
    if (await fs.pathExists(networksDir)) {
      await fs.remove(networksDir);
      console.log('✅ Directorio networks eliminado');
    }
    
    // Eliminar archivo accounts.json si existe
    const accountsFile = path.join(process.cwd(), 'accounts.json');
    if (await fs.pathExists(accountsFile)) {
      await fs.remove(accountsFile);
      console.log('✅ Archivo accounts.json eliminado');
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Limpieza completada',
      containersRemoved: besuContainers.length
    });
    
  } catch (error) {
    console.error('❌ Error en limpieza:', error);
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
} 