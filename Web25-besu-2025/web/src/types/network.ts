export interface PrefundedAccount {
  address: string;
  amount: string;
}

export interface Node {
  type: 'rpc' | 'miner' | 'normal';
  ip: string;
}

export interface Network {
  id: string; // uuid
  network: string;
  cidr?: string;
  ip: string;
  chainId: number;
  prefundedAccounts: PrefundedAccount[];
  signerAccount: string;
  nodes: Node[];
} 