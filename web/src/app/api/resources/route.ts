// /api/resources/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { DockerManager } from '@/lib/docker-manager';
import { ResourceManager } from '@/lib/resource-manager';

const dockerManager = new DockerManager();
const resourceManager = new ResourceManager(dockerManager);

// ⚡ GET: Obtener estadísticas de recursos
export async function GET() {
  try {
    const stats = await resourceManager.getResourceStats();
    
    return NextResponse.json({
      success: true,
      resources: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [API] Error obteniendo estadísticas:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas de recursos' },
      { status: 500 }
    );
  }
}

// ⚡ POST: Limpiar recursos huérfanos
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action === 'cleanup') {
      console.log('🧹 [API] Iniciando limpieza de recursos...');
      const result = await resourceManager.cleanupOrphanedResources();
      
      return NextResponse.json({
        success: true,
        message: 'Limpieza completada',
        result,
        timestamp: new Date().toISOString()
      });
    }
    
    if (action === 'generate-config') {
      const { networkId, nodeType = 'rpc' } = await request.json();
      
      if (!networkId) {
        return NextResponse.json(
          { error: 'networkId requerido para generar configuración' },
          { status: 400 }
        );
      }
      
      const config = await resourceManager.generateNodeConfiguration(networkId, nodeType);
      
      return NextResponse.json({
        success: true,
        config,
        timestamp: new Date().toISOString()
      });
    }
    
    return NextResponse.json(
      { error: 'Acción no válida. Acciones disponibles: cleanup, generate-config' },
      { status: 400 }
    );
  } catch (error) {
    console.error('❌ [API] Error en operación de recursos:', error);
    return NextResponse.json(
      { error: 'Error en operación de recursos', details: error.message },
      { status: 500 }
    );
  }
}