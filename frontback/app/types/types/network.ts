export interface NetworkConfig {
    id: string;
    name: string;
    rpcUrl: string;
    chainId: number;
    currencySymbol: string;
    explorerUrl: string;
    faucetUrl?: string;
    color: string;
} 