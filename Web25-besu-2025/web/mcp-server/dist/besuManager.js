"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBesuNetwork = createBesuNetwork;
exports.removeBesuNetwork = removeBesuNetwork;
exports.getBesuNetwork = getBesuNetwork;
exports.addBesuNode = addBesuNode;
exports.removeBesuNode = removeBesuNode;
exports.startBesuNetwork = startBesuNetwork;
exports.stopBesuNetwork = stopBesuNetwork;
exports.getBesuBalance = getBesuBalance;
// Importe de la biblioteca lib-besu que maneja las redes y nodos de Besu
const index_1 = require("./lib-besu/index");
const bootnodePort = 28545; // Puerto inicial para el bootnode
const signerPort = 28555; // Puerto inicial para el nodo que firma
async function createBesuNetwork(name, chainId, subnet, bootnodeIP, signerAccount = '', listOfNodes, prefundedAccounts = [], nbrNetwork = 0) {
    try {
        const prefundedAddresses = prefundedAccounts.map(acc => acc.address);
        const prefundedValues = prefundedAccounts.map(acc => acc.amount);
        const dockerNetwork = await index_1.DockerNetwork.create(name, chainId, subnet, [], signerAccount, prefundedAddresses, prefundedValues);
        await dockerNetwork.addBootnode('bootnode', (bootnodePort + nbrNetwork).toString(), bootnodeIP);
        const subnetParts = subnet.split('/');
        const baseIP = subnetParts[0].split('.');
        const signerIP = `${baseIP[0]}.${baseIP[1]}.${baseIP[2]}.2`; // IP del nodo firmante
        if (signerAccount !== '')
            await dockerNetwork.addMiner('miner', (signerPort + nbrNetwork).toString(), signerIP);
        for (const node of listOfNodes) {
            switch (node.nodeType) {
                case 'miner':
                    await dockerNetwork.addMiner(node.name, node.port.toString(), node.ip);
                    break;
                case 'rpc':
                    await dockerNetwork.addRpc(node.name, node.port.toString(), node.ip);
                    break;
                case 'node':
                    await dockerNetwork.addFullNode(node.name, node.port.toString(), node.ip);
                    break;
            }
        }
        return { success: true };
    }
    catch (error) {
        return { success: false, error: (error instanceof Error ? error.message : String(error)) };
    }
}
async function removeBesuNetwork(name) {
    try {
        await index_1.DockerNetwork.removeDockerNetwork(name);
        return { success: true };
    }
    catch (error) {
        return { success: false, error: (error instanceof Error ? error.message : String(error)) };
    }
}
async function getBesuNetwork(name) {
    try {
        return { name };
    }
    catch (error) {
        return { success: false, error: (error instanceof Error ? error.message : String(error)) };
    }
}
async function addBesuNode(networkName, nodeName, nodeType, port, ip) {
    try {
        const network = new index_1.DockerNetwork(networkName);
        switch (nodeType) {
            case 'bootnode':
                await network.addBootnode(nodeName, port, ip ?? '');
                break;
            case 'miner':
                await network.addMiner(nodeName, port, ip ?? '');
                break;
            case 'rpc':
                await network.addRpc(nodeName, port, ip ?? '');
                break;
            case 'node':
                await network.addFullNode(nodeName, port, ip ?? '');
                break;
        }
        return { success: true };
    }
    catch (error) {
        return { success: false, error: (error instanceof Error ? error.message : String(error)) };
    }
}
async function removeBesuNode(networkName, nodeName) {
    try {
        const network = new index_1.DockerNetwork(networkName);
        await network.removeNode(nodeName);
        return { success: true };
    }
    catch (error) {
        return { success: false, error: (error instanceof Error ? error.message : String(error)) };
    }
}
async function startBesuNetwork(name) {
    try {
        const network = new index_1.DockerNetwork(name);
        await network.start();
        return { success: true };
    }
    catch (error) {
        return { success: false, error: (error instanceof Error ? error.message : String(error)) };
    }
}
async function stopBesuNetwork(name) {
    try {
        const network = new index_1.DockerNetwork(name);
        await network.stop();
        return { success: true };
    }
    catch (error) {
        return { success: false, error: (error instanceof Error ? error.message : String(error)) };
    }
}
async function getBesuBalance(networkName, address) {
    try {
        const network = new index_1.DockerNetwork(networkName);
        return await network.getBalance(address);
    }
    catch (error) {
        return { success: false, error: (error instanceof Error ? error.message : String(error)) };
    }
}
