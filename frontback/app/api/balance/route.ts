import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getNetworkConfig } from '@/lib/network';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const networkId = searchParams.get('networkId');

    if (!address || !networkId) {
        return NextResponse.json({ error: 'Address and networkId are required' }, { status: 400 });
    }

    const networkConfig = getNetworkConfig(networkId);

    if (!networkConfig) {
        return NextResponse.json({ error: "Invalid network ID" }, { status: 400 });
    }

    try {
        const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl, undefined, { staticNetwork: true });
        const balance = await provider.getBalance(address);
        return NextResponse.json({ balance: ethers.formatEther(balance) });
    } catch (error: any) {
        console.error('Balance error:', error);
        return NextResponse.json({ 
            error: 'Failed to get balance',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}