// Types for Besu network management
export interface BesuNetworkConfig {
  name: string;
  chainId: number;
  subnet: string;
  consensus: 'clique' | 'ibft2';
  gasLimit: string;
  blockTime: number;
  signerAccounts: SignerAccount[];
}

export interface SignerAccount {
  address: string;
  weiAmount: string;
}

export interface BesuNodeDefinition {
  name: string;
  ip?: string;
  rpcPort: number;
  p2pPort: number;
  type: 'bootnode' | 'miner' | 'rpc' | 'validator';
}

export interface BesuNetwork {
  id: string;
  config: BesuNetworkConfig;
  nodes: BesuNodeDefinition[];
  status: 'stopped' | 'starting' | 'running' | 'stopping' | 'error';
  createdAt: Date;
  updatedAt: Date;
}

export interface NetworkConnectivity {
  nodeName: string;
  isActive: boolean;
  blockNumber?: number;
  peerCount?: number;
  error?: string;
}

export interface CreateNetworkRequest {
  config: BesuNetworkConfig;
  nodes: BesuNodeDefinition[];
}

export interface UpdateNetworkRequest {
  config?: Partial<BesuNetworkConfig>;
  nodes?: BesuNodeDefinition[];
}

export interface NetworkListResponse {
  networks: BesuNetwork[];
  total: number;
}

export interface NetworkResponse {
  network: BesuNetwork;
  connectivity?: NetworkConnectivity[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Form types for the UI
export interface NetworkFormData {
  name: string;
  chainId: number;
  consensus: 'clique' | 'ibft2';
  gasLimit: string;
  blockTime: number;
  subnet?: string;
  signerAccounts: {
    address: string;
    ethAmount: string; // User-friendly ETH amount
  }[];
  nodes: {
    name: string;
    type: 'bootnode' | 'miner' | 'rpc' | 'validator';
    rpcPort: number;
    p2pPort: number;
    ip?: string;
  }[];
}

// Network status and operations
export type NetworkOperation = 'start' | 'stop' | 'restart' | 'delete';

export interface NetworkOperationResponse {
  success: boolean;
  operation: NetworkOperation;
  networkId: string;
  message?: string;
  error?: string;
}
