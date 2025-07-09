import { Network, Node } from './types';
export declare function fetchNetworks(): Promise<Network[]>;
export declare function fetchNetworkById(id: string): Promise<Network | null>;
export declare function createNetworkAction(data: Omit<Network, "id" | "createdAt" | "updatedAt">): Promise<Network>;
export declare function updateNetworkAction(id: string, data: Partial<Omit<Network, "id" | "createdAt" | "updatedAt" | "nodes">>): Promise<Network | null>;
export declare function deleteNetworkAction(id: string): Promise<boolean>;
export declare function fetchNodes(networkId: string): Promise<Node[]>;
export declare function fetchNodeById(networkId: string, nodeName: string): Promise<Node | null>;
export declare function createNodeAction(networkId: string, node: Node): Promise<Node[]>;
export declare function updateNodeAction(networkId: string, nodeName: string, data: Partial<Node>): Promise<Node | null>;
export declare function deleteNodeAction(networkId: string, nodeName: string): Promise<boolean>;
export declare function createBesuNetwork(name: string, chainId: number, subnet: string, bootnodeIP: string, signerAccount: string, listOfNodes: {
    nodeType: string;
    ip: string;
    name: string;
    port: number;
}[], prefundedAccounts?: {
    address: string;
    amount: string;
}[], nbrNetwork?: number): Promise<{
    success: boolean;
    error?: undefined;
} | {
    success: boolean;
    error: string;
}>;
export declare function removeBesuNetwork(name: string): Promise<{
    success: boolean;
    error?: undefined;
} | {
    success: boolean;
    error: string;
}>;
export declare function addBesuNode(networkName: string, nodeName: string, nodeType: string, port: string, ip?: string): Promise<{
    success: boolean;
    error?: undefined;
} | {
    success: boolean;
    error: string;
}>;
export declare function removeBesuNode(networkName: string, nodeName: string): Promise<{
    success: boolean;
    error?: undefined;
} | {
    success: boolean;
    error: string;
}>;
export declare function startBesuNetwork(name: string): Promise<{
    success: boolean;
    error?: undefined;
} | {
    success: boolean;
    error: string;
}>;
export declare function stopBesuNetwork(name: string): Promise<{
    success: boolean;
    error?: undefined;
} | {
    success: boolean;
    error: string;
}>;
export declare function getBesuBalance(networkName: string, address: string): Promise<any>;
export declare function getNetworksForLocalStorage(): Promise<{
    id: string;
    network: string;
    cidr: string;
    ip: string;
    chainId: number;
    signerAccount: string;
    prefundedAccounts: {
        address: string;
        amount: string;
    }[];
    nodes: {
        type: "rpc" | "miner" | "node";
        ip: string;
        name: string;
        port: number;
    }[];
}[]>;
