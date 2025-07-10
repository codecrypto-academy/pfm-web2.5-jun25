import { BesuNodeConfig, BesuNetworkConfig } from 'devisrael-docker-manager';

export interface CreateNetworkRequest {
  networkName: string;
  subnet: string;
  dataPath?: string;
  nodes: BesuNodeConfig[];
}

export interface AddNodeRequest {
  networkName: string;
  node: BesuNodeConfig;
}

export interface RemoveNodeRequest {
  networkName: string;
  nodeName: string;
}

export interface NetworkResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export interface NetworkInfo {
  networkName: string;
  subnet: string;
  totalNodes: number;
  nodes: {
    name: string;
    ip: string;
    type: string;
    status: string;
  }[];
}

export interface NodeStatus {
  name: string;
  ip: string;
  type: string;
  status: 'running' | 'stopped' | 'error';
  containerId?: string;
}