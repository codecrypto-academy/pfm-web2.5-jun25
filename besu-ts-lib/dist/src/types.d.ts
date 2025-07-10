import { ContainerCreateOptions } from 'dockerode';
export interface NetworkCreateOptions {
    name: string;
    subnet: string;
    labels?: Record<string, string>;
}
export interface ContainerOptions extends Omit<ContainerCreateOptions, 'name'> {
    name: string;
    ip?: string;
    networkName?: string;
}
export interface NetworkInfo {
    id: string;
    name: string;
    config: {
        subnet?: string;
        gateway?: string;
    };
    containers: {
        id: string;
        name: string;
        ip?: string;
    }[];
}
export interface ContainerInfo {
    id: string;
    name: string;
    state: string;
    networks: {
        name: string;
        ip?: string;
    }[];
}
//# sourceMappingURL=types.d.ts.map