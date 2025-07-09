"use strict";
// mcp-server/src/besu-network-manager.ts
// Interface MCP <-> lib-besu
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchNetworks = fetchNetworks;
exports.fetchNetworkById = fetchNetworkById;
exports.createNetworkAction = createNetworkAction;
exports.updateNetworkAction = updateNetworkAction;
exports.deleteNetworkAction = deleteNetworkAction;
exports.fetchNodes = fetchNodes;
exports.fetchNodeById = fetchNodeById;
exports.createNodeAction = createNodeAction;
exports.updateNodeAction = updateNodeAction;
exports.deleteNodeAction = deleteNodeAction;
exports.createBesuNetwork = createBesuNetwork;
exports.removeBesuNetwork = removeBesuNetwork;
exports.addBesuNode = addBesuNode;
exports.removeBesuNode = removeBesuNode;
exports.startBesuNetwork = startBesuNetwork;
exports.stopBesuNetwork = stopBesuNetwork;
exports.getBesuBalance = getBesuBalance;
exports.getNetworksForLocalStorage = getNetworksForLocalStorage;
const data_1 = require("./data");
const besuManager = __importStar(require("./besuManager"));
// Initialize the database when the server starts
(0, data_1.initializeDatabase)().catch(error => {
    console.error('Failed to initialize database:', error);
});
// Network actions
async function fetchNetworks() {
    return (0, data_1.getNetworks)();
}
async function fetchNetworkById(id) {
    return (0, data_1.getNetworkById)(id);
}
async function createNetworkAction(data) {
    const network = await (0, data_1.createNetwork)(data);
    return network;
}
async function updateNetworkAction(id, data) {
    const network = await (0, data_1.updateNetwork)(id, data);
    return network;
}
async function deleteNetworkAction(id) {
    const success = await (0, data_1.deleteNetwork)(id);
    return success;
}
// Node actions
async function fetchNodes(networkId) {
    return (0, data_1.getNodes)(networkId);
}
async function fetchNodeById(networkId, nodeName) {
    return (0, data_1.getNodeById)(networkId, nodeName);
}
async function createNodeAction(networkId, node) {
    const nodes = await (0, data_1.createNode)(networkId, node);
    return nodes;
}
async function updateNodeAction(networkId, nodeName, data) {
    const node = await (0, data_1.updateNode)(networkId, nodeName, data);
    return node;
}
async function deleteNodeAction(networkId, nodeName) {
    const success = await (0, data_1.deleteNode)(networkId, nodeName);
    return success;
}
// Besu Network actions
async function createBesuNetwork(name, chainId, subnet, bootnodeIP, signerAccount, listOfNodes, prefundedAccounts = [], nbrNetwork = 0) {
    try {
        // Prepare all nodes with correct types and IDs
        const nodes = listOfNodes.map(node => ({
            id: `${name}-${node.name}`,
            networkId: name, // On utilisera le nom comme networkId
            name: node.name,
            type: node.nodeType,
            ip: node.ip,
            port: node.port,
            createdAt: new Date(),
            updatedAt: new Date()
        }));
        // Create network in database with all nodes in one operation
        const network = await createNetworkAction({
            name,
            chainId,
            subnet,
            ip: bootnodeIP,
            signerAddress: signerAccount,
            accounts: prefundedAccounts.map(acc => ({ address: acc.address, balance: acc.amount })),
            nodes
        });
        if (!network) {
            throw new Error('Failed to create network in database');
        }
        // Create the actual Besu network
        const result = await besuManager.createBesuNetwork(name, chainId, subnet, bootnodeIP, signerAccount, listOfNodes, prefundedAccounts, nbrNetwork);
        return result;
    }
    catch (error) {
        // If Besu network creation fails, clean up the database
        try {
            const networkData = await (0, data_1.getNetworkByName)(name);
            if (networkData) {
                await deleteNetworkAction(networkData.id);
            }
        }
        catch (cleanupError) {
            console.error('Failed to cleanup network from database:', cleanupError);
        }
        throw error;
    }
}
async function removeBesuNetwork(name) {
    try {
        // Get network by name first
        const networkData = await (0, data_1.getNetworkByName)(name);
        if (!networkData) {
            throw new Error(`Network ${name} not found in database`);
        }
        // Delete network from database first
        await deleteNetworkAction(networkData.id);
        // Then remove the actual Besu network
        const result = await besuManager.removeBesuNetwork(name);
        return result;
    }
    catch (error) {
        console.error('Failed to remove Besu network:', error);
        throw new Error(`Failed to remove network ${name}. The database and Besu network may be in an inconsistent state.`);
    }
}
async function addBesuNode(networkName, nodeName, nodeType, port, ip) {
    try {
        // Get network by name first
        const networkData = await (0, data_1.getNetworkByName)(networkName);
        if (!networkData) {
            throw new Error(`Network ${networkName} not found in database`);
        }
        // Create node in database first
        await createNodeAction(networkData.id, {
            id: `${networkName}-${nodeName}`,
            networkId: networkData.id,
            name: nodeName,
            type: nodeType,
            ip: ip || '',
            port: parseInt(port),
            createdAt: new Date(),
            updatedAt: new Date()
        });
        // Then create the actual Besu node
        const result = await besuManager.addBesuNode(networkName, nodeName, nodeType, port, ip);
        return result;
    }
    catch (error) {
        // If Besu node creation fails, remove the node from database
        try {
            const networkData = await (0, data_1.getNetworkByName)(networkName);
            if (networkData) {
                await deleteNodeAction(networkData.id, nodeName);
            }
        }
        catch (cleanupError) {
            console.error('Failed to cleanup node from database:', cleanupError);
        }
        throw error;
    }
}
async function removeBesuNode(networkName, nodeName) {
    try {
        // Get network by name first
        const networkData = await (0, data_1.getNetworkByName)(networkName);
        if (!networkData) {
            throw new Error(`Network ${networkName} not found in database`);
        }
        // Delete node from database first
        await deleteNodeAction(networkData.id, nodeName);
        // Then remove the actual Besu node
        const result = await besuManager.removeBesuNode(networkName, nodeName);
        return result;
    }
    catch (error) {
        console.error('Failed to remove Besu node:', error);
        throw new Error(`Failed to remove node ${nodeName} from network ${networkName}. The database and Besu node may be in an inconsistent state.`);
    }
}
async function startBesuNetwork(name) {
    const result = await besuManager.startBesuNetwork(name);
    return result;
}
async function stopBesuNetwork(name) {
    const result = await besuManager.stopBesuNetwork(name);
    return result;
}
async function getBesuBalance(networkName, address) {
    const result = await besuManager.getBesuBalance(networkName, address);
    // Convert BigInt to string if present
    return JSON.parse(JSON.stringify(result, replacerBigInt));
}
// Utility to convert BigInt to string for JSON serialization
function replacerBigInt(key, value) {
    return typeof value === 'bigint' ? value.toString() : value;
}
async function getNetworksForLocalStorage() {
    try {
        const networks = await (0, data_1.getNetworks)();
        return networks.map(network => ({
            id: network.id,
            network: network.name,
            cidr: network.subnet,
            ip: network.ip,
            chainId: network.chainId,
            signerAccount: network.signerAddress,
            prefundedAccounts: network.accounts.map(acc => ({
                address: acc.address,
                amount: acc.balance
            })),
            nodes: network.nodes.map(node => ({
                type: node.type.toLowerCase(),
                ip: node.ip,
                name: node.name,
                port: node.port
            }))
        }));
    }
    catch (error) {
        console.error('Error fetching networks:', error);
        return [];
    }
}
