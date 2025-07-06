import Docker from "dockerode";
import { PROJECT_LABEL } from "../constants";

export interface BesuNodeConfig {
    name: string;
    network: string;
    ip: string;
    image: string;
    hostPort: number;
    containerPort: number;
    dataPath: string;
    configFile: string;
    privateKeyFile: string;
    genesisFile: string;
    labels?: Record<string, string>;
}

export async function createNode(docker: Docker, nodeConfig: BesuNodeConfig): Promise<string> {

    const containerConfig: Docker.ContainerCreateOptions = {
        Image: nodeConfig.image,
        name: nodeConfig.name,
        Cmd: [
            `--config-file=${nodeConfig.configFile}`,
            `--data-path=${nodeConfig.dataPath}`,
            `--node-private-key-file=${nodeConfig.privateKeyFile}`,
            `--genesis-file=${nodeConfig.genesisFile}`
        ],
        Labels: {
            ...nodeConfig.labels,
            "project": PROJECT_LABEL,
        },
        HostConfig: {
            PortBindings: {
                [`${nodeConfig.containerPort}/tcp`]: [{ HostPort: nodeConfig.hostPort.toString() }]
            },
            Binds: [`${nodeConfig.dataPath}:/data`]
        },
        NetworkingConfig: {
            EndpointsConfig: {
                [nodeConfig.network]: {
                    IPAMConfig: {
                        IPv4Address: nodeConfig.ip
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
            return containerFinder[0].Id;
        }


        const container = await docker.createContainer(containerConfig);
        await container.start();

        return container.id;
    } catch (error) {
        throw error;
    }
}