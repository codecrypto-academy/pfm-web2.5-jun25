"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerManager = void 0;
const dockerode_1 = __importDefault(require("dockerode"));
class DockerManager {
    constructor(options) {
        this.docker = new dockerode_1.default(options);
    }
    async createNetwork(options) {
        const { name, subnet, labels = {} } = options;
        const networkOptions = {
            Name: name,
            CheckDuplicate: true,
            Driver: 'bridge',
            IPAM: {
                Driver: 'default',
                Config: [
                    {
                        Subnet: subnet
                    }
                ]
            },
            Labels: labels
        };
        try {
            const network = await this.docker.createNetwork(networkOptions);
            return network.id;
        }
        catch (error) {
            throw new Error(`Error al crear la red: ${error.message}`);
        }
    }
    async createContainer(options) {
        const { name, ip, networkName, ...containerOptions } = options;
        try {
            const container = await this.docker.createContainer({
                ...containerOptions,
                name
            });
            const containerId = container.id;
            if (networkName) {
                const network = this.docker.getNetwork(networkName);
                const networkConnectOptions = {
                    Container: containerId
                };
                if (ip) {
                    networkConnectOptions.EndpointConfig = {
                        IPAddress: ip
                    };
                }
                await network.connect(networkConnectOptions);
            }
            await container.start();
            return containerId;
        }
        catch (error) {
            throw new Error(`Error al crear el contenedor: ${error.message}`);
        }
    }
    async removeContainer(nameOrId, force = true) {
        try {
            const container = this.docker.getContainer(nameOrId);
            await container.remove({ force });
        }
        catch (error) {
            throw new Error(`Error al eliminar el contenedor: ${error.message}`);
        }
    }
    async removeContainersInNetwork(networkNameOrId) {
        try {
            const network = this.docker.getNetwork(networkNameOrId);
            const networkInfo = await network.inspect();
            const containerIds = Object.keys(networkInfo.Containers || {});
            for (const containerId of containerIds) {
                await this.removeContainer(containerId);
            }
        }
        catch (error) {
            throw new Error(`Error al eliminar los contenedores de la red: ${error.message}`);
        }
    }
    async removeNetwork(networkNameOrId, removeContainers = true) {
        try {
            if (removeContainers) {
                await this.removeContainersInNetwork(networkNameOrId);
            }
            const network = this.docker.getNetwork(networkNameOrId);
            await network.remove();
        }
        catch (error) {
            throw new Error(`Error al eliminar la red: ${error.message}`);
        }
    }
    async getNetworkInfo(networkNameOrId) {
        try {
            const network = this.docker.getNetwork(networkNameOrId);
            const info = await network.inspect();
            const containers = await Promise.all(Object.entries(info.Containers || {}).map(async ([id, container]) => {
                const containerInfo = await this.docker.getContainer(id).inspect();
                return {
                    id,
                    name: containerInfo.Name.replace(/^\//, ''),
                    ip: container.IPv4Address?.split('/')[0]
                };
            }));
            return {
                id: info.Id,
                name: info.Name,
                config: {
                    subnet: info.IPAM?.Config?.[0]?.Subnet,
                    gateway: info.IPAM?.Config?.[0]?.Gateway
                },
                containers
            };
        }
        catch (error) {
            throw new Error(`Error al obtener información de la red: ${error.message}`);
        }
    }
    async getContainerInfo(containerNameOrId) {
        try {
            const container = this.docker.getContainer(containerNameOrId);
            const info = await container.inspect();
            const networks = Object.entries(info.NetworkSettings.Networks || {}).map(([name, network]) => ({
                name,
                ip: network.IPAddress
            }));
            return {
                id: info.Id,
                name: info.Name.replace(/^\//, ''),
                state: info.State.Status,
                networks
            };
        }
        catch (error) {
            throw new Error(`Error al obtener información del contenedor: ${error.message}`);
        }
    }
}
exports.DockerManager = DockerManager;
//# sourceMappingURL=docker-manager.js.map