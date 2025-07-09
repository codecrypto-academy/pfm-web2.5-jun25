import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fromPrivateKey, toAddress, amount } = body;

    if (!fromPrivateKey || !toAddress || !amount) {
      return NextResponse.json({ error: 'fromPrivateKey, toAddress and amount are required' }, { status: 400 });
    }

    // Validate address
    if (!ethers.isAddress(toAddress)) {
      return NextResponse.json({ error: 'Invalid Ethereum address' }, { status: 400 });
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
    }

    // Get environment configuration
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:9999';

    // Create provider and wallet
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(fromPrivateKey, provider);

    // Check sender balance
    const senderBalance = await provider.getBalance(wallet.address);
    const amountWei = ethers.parseEther(amount.toString());
    
    if (senderBalance < amountWei) {
      return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 });
    }

    // Send transaction
    const tx = await wallet.sendTransaction({
      to: toAddress,
      value: amountWei,
      gasLimit: 21000
    });

    // Wait for confirmation
    const receipt = await tx.wait();

    return NextResponse.json({
      success: true,
      transaction: {
        hash: tx.hash,
        from: wallet.address,
        to: toAddress,
        value: amount,
        gasUsed: receipt?.gasUsed?.toString() || '0',
        blockNumber: receipt?.blockNumber || 0,
        confirmations: receipt?.confirmations || 0
      }
    });

  } catch (error) {
    console.error('Transfer error:', error);
    return NextResponse.json({ 
      error: 'Failed to send transfer transaction',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}