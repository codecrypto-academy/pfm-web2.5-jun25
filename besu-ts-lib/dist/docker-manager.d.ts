import Docker from 'dockerode';
import { NetworkCreateOptions, ContainerOptions, NetworkInfo, ContainerInfo } from './types';
/**
 * Clase para gestionar contenedores y redes Docker
 */
export declare class DockerManager {
    private docker;
    /**
     * Constructor de la clase DockerManager
     * @param options Opciones de conexión a Docker (opcional)
     */
    constructor(options?: Docker.DockerOptions);
    /**
     * Crea una nueva red Docker
     * @param options Opciones para crear la red
     * @returns Promise con el ID de la red creada
     */
    createNetwork(options: NetworkCreateOptions): Promise<string>;
    /**
     * Crea un nuevo contenedor Docker
     * @param options Opciones para crear el contenedor
     * @returns Promise con el ID del contenedor creado
     */
    createContainer(options: ContainerOptions): Promise<string>;
    /**
     * Elimina un contenedor Docker
     * @param nameOrId Nombre o ID del contenedor a eliminar
     * @param force Si es true, fuerza la eliminación incluso si está en ejecución
     * @returns Promise que se resuelve cuando el contenedor ha sido eliminado
     */
    removeContainer(nameOrId: string, force?: boolean): Promise<void>;
    /**
     * Elimina todos los contenedores conectados a una red específica
     * @param networkNameOrId Nombre o ID de la red
     * @returns Promise que se resuelve cuando todos los contenedores han sido eliminados
     */
    removeContainersInNetwork(networkNameOrId: string): Promise<void>;
    /**
     * Elimina una red Docker y opcionalmente todos sus contenedores
     * @param networkNameOrId Nombre o ID de la red a eliminar
     * @param removeContainers Si es true, elimina todos los contenedores conectados a la red
     * @returns Promise que se resuelve cuando la red ha sido eliminada
     */
    removeNetwork(networkNameOrId: string, removeContainers?: boolean): Promise<void>;
    /**
     * Obtiene información detallada de una red Docker
     * @param networkNameOrId Nombre o ID de la red
     * @returns Promise con la información de la red
     */
    getNetworkInfo(networkNameOrId: string): Promise<NetworkInfo>;
    /**
     * Obtiene información detallada de un contenedor Docker
     * @param containerNameOrId Nombre o ID del contenedor
     * @returns Promise con la información del contenedor
     */
    getContainerInfo(containerNameOrId: string): Promise<ContainerInfo>;
}
