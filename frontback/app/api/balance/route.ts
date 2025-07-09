import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'Address parameter is required' }, { status: 400 });
    }

    // Validate address
    if (!ethers.isAddress(address)) {
      return NextResponse.json({ error: 'Invalid Ethereum address' }, { status: 400 });
    }

    // Get environment configuration
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:9999';

    // Create provider
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Get balance
    const balance = await provider.getBalance(address);
    
    return NextResponse.json({
      address,
      balance: ethers.formatEther(balance),
      balanceWei: balance.toString()
    });

  } catch (error) {
    console.error('Balance error:', error);
    return NextResponse.json({ 
      error: 'Failed to get balance',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}