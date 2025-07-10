export interface NodeConfig {
  name: string;
  type: 'bootnode' | 'miner' | 'rpc';
  port: number;
  rpcPort?: number;
  privateKey?: string;
  enode?: string;
  ip: string;
}

export interface NetworkConfig {
  chainId: number;
  networkName: string;
  subnet: string;
  nodes: NodeConfig[];
  genesisConfig: GenesisConfig;
}

export interface GenesisConfig {
  chainId: number;
  gasLimit: string;
  difficulty: string;
  blockPeriodSeconds: number;
  epochLength: number;
  alloc: Record<string, { balance: string }>;
}

export interface GenesisFile {
  config: {
    chainId: number;
    londonBlock: number;
    clique: {
      blockperiodseconds: number;
      epochlength: number;
      createemptyblocks: boolean;
    };
  };
  extraData: string;
  gasLimit: string;
  difficulty: string;
  alloc: Record<string, { balance: string }>;
}

export interface DockerContainer {
  id: string;
  name: string;
  status: string;
  ports: string[];
  labels?: Record<string, string>;
}

export interface TransferResult {
  from: string;
  to: string;
  amount: string;
  txHash: string;
  blockNumber: number;
  gasUsed: string;
  success: boolean;
  error?: string;
}

export interface WalletInfo {
  address: string;
  privateKey: string;
  balance: string;
}

export interface NetworkStatus {
  isRunning: boolean;
  nodes: DockerContainer[];
  totalNodes: number;
  runningNodes: number;
}

export interface TransactionConfig {
  from: string;
  to: string;
  value: string;
  gasLimit?: number;
  gasPrice?: string;
}

export interface AccountGenerationResult {
  mnemonic: string;
  accounts: WalletInfo[];
  accountsFile: string;
} 