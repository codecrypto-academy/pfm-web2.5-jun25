export declare function createBesuNetwork(name: string, chainId: number, subnet: string, bootnodeIP: string, signerAccount: string | undefined, listOfNodes: {
    nodeType: string;
    ip: string;
    name: string;
    port: number;
}[], prefundedAccounts?: {
    address: string;
    amount: string;
}[], autoSigner?: boolean, nbrNetwork?: number): Promise<{
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
export declare function getBesuNetwork(name: string): Promise<{
    name: string;
    success?: undefined;
    error?: undefined;
} | {
    success: boolean;
    error: string;
    name?: undefined;
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
export declare function getBesuBalance(networkName: string, address: string): Promise<bigint | {
    success: boolean;
    error: string;
}>;
