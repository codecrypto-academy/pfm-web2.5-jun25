import Docker from "dockerode";
import fs from "fs";
import { PROJECT_LABEL } from "../constants";
import { generateNodeIdentity } from "./generateNodeIdentity";

export interface BesuNodeConfig {
    name: string;
    network: {
        name: string;
        ip: string;
    }
    hostPort: number;
}

export async function createBesuNode(docker: Docker, nodeConfig: BesuNodeConfig): Promise<string> {

    const { address, enode, privateKey, publicKey } = generateNodeIdentity(nodeConfig.network.ip);

    const nodeIdentityPath = `${process.cwd()}/${nodeConfig.network.name}`;
    if (!fs.existsSync(`${nodeIdentityPath}/${nodeConfig.name}`)) {
        fs.mkdirSync(`${nodeIdentityPath}/${nodeConfig.name}`, { recursive: true });
    }

    fs.writeFileSync(`${nodeIdentityPath}/${nodeConfig.name}/key.priv`, privateKey);
        
    const containerConfig: Docker.ContainerCreateOptions = {
        Image: "hyperledger/besu:latest",
        name: nodeConfig.name,
        Cmd: [
            `--config-file=/data/config.toml`,
            `--data-path=${nodeIdentityPath}`,
            `--node-private-key-file=${nodeIdentityPath}/${nodeConfig.name}/key.priv`,
            `--genesis-file=/data/genesis.json`
        ],
        Labels: {
            "node": nodeConfig.name,
            "network": nodeConfig.network.name,
            "project": PROJECT_LABEL,
        },
        HostConfig: {
            PortBindings: {
                ['8545/tcp']: [{ HostPort: nodeConfig.hostPort.toString() }]
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