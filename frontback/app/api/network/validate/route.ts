import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

export async function POST(request: Request) {
    try {
        const { rpcUrl } = await request.json();
        
        if (!rpcUrl) {
            return NextResponse.json({ error: 'RPC URL is required' }, { status: 400 });
        }

        // Create provider with timeout
        const provider = new ethers.JsonRpcProvider(rpcUrl, undefined, {
            staticNetwork: true
        });

        // Test connection by getting network info
        const network = await provider.getNetwork();
        const blockNumber = await provider.getBlockNumber();
        
        return NextResponse.json({
            success: true,
            chainId: network.chainId.toString(),
            blockNumber,
            message: 'Connection successful'
        });
    } catch (error) {
        console.error('RPC validation error:', error);
        
        let errorMessage = 'Connection failed';
        if (error instanceof Error) {
            if (error.message.includes('ECONNREFUSED')) {
                errorMessage = 'Connection refused - node not running or port blocked';
            } else if (error.message.includes('timeout')) {
                errorMessage = 'Connection timeout - node not responding';
            } else if (error.message.includes('ENOTFOUND')) {
                errorMessage = 'Host not found - check URL';
            } else {
                errorMessage = error.message;
            }
        }
        
        return NextResponse.json({ 
            error: errorMessage 
        }, { status: 400 });
    }
}