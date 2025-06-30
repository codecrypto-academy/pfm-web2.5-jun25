export interface PrefundedAccount {
  address: string;
  amount: string;
}

export interface Node {
  type: 'rpc' | 'miner' | 'node'; // type de noeud (rpc, miner, node)
  ip: string;
  name: string; // nom unique du noeud (ex: rpc18550)
  port: number; // port utilisé pour ce noeud
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