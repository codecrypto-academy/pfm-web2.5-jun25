/**
 * Types for the Besu network operations
 */

export interface BesuNodeConfig {
  id: string;
  type: 'bootnode' | 'miner' | 'rpc';
  rpcPort: number;
  p2pPort: number;
  ip: string;
  enode?: string; // Enode will be generated
  address?: string; // Address will be generated
  bootnodes?: string[];
}

export interface NetworkConfig {
  networkId: string;
  chainId: number;
  subnet: string;
  gateway: string;
  nodes: BesuNodeConfig[];
  genesis?: any; // Allow providing a custom genesis
}

export interface ContainerInfo {
  id: string;
  containerId: string;
  containerName: string;
  status: 'running' | 'stopped' | 'error';
}

export interface NetworkInfo {
  networkId: string;
  dockerNetworkId: string;
  containers: Map<string, ContainerInfo>;
  networkPath: string;
  chainId: number;
  subnet: string;
  gateway: string;
}

export interface NodeCredentials {
  privateKey: string;
  publicKey: string;
  address: string;
  enode: string;
}
