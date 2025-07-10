import { NextResponse } from 'next/server';
import { networkStore } from '@/lib/network-store';
import { ApiResponse } from '@/types/besu';
import BesuNetwork from '@/lib/besu';

/**
 * POST /api/cleanup - Cleanup all networks
 */
export async function POST(): Promise<NextResponse<ApiResponse<void>>> {
  try {
    // Get all networks from store
    const networks = networkStore.getAllNetworks();
    
    // Cleanup each network using the external library
    for (const network of networks) {
      try {
        const besuNetworkInstance = new BesuNetwork(
          {
            name: network.id,
            chainId: network.config.chainId,
            subnet: network.config.subnet,
            consensus: network.config.consensus,
            gasLimit: network.config.gasLimit,
            blockTime: network.config.blockTime,
            signerAccounts: network.config.signerAccounts
          },
          "./networks"
        );
        
        // Destroy the network (stops containers and removes network)
        await besuNetworkInstance.destroy();
      } catch (error) {
        console.warn(`Failed to cleanup network ${network.id}:`, error);
        // Continue with other networks even if one fails
      }
    }
    
    // Clear the network store
    networkStore.clear();

    return NextResponse.json({
      success: true,
      message: 'All networks cleaned up successfully'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cleanup networks'
    }, { status: 500 });
  }
}
