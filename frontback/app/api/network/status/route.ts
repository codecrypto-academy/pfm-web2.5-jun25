import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

export async function GET() {
  try {
    // Read environment configuration
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:9999';
    const privateKey = process.env.PRIVATE_KEY;

    if (!privateKey) {
      return NextResponse.json({ error: 'No private key found in environment' }, { status: 500 });
    }

    // Create provider
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Get network info
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNumber);
    
    // Create wallet for account info
    const wallet = new ethers.Wallet(privateKey, provider);
    const balance = await provider.getBalance(wallet.address);
    
    // Get peer count (if available)
    let peerCount = 0;
    try {
      peerCount = await provider.send('net_peerCount', []);
      peerCount = parseInt(peerCount, 16);
    } catch (e) {
      // Peer count not available
    }

    return NextResponse.json({
      network: {
        chainId: Number(network.chainId),
        name: network.name || 'Besu Private Network',
        rpcUrl
      },
      blockchain: {
        blockNumber,
        blockTimestamp: block?.timestamp || 0,
        gasUsed: block?.gasUsed?.toString() || '0',
        transactionCount: block?.transactions?.length || 0,
        peerCount
      },
      account: {
        address: wallet.address,
        balance: ethers.formatEther(balance),
        balanceWei: balance.toString()
      }
    });
  } catch (error) {
    console.error('Network status error:', error);
    return NextResponse.json({ 
      error: 'Failed to get network status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}