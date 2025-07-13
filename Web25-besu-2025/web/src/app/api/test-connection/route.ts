import { NextRequest, NextResponse } from 'next/server';
import { JsonRpcProvider } from 'ethers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const port = searchParams.get('port') || '8545';
    
    const rpcUrl = `http://localhost:${port}`;
    const provider = new JsonRpcProvider(rpcUrl);
    
    // Test de base
    const blockNumber = await provider.getBlockNumber();
    const network = await provider.getNetwork();
    
    // Test des méthodes Clique
    let cliqueInfo = null;
    try {
      const signers = await provider.send('clique_getSigners', ['latest']);
      cliqueInfo = { signers: signers.length };
    } catch (error) {
      cliqueInfo = { error: 'Clique not available' };
    }
    
    return NextResponse.json({ 
      success: true,
      rpcUrl,
      blockNumber,
      chainId: Number(network.chainId),
      name: network.name,
      clique: cliqueInfo,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
