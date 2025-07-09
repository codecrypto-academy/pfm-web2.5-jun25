import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getNetworkConfig } from '@/lib/network';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const networkId = searchParams.get('networkId');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (!networkId) {
        return NextResponse.json({ error: 'networkId is required' }, { status: 400 });
    }

    const networkConfig = getNetworkConfig(networkId);
    if (!networkConfig) {
        return NextResponse.json({ error: "Invalid network ID" }, { status: 400 });
    }

    try {
        const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl, undefined, { staticNetwork: true });
        const latestBlockNumber = await provider.getBlockNumber();
        const blocks = [];

        for (let i = 0; i < limit; i++) {
            const blockNumber = latestBlockNumber - i;
            if (blockNumber < 0) {
                break; // No hay más bloques que buscar
            }
            const block = await provider.getBlock(blockNumber);
            if (block) {
                blocks.push({
                    number: block.number,
                    timestamp: block.timestamp,
                    transactionCount: block.transactions.length, // Corregido
                    miner: block.miner,
                    gasUsed: ethers.formatUnits(block.gasUsed, 'wei'),
                    gasLimit: ethers.formatUnits(block.gasLimit, 'wei'), // Añadido
                    hash: block.hash, // Añadido
                });
            }
        }
        
        return NextResponse.json({ blocks });

    } catch (error: any) {
        console.error('Block explorer error:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch blocks' }, { status: 500 });
    }
}