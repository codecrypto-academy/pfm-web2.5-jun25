export declare const BESU_TOOLS: ({
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            name: {
                type: string;
                description: string;
            };
            chainId: {
                type: string;
                description: string;
            };
            subnet: {
                type: string;
                description: string;
            };
            bootnodeIP: {
                type: string;
                description: string;
            };
            signerAccount: {
                type: string;
                description: string;
            };
            listOfNodes: {
                type: string;
                description: string;
                items: {
                    type: string;
                    properties: {
                        nodeType: {
                            type: string;
                            description: string;
                        };
                        ip: {
                            type: string;
                            description: string;
                        };
                        name: {
                            type: string;
                            description: string;
                        };
                        port: {
                            type: string;
                            description: string;
                        };
                    };
                    required: string[];
                };
            };
            prefundedAccounts: {
                type: string;
                description: string;
                items: {
                    type: string;
                    properties: {
                        address: {
                            type: string;
                            description: string;
                        };
                        amount: {
                            type: string;
                            description: string;
                        };
                    };
                    required: string[];
                };
            };
            nbrNetwork: {
                type: string;
                description: string;
            };
            networkName?: undefined;
            nodeName?: undefined;
            nodeType?: undefined;
            port?: undefined;
            ip?: undefined;
            address?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            name: {
                type: string;
                description: string;
            };
            chainId?: undefined;
            subnet?: undefined;
            bootnodeIP?: undefined;
            signerAccount?: undefined;
            listOfNodes?: undefined;
            prefundedAccounts?: undefined;
            nbrNetwork?: undefined;
            networkName?: undefined;
            nodeName?: undefined;
            nodeType?: undefined;
            port?: undefined;
            ip?: undefined;
            address?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            networkName: {
                type: string;
                description: string;
            };
            nodeName: {
                type: string;
                description: string;
            };
            nodeType: {
                type: string;
                description: string;
            };
            port: {
                type: string;
                description: string;
            };
            ip: {
                type: string;
                description: string;
            };
            name?: undefined;
            chainId?: undefined;
            subnet?: undefined;
            bootnodeIP?: undefined;
            signerAccount?: undefined;
            listOfNodes?: undefined;
            prefundedAccounts?: undefined;
            nbrNetwork?: undefined;
            address?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            networkName: {
                type: string;
                description: string;
            };
            nodeName: {
                type: string;
                description: string;
            };
            name?: undefined;
            chainId?: undefined;
            subnet?: undefined;
            bootnodeIP?: undefined;
            signerAccount?: undefined;
            listOfNodes?: undefined;
            prefundedAccounts?: undefined;
            nbrNetwork?: undefined;
            nodeType?: undefined;
            port?: undefined;
            ip?: undefined;
            address?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            networkName: {
                type: string;
                description: string;
            };
            address: {
                type: string;
                description: string;
            };
            name?: undefined;
            chainId?: undefined;
            subnet?: undefined;
            bootnodeIP?: undefined;
            signerAccount?: undefined;
            listOfNodes?: undefined;
            prefundedAccounts?: undefined;
            nbrNetwork?: undefined;
            nodeName?: undefined;
            nodeType?: undefined;
            port?: undefined;
            ip?: undefined;
        };
        required: string[];
    };
})[];
