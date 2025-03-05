export type NodeType = 'miner' | 'rpc' | 'bootnode';

export interface Node {
  id: string;
  networkId: string;
  name: string;
  type: NodeType;
  ip: string;
  port: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Network {
  id: string;
  name: string;
  chainId: number;
  signerAddress: string;
  accounts: {
    address: string;
    balance: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
  nodes: Node[];
} 