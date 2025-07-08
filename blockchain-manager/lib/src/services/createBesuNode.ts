import Docker from "dockerode";
import { PROJECT_LABEL, RPC_PORT } from "../constants";
import { BesuNodeConfig, NodeIdentityFiles } from "../types";

export async function createBesuNode(docker: Docker, nodeConfig: BesuNodeConfig, nodeIdentityFiles: NodeIdentityFiles): Promise<string> {

    const nodeIdentityPath = `${process.cwd()}/${nodeConfig.network.name}`;

    const containerConfig: Docker.ContainerCreateOptions = {
        Image: "hyperledger/besu:latest",
        name: nodeConfig.name,
        Cmd: [
            `--config-file=/data/config.toml`,
            `--data-path=/data/${nodeConfig.name}/data`,
            `--node-private-key-file=/data/${nodeIdentityFiles.privateKeyFile}`,
            `--genesis-file=/data/genesis.json`,
            ...(nodeConfig.options?.minerEnabled ? ['--miner-enabled=true'] : []),
            ...(nodeConfig.options?.minerCoinbase ? [`--miner-coinbase="${nodeConfig.options.minerCoinbase}"`] : []),
            ...(nodeConfig.options?.minGasPrice !== undefined ? [`--min-gas-price=${nodeConfig.options.minGasPrice}`] : []),
            ...(nodeConfig.options?.bootnodes ? [`--bootnodes="${nodeConfig.options.bootnodes}"`] : []),
        ],
        Labels: {
            "node": nodeConfig.name,
            "network": nodeConfig.network.name,
            "project": PROJECT_LABEL,
        },
        HostConfig: {
            PortBindings: {
                [`${RPC_PORT}/tcp`]: [{ HostPort: nodeConfig.hostPort.toString() }]
            },
            Binds: [`${nodeIdentityPath}:/data`]
        },
        NetworkingConfig: {
            EndpointsConfig: {
                [nodeConfig.network.name]: {
                    IPAMConfig: {
                        IPv4Address: nodeConfig.network.ip
                    }
                }
            }
        }
    };

    try {
        const containerFinder = await docker.listContainers({
            all: true,
            filters: {
                name: [`${nodeConfig.name}`]
            }
        });

        if (containerFinder.length > 0) {
            const existingContainer = docker.getContainer(containerFinder[0].Id);
            await existingContainer.remove({ force: true });
        }

        const container = await docker.createContainer(containerConfig);
        await container.start();

        return container.id;
    } catch (error) {
        throw error;
    }
}