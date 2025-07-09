import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getNetworkConfig } from '@/lib/network';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const networkId = searchParams.get('networkId');

    if (!networkId) {
        return NextResponse.json({ error: 'networkId is required' }, { status: 400 });
    }

    const networkConfig = getNetworkConfig(networkId);
    if (!networkConfig) {
        return NextResponse.json({ error: "Invalid network ID" }, { status: 400 });
    }

    try {
        const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl, undefined, { staticNetwork: true });
        const [blockNumber, feeData] = await Promise.all([
            provider.getBlockNumber(),
            provider.getFeeData()
        ]);

        const network = await provider.getNetwork();
        const block = await provider.getBlock(blockNumber);

        return NextResponse.json({
            isHealthy: true,
            chainId: Number(network.chainId),
            blockNumber: blockNumber,
            gasPrice: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') : 'N/A',
            lastBlockTimestamp: block?.timestamp,
        });
    } catch (error: any) {
        console.error('Network status error:', error);
        return NextResponse.json({ error: error.message || 'Failed to get network status' }, { status: 500 });
    }
}