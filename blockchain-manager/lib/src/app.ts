import Docker from "dockerode";
import fs from "fs";
import path from "path";
import {
    BOOTNODE_IP,
    BOOTNODE_NAME,
    BOOTNODE_PORT,
    CHAIN_ID,
    MINERNODE_IP,
    MINERNODE_NAME,
    MINERNODE_PORT,
    NETWORK_GATEWAY,
    NETWORK_NAME,
    NETWORK_SUBNET,
    RPC_PORT_NODE_LIST,
} from "./constants";
import { createBesuNodeConfigFile } from "./services/besuNodeConfigFile";
import { createCliqueGenesisFile } from "./services/cliqueGenesisFile";
import { createBesuNode } from "./services/createBesuNode";
import { createNodeIdentityFiles } from "./services/createNodeIdentityFiles";
import { ensureNetworkExists } from "./services/ensureNetworkExists";
import { BesuNodeConfig, BesuNodeType } from "./types";
import { generateIpAddress } from "./services/generateIpAddress";

const docker = new Docker();

(async () => {
    try {
        await ensureNetworkExists(docker, { name: NETWORK_NAME, subnet: NETWORK_SUBNET, gateway: NETWORK_GATEWAY });

        const blockchainDataPath = path.join(process.cwd(), NETWORK_NAME);

        if (fs.existsSync(blockchainDataPath)) {
            console.log(`Removing existing blockchain data at: ${blockchainDataPath}`);
            fs.rmSync(blockchainDataPath, { recursive: true, force: true });
        }

        const bootnodeConfig: BesuNodeConfig = {
            name: BOOTNODE_NAME,
            network: {
                name: NETWORK_NAME,
                ip: BOOTNODE_IP
            },
            hostPort: BOOTNODE_PORT,
            type: BesuNodeType.BOOTNODE,

        };
        const bootnodeIdentityFiles = createNodeIdentityFiles(bootnodeConfig);

        const minernodeConfig: BesuNodeConfig = {
            name: MINERNODE_NAME,
            network: {
                name: NETWORK_NAME,
                ip: MINERNODE_IP
            },
            hostPort: MINERNODE_PORT,
            type: BesuNodeType.MINER,
        };
        const minernodeIdentityFiles = createNodeIdentityFiles(minernodeConfig);

        const validatorAddress = fs.readFileSync(path.join(blockchainDataPath, minernodeIdentityFiles.addressFile), { encoding: 'utf-8' });
        createCliqueGenesisFile(blockchainDataPath, {
            chainId: CHAIN_ID,
            initialValidators: [`0x${validatorAddress}`],
            preAllocatedAccounts: [
                {
                    address: `0x${validatorAddress}`,
                    balance: '0xad78ebc5ac6200000'
                }
            ],
        });

        createBesuNodeConfigFile(blockchainDataPath);

        await createBesuNode(docker, bootnodeConfig, bootnodeIdentityFiles);

        const bootnodeEnode = fs.readFileSync(path.join(blockchainDataPath, bootnodeIdentityFiles.enodeFile), { encoding: 'utf-8' });
        await createBesuNode(docker, {
            ...minernodeConfig,
            options: {
                minerEnabled: true,
                minerCoinbase: validatorAddress,
                minGasPrice: 0,
                bootnodes: bootnodeEnode
            }
        }, minernodeIdentityFiles);

        for (const [index, rpcNodePort] of RPC_PORT_NODE_LIST.entries()) {
            const ip = generateIpAddress(NETWORK_SUBNET, index);

            const rpcnodeConfig: BesuNodeConfig = {
                name: `RPC_${rpcNodePort}_NODE`,
                network: {
                    name: NETWORK_NAME,
                    ip
                },
                hostPort: rpcNodePort,
                type: BesuNodeType.RPC,
                options: {
                    bootnodes: bootnodeEnode
                }
            };
            const rpcNodeIdentityFiles = createNodeIdentityFiles(rpcnodeConfig);

            await createBesuNode(docker, rpcnodeConfig, rpcNodeIdentityFiles);
        }

    } catch (error) {
        throw error;
    }
})();



