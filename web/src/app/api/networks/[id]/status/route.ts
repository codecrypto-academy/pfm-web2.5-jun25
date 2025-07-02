import { NextRequest, NextResponse } from 'next/server';
import { networkManagerService } from '@/lib/networkManager';

/**
 * GET /api/networks/[id]/status - Get network status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: networkId } = await params;
    
    // Check if network exists
    const networkInfo = networkManagerService.getNetworkInfo(networkId);
    if (!networkInfo) {
      return NextResponse.json(
        { success: false, error: 'Network not found' },
        { status: 404 }
      );
    }

    // Get network status
    const status = await networkManagerService.getNetworkStatus(networkId);
    
    // Convert Map to object for JSON serialization
    const nodeStatuses: Record<string, string> = {};
    status.nodeStatuses.forEach((value, key) => {
      nodeStatuses[key] = value;
    });

    const serializedStatus = {
      networkId: status.networkId,
      status: status.status,
      nodeCount: status.nodeCount,
      nodeStatuses,
      uptime: status.uptime,
      uptimeFormatted: formatUptime(status.uptime)
    };

    return NextResponse.json({
      success: true,
      status: serializedStatus
    });

  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get network status'
      },
      { status: 500 }
    );
  }
}

/**
 * Format uptime in milliseconds to human readable format
 */
function formatUptime(uptimeMs: number): string {
  const seconds = Math.floor(uptimeMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}
