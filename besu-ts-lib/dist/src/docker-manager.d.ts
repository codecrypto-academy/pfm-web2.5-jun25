import Docker from 'dockerode';
import { NetworkCreateOptions, ContainerOptions, NetworkInfo, ContainerInfo } from './types';
export declare class DockerManager {
    private docker;
    constructor(options?: Docker.DockerOptions);
    createNetwork(options: NetworkCreateOptions): Promise<string>;
    createContainer(options: ContainerOptions): Promise<string>;
    removeContainer(nameOrId: string, force?: boolean): Promise<void>;
    removeContainersInNetwork(networkNameOrId: string): Promise<void>;
    removeNetwork(networkNameOrId: string, removeContainers?: boolean): Promise<void>;
    getNetworkInfo(networkNameOrId: string): Promise<NetworkInfo>;
    getContainerInfo(containerNameOrId: string): Promise<ContainerInfo>;
}
//# sourceMappingURL=docker-manager.d.ts.map