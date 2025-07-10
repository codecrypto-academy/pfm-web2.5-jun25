"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerManager = void 0;
const dockerode_1 = __importDefault(require("dockerode"));
/**
 * Clase para gestionar contenedores y redes Docker
 */
class DockerManager {
    /**
     * Constructor de la clase DockerManager
     * @param options Opciones de conexión a Docker (opcional)
     */
    constructor(options) {
        this.docker = new dockerode_1.default(options);
    }
    /**
     * Crea una nueva red Docker
     * @param options Opciones para crear la red
     * @returns Promise con el ID de la red creada
     */
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
    /**
     * Crea un nuevo contenedor Docker
     * @param options Opciones para crear el contenedor
     * @returns Promise con el ID del contenedor creado
     */
    async createContainer(options) {
        const { name, ip, networkName, ...containerOptions } = options;
        try {
            // Crear el contenedor
            const container = await this.docker.createContainer({
                ...containerOptions,
                name
            });
            const containerId = container.id;
            // Si se especifica una red, conectar el contenedor a ella
            if (networkName) {
                const network = this.docker.getNetwork(networkName);
                const networkConnectOptions = {
                    Container: containerId
                };
                // Si se especifica una IP, configurarla
                if (ip) {
                    networkConnectOptions.EndpointConfig = {
                        IPAddress: ip
                    };
                }
                await network.connect(networkConnectOptions);
            }
            // Iniciar el contenedor
            await container.start();
            return containerId;
        }
        catch (error) {
            throw new Error(`Error al crear el contenedor: ${error.message}`);
        }
    }
    /**
     * Elimina un contenedor Docker
     * @param nameOrId Nombre o ID del contenedor a eliminar
     * @param force Si es true, fuerza la eliminación incluso si está en ejecución
     * @returns Promise que se resuelve cuando el contenedor ha sido eliminado
     */
    async removeContainer(nameOrId, force = true) {
        try {
            const container = this.docker.getContainer(nameOrId);
            await container.remove({ force });
        }
        catch (error) {
            throw new Error(`Error al eliminar el contenedor: ${error.message}`);
        }
    }
    /**
     * Elimina todos los contenedores conectados a una red específica
     * @param networkNameOrId Nombre o ID de la red
     * @returns Promise que se resuelve cuando todos los contenedores han sido eliminados
     */
    async removeContainersInNetwork(networkNameOrId) {
        try {
            // Obtener información de la red
            const network = this.docker.getNetwork(networkNameOrId);
            const networkInfo = await network.inspect();
            // Obtener los contenedores conectados a la red
            const containerIds = Object.keys(networkInfo.Containers || {});
            // Eliminar cada contenedor
            for (const containerId of containerIds) {
                await this.removeContainer(containerId);
            }
        }
        catch (error) {
            throw new Error(`Error al eliminar los contenedores de la red: ${error.message}`);
        }
    }
    /**
     * Elimina una red Docker y opcionalmente todos sus contenedores
     * @param networkNameOrId Nombre o ID de la red a eliminar
     * @param removeContainers Si es true, elimina todos los contenedores conectados a la red
     * @returns Promise que se resuelve cuando la red ha sido eliminada
     */
    async removeNetwork(networkNameOrId, removeContainers = true) {
        try {
            // Si se solicita, eliminar primero los contenedores
            if (removeContainers) {
                await this.removeContainersInNetwork(networkNameOrId);
            }
            // Eliminar la red
            const network = this.docker.getNetwork(networkNameOrId);
            await network.remove();
        }
        catch (error) {
            throw new Error(`Error al eliminar la red: ${error.message}`);
        }
    }
    /**
     * Obtiene información detallada de una red Docker
     * @param networkNameOrId Nombre o ID de la red
     * @returns Promise con la información de la red
     */
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
    /**
     * Obtiene información detallada de un contenedor Docker
     * @param containerNameOrId Nombre o ID del contenedor
     * @returns Promise con la información del contenedor
     */
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
