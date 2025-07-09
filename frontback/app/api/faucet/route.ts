import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { toAddress, amount } = body;

    if (!toAddress || !amount) {
      return NextResponse.json({ error: 'toAddress and amount are required' }, { status: 400 });
    }

    // Validate address
    if (!ethers.isAddress(toAddress)) {
      return NextResponse.json({ error: 'Invalid Ethereum address' }, { status: 400 });
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0 || amountNum > 10) {
      return NextResponse.json({ error: 'Amount must be between 0 and 10 ETH' }, { status: 400 });
    }

    // Get environment configuration
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:9999';
    const privateKey = process.env.PRIVATE_KEY;

    if (!privateKey) {
      return NextResponse.json({ error: 'No private key found in environment' }, { status: 500 });
    }

    // Create provider and wallet
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    // Check sender balance
    const senderBalance = await provider.getBalance(wallet.address);
    const amountWei = ethers.parseEther(amount.toString());
    
    if (senderBalance < amountWei) {
      return NextResponse.json({ error: 'Insufficient funds in faucet' }, { status: 400 });
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
    console.error('Faucet error:', error);
    return NextResponse.json({ 
      error: 'Failed to send faucet transaction',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}