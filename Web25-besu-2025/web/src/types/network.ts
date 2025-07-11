export interface PrefundedAccount {
  address: string;
  amount: string;
}

export interface Node {
  type: 'rpc' | 'miner' | 'node'; // Node type (rpc, miner, node)
  ip: string;
  name: string; // Unique name of the node (e.g., rpc18550)
  port: number; // Port used by the node (e.g., 8550)
}

export interface Network {
  id: string; // uuid
  network: string;
  cidr?: string;
  ip: string;
  chainId: number;
  prefundedAccounts: PrefundedAccount[];
  signerAccount: string;
  autoSigner?: boolean;
  nodes: Node[];
}