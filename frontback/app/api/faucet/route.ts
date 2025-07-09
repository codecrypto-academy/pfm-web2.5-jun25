import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

export async function POST(request: NextRequest) {
  console.log('🚀 [FAUCET] Starting faucet transaction request');
  
  try {
    const body = await request.json();
    const { toAddress, amount } = body;
    
    console.log('📝 [FAUCET] Request details:', { toAddress, amount });

    if (!toAddress || !amount) {
      console.log('❌ [FAUCET] Missing required fields');
      return NextResponse.json({ error: 'toAddress and amount are required' }, { status: 400 });
    }

    // Validate address
    if (!ethers.isAddress(toAddress)) {
      console.log('❌ [FAUCET] Invalid address format:', toAddress);
      return NextResponse.json({ error: 'Invalid Ethereum address' }, { status: 400 });
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0 || amountNum > 10) {
      console.log('❌ [FAUCET] Invalid amount:', amount);
      return NextResponse.json({ error: 'Amount must be between 0 and 10 ETH' }, { status: 400 });
    }

    // Get environment configuration - Updated to use correct port
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545';
    const privateKey = process.env.PRIVATE_KEY;
    
    console.log('🔧 [FAUCET] Configuration:', { rpcUrl, hasPrivateKey: !!privateKey });

    if (!privateKey) {
      console.log('❌ [FAUCET] No private key in environment');
      return NextResponse.json({ error: 'No private key found in environment' }, { status: 500 });
    }

    // Create provider and wallet
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    console.log('💰 [FAUCET] Wallet address:', wallet.address);

    // Check sender balance
    const senderBalance = await provider.getBalance(wallet.address);
    const amountWei = ethers.parseEther(amount.toString());
    
    console.log('💸 [FAUCET] Balance check:', {
      senderBalance: ethers.formatEther(senderBalance),
      requestedAmount: amount,
      amountWei: amountWei.toString()
    });
    
    if (senderBalance < amountWei) {
      console.log('❌ [FAUCET] Insufficient funds');
      return NextResponse.json({ error: 'Insufficient funds in faucet' }, { status: 400 });
    }

    // Get current nonce for better reliability
    const currentNonce = await provider.getTransactionCount(wallet.address, 'pending');
    const network = await provider.getNetwork();
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('10', 'gwei');

    console.log('🔧 [FAUCET] Transaction parameters:', {
      to: toAddress,
      value: amountWei.toString(),
      gasLimit: 100000,
      gasPrice: gasPrice.toString(),
      nonce: currentNonce,
      chainId: Number(network.chainId)
    });

    // Send transaction with optimized configuration for private Besu network
    const tx = await wallet.sendTransaction({
      to: toAddress,
      value: amountWei,
      gasLimit: 100000,  // Increased from 21000
      gasPrice: gasPrice,       // Use network-suggested gas price
      nonce: currentNonce, // Explicit nonce management
      chainId: Number(network.chainId) // Explicit chainId
    });
    
    console.log('📤 [FAUCET] Transaction sent:', {
      hash: tx.hash,
      nonce: tx.nonce,
      gasLimit: tx.gasLimit?.toString(),
      gasPrice: tx.gasPrice?.toString()
    });

    // Wait for confirmation
    console.log('⏳ [FAUCET] Waiting for transaction confirmation...');
    const receipt = await tx.wait();
    
    console.log('✅ [FAUCET] Transaction confirmed:', {
      blockNumber: receipt?.blockNumber,
      gasUsed: receipt?.gasUsed?.toString(),
      status: receipt?.status
    });

    console.log('🎉 [FAUCET] Transaction successful, preparing response');
    
    return NextResponse.json({
      success: true,
      transaction: {
        hash: tx.hash,
        from: wallet.address,
        to: toAddress,
        value: amount,
        gasUsed: receipt?.gasUsed?.toString() || '0',
        blockNumber: receipt?.blockNumber || 0,
        confirmations: receipt?.confirmations || 0,
        nonce: tx.nonce,
        gasPrice: tx.gasPrice?.toString() || '0'
      }
    });

  } catch (error) {
    console.error('💥 [FAUCET] Fatal error:', error);
    
    // Log detailed error information
    if (error instanceof Error) {
      console.error('🔍 [FAUCET] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    
    return NextResponse.json({ 
      error: 'Failed to send faucet transaction',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}