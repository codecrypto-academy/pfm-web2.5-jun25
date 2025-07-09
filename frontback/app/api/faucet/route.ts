import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getNetworkConfig } from '@/lib/network';

export async function POST(request: Request) {
    const { toAddress, networkId, amount } = await request.json();

    if (!toAddress || !networkId || !amount) {
        return NextResponse.json({ error: 'toAddress, networkId, and amount are required' }, { status: 400 });
    }
    
    if (!ethers.isAddress(toAddress)) {
        return NextResponse.json({ error: 'Invalid Ethereum address' }, { status: 400 });
    }

    const networkConfig = getNetworkConfig(networkId);
    if (!networkConfig) {
        return NextResponse.json({ error: "Invalid network ID" }, { status: 400 });
    }

    try {
        const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl, undefined, { staticNetwork: true });
        const privateKey = networkConfig.privateKey || process.env.VALIDATOR_PRIVATE_KEY;
        if (!privateKey) {
            throw new Error("Validator private key not configured");
        }
        const wallet = new ethers.Wallet(privateKey, provider);

        const feeData = await provider.getFeeData();
        const amountWei = ethers.parseEther(amount.toString());

        const tx = await wallet.sendTransaction({
            to: toAddress,
            value: amountWei,
            gasPrice: feeData.gasPrice,
        });

        console.log(`Faucet transaction sent: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`Transaction confirmed in block: ${receipt?.blockNumber}`);

        return NextResponse.json({
            success: true,
            txHash: tx.hash,
        });
    } catch (error: any) {
        console.error('Faucet error:', error);
        return NextResponse.json({ error: error.message || 'Failed to send faucet transaction' }, { status: 500 });
    }
}