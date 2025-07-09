import { ContainerCreateOptions } from 'dockerode';

/**
 * Opciones para crear una red Docker
 */
export interface NetworkCreateOptions {
  /** Nombre de la red */
  name: string;
  /** Subred en formato CIDR (ej. "172.20.0.0/16") */
  subnet: string;
  /** Etiquetas para la red */
  labels?: Record<string, string>;
}

/**
 * Opciones para crear un contenedor Docker
 */
export interface ContainerOptions extends Omit<ContainerCreateOptions, 'name'> {
  /** Nombre del contenedor */
  name: string;
  /** Dirección IP específica para el contenedor (opcional) */
  ip?: string;
  /** Nombre de la red a la que conectar el contenedor */
  networkName?: string;
}

/**
 * Información de una red Docker
 */
export interface NetworkInfo {
  /** ID de la red */
  id: string;
  /** Nombre de la red */
  name: string;
  /** Configuración de la red */
  config: {
    subnet?: string;
    gateway?: string;
  };
  /** Contenedores conectados a la red */
  containers: {
    id: string;
    name: string;
    ip?: string;
  }[];
}

/**
 * Información de un contenedor Docker
 */
export interface ContainerInfo {
  /** ID del contenedor */
  id: string;
  /** Nombre del contenedor */
  name: string;
  /** Estado del contenedor */
  state: string;
  /** Redes a las que está conectado el contenedor */
  networks: {
    name: string;
    ip?: string;
  }[];
} 

// @audit nuevas interfaces para Besu
// ====== EXTENSIONES ESPECÍFICAS PARA BESU ======

/**
 * Tipos de nodos Besu que podemos crear
 */
export type BesuNodeType = 'signer' | 'rpc' | 'observer';

/**
 * Configuración específica para un nodo Besu
 */
export interface BesuNodeConfig {
  /** Nombre del nodo */
  name: string;
  /** Tipo de nodo */
  type: BesuNodeType;
  /** Puerto RPC (opcional, se asigna automáticamente si no se especifica) */
  rpcPort?: number;
  /** Puerto P2P (opcional, se asigna automáticamente si no se especifica) */
  p2pPort?: number;
  /** IP específica en la red Docker (opcional) */
  ip?: string;
  /** APIs RPC a habilitar (por defecto: ETH,NET,WEB3) */
  rpcApis?: string[];
  /** Si es un nodo firmante, dirección coinbase requerida */
  coinbaseAddress?: string;
}

/**
 * Configuración para crear una red Besu
 */
export interface BesuNetworkConfig {
  /** Nombre de la red */
  networkName: string;
  /** ID de la blockchain (chain ID) */
  chainId: number;
  /** Subred Docker (ej: "172.20.0.0/16") */
  subnet: string;
  /** Lista de direcciones de validadores iniciales para Clique */
  initialValidators: string[];
  /** Cuentas con balance inicial en el genesis */
  genesisAccounts?: { [address: string]: string };
}

/**
 * Estado de un nodo Besu en la red
 */
export interface BesuNodeStatus {
  /** ID del contenedor Docker */
  containerId: string;
  /** Configuración del nodo */
  config: BesuNodeConfig;
  /** Estado del contenedor */
  status: 'running' | 'stopped' | 'error';
  /** URL RPC si está disponible */
  rpcUrl?: string;
  /** Información adicional del contenedor */
  containerInfo: ContainerInfo;
}

/**
 * Estado completo de una red Besu
 */
export interface BesuNetworkStatus {
  /** Configuración de la red */
  config: BesuNetworkConfig;
  /** Información de la red Docker */
  networkInfo: NetworkInfo;
  /** Lista de nodos en la red */
  nodes: BesuNodeStatus[];
  /** Si la red está operativa */
  isOperational: boolean;
}