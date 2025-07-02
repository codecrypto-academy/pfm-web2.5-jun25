import { NextRequest, NextResponse } from 'next/server';
import { networkManagerService } from '@/lib/networkManager';

export async function GET() {
  try {
    const isAvailable = await networkManagerService.isDockerAvailable();
    
    if (!isAvailable) {
      // Try to refresh status
      await networkManagerService.refreshDockerStatus();
      const refreshedStatus = await networkManagerService.isDockerAvailable();
      
      return NextResponse.json({
        available: refreshedStatus,
        message: refreshedStatus ? 'Docker is now available' : 'Docker is not available',
        suggestions: refreshedStatus ? [] : [
          'Ensure Docker is installed',
          'Start Docker daemon/Desktop',
          'Check Docker permissions',
          'Verify socket path'
        ]
      });
    }

    return NextResponse.json({
      available: true,
      message: 'Docker is available and ready',
      suggestions: []
    });

  } catch (error) {
    return NextResponse.json(
      { 
        available: false, 
        message: 'Failed to check Docker status',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
