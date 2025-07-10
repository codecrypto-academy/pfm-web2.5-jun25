import { DockerManager } from './docker-manager';
export interface BesuNodeConfig {
    name: string;
    ip: string;
    port?: number;
    isBootnode?: boolean;
    isMiner?: boolean;
    isRpc?: boolean;
}
export interface BesuNetworkConfig {
    networkName: string;
    subnet: string;
    dataPath: string;
}
export declare class BesuDeployer extends DockerManager {
    private networkConfig;
    constructor(networkConfig: BesuNetworkConfig);
    /**
     * Despliega una red completa de Besu
     */
    deployBesuNetwork(nodes: BesuNodeConfig[]): Promise<void>;
    /**
     * Limpia datos anteriores de Besu
     */
    private cleanupPreviousData;
    /**
     * Elimina un directorio de forma recursiva
     */
    private removeDirectoryRecursive;
    /**
     * Asegura que el directorio de datos existe
     */
    private ensureDataDirectory;
    /**
     * Crea archivos de configuración básicos para Besu
     */
    private createConfigFiles;
    /**
     * Crea directorios y archivos básicos para cada nodo
     */
    private createNodeDirectories;
    /**
     * Actualiza la configuración con el enode del bootnode
     */
    private updateConfigWithBootnode;
    /**
     * Actualiza el genesis.json con las direcciones de los validadores
     */
    private updateGenesisWithValidators;
    /**
     * Crea la red Docker para Besu
     */
    private createBesuNetwork;
    /**
     * Despliega un nodo Besu individual
     */
    private deployBesuNode;
    /**
     * Construye las opciones del contenedor para un nodo Besu
     */
    private buildBesuContainerOptions;
    /**
     * Construye el comando para ejecutar Besu
     */
    private buildBesuCommand;
    /**
     * Limpia la red existente
     */
    private cleanupNetwork;
    /**
     * Obtiene el tipo de nodo para labels
     */
    private getNodeType;
    /**
     * Espera un tiempo determinado
     */
    private sleep;
    /**
     * Obtiene información de todos los nodos de la red
     */
    getNetworkStatus(): Promise<any>;
    /**
     * Obtiene los logs de un contenedor específico (útil para debugging)
     */
    getNodeLogs(nodeName: string): Promise<string>;
}
