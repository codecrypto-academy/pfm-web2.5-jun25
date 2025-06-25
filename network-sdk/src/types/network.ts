// Network-related type definitions
export interface NetworkConfig {
  networkName: string;
  chainId: number;
  rpcPort: number;
}

export interface NetworkStatus {
  running: boolean;
  containers: string[];
  blockNumber?: number;
}

export interface ContainerInfo {
  name: string;
  status: string;
  ports: string[];
}
