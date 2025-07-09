import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitStr = searchParams.get('limit') || '10';
    const fromBlockStr = searchParams.get('fromBlock');
    
    const limit = parseInt(limitStr);
    if (isNaN(limit) || limit <= 0 || limit > 100) {
      return NextResponse.json({ error: 'Limit must be between 1 and 100' }, { status: 400 });
    }

    // Get environment configuration
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:9999';

    // Create provider
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Get current block number
    const currentBlock = await provider.getBlockNumber();
    
    // Determine starting block
    const fromBlock = fromBlockStr ? parseInt(fromBlockStr) : Math.max(0, currentBlock - limit + 1);
    
    // Get blocks
    const blocks = [];
    for (let i = Math.max(0, fromBlock); i <= currentBlock && blocks.length < limit; i++) {
      try {
        const block = await provider.getBlock(i);
        if (block) {
          blocks.push({
            number: block.number,
            timestamp: block.timestamp,
            gasUsed: block.gasUsed?.toString() || '0',
            gasLimit: block.gasLimit?.toString() || '0',
            miner: block.miner || '',
            transactionCount: block.transactions?.length || 0,
            hash: block.hash || '',
            parentHash: block.parentHash || ''
          });
        }
      } catch (error) {
        // Skip blocks that can't be fetched
        console.warn(`Failed to fetch block ${i}:`, error);
      }
    }

    return NextResponse.json({
      blocks: blocks.reverse(), // Most recent first
      currentBlock,
      totalBlocks: blocks.length
    });

  } catch (error) {
    console.error('Blocks error:', error);
    return NextResponse.json({ 
      error: 'Failed to get blocks',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}