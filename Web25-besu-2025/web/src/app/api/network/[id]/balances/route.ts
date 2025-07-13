import { NextRequest, NextResponse } from 'next/server';
import { JsonRpcProvider, formatEther } from 'ethers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Récupérer les paramètres depuis la query string
    const { searchParams } = new URL(request.url);
    const rpcIp = searchParams.get('ip') || 'localhost';
    const rpcPort = searchParams.get('port') || '8545';
    const accountsParam = searchParams.get('accounts');
    
    if (!accountsParam) {
      return NextResponse.json(
        { success: false, error: 'Missing accounts parameter' },
        { status: 400 }
      );
    }
    
    const accounts = JSON.parse(accountsParam);
    const rpcUrl = `http://${rpcIp}:${rpcPort}`;
    const provider = new JsonRpcProvider(rpcUrl);
    
    // Récupérer les soldes de tous les comptes
    const balances = await Promise.all(
      accounts.map(async (account: { address: string; amount: string }) => {
        try {
          const balance = await provider.getBalance(account.address);
          return {
            address: account.address,
            balance: balance.toString(),
            balanceEth: formatEther(balance),
            originalAmount: account.amount
          };
        } catch (error) {
          return {
            address: account.address,
            balance: '0',
            balanceEth: '0.0',
            originalAmount: account.amount,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );
    
    return NextResponse.json({ 
      success: true,
      balances 
    });
    
  } catch (error) {
    console.error('Error fetching balances:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
