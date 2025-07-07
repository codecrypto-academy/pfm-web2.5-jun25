import Docker from "dockerode";
import { PROJECT_LABEL } from "../constants";
import { BesuNodeConfig, NodeIdentityFiles } from "../types";

export async function createBesuNode(docker: Docker, nodeConfig: BesuNodeConfig, nodeIdentityFiles: NodeIdentityFiles): Promise<string> {

    const nodeIdentityPath = `${process.cwd()}/${nodeConfig.network.name}`;

    const containerConfig: Docker.ContainerCreateOptions = {
        Image: "hyperledger/besu:latest",
        name: nodeConfig.name,
        Cmd: [
            `--config-file=/data/config.toml`,
            `--data-path=${nodeIdentityPath}`,
            `--node-private-key-file=${nodeIdentityFiles.privateKeyFile}`,
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