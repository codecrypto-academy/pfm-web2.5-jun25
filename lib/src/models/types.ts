/**
 * Definición de tipos e interfaces para la biblioteca de gestión de redes Besu
 */

/**
 * Configuración para un nodo Besu
 */
export interface BesuNodeConfig {
  /** Nombre del nodo */
  name: string;
  /** Puerto RPC HTTP */
  rpcPort: number;
  /** Puerto P2P */
  p2pPort: number;
  /** Directorio de datos */
  dataDir: string;
  /** Si el nodo es validador */
  isValidator: boolean;
  /** Dirección del validador (si aplica) */
  validatorAddress?: string;
  /** Clave privada (si aplica) */
  privateKey?: string;
  /** APIs habilitadas */
  enabledApis: string[];
  /** Opciones adicionales para el nodo */
  additionalOptions?: Record<string, string>;
}

/**
 * Configuración para una red Besu
 */
export interface BesuNetworkConfig {
  /** Nombre de la red */
  name: string;
  /** ID de la cadena */
  chainId: number;
  /** Protocolo de consenso */
  consensusProtocol: 'clique' | 'ibft2' | 'qbft';
  /** Tiempo de bloque en segundos */
  blockPeriod: number;
  /** Número de nodos */
  nodeCount: number;
  /** Puerto RPC base */
  baseRpcPort: number;
  /** Puerto P2P base */
  baseP2pPort: number;
  /** Directorio de datos */
  dataDir: string;
  /** Configuración de nodos */
  nodes?: BesuNodeConfig[];
  /** Opciones adicionales para la red */
  additionalOptions?: Record<string, string>;
}

/**
 * Estado de un nodo Besu
 */
export interface BesuNodeStatus {
  /** ID del contenedor */
  containerId: string;
  /** Nombre del nodo */
  name: string;
  /** Estado del contenedor */
  containerStatus: 'running' | 'stopped' | 'exited' | 'unknown';
  /** Número de bloque actual */
  blockNumber?: number;
  /** Número de peers conectados */
  peerCount?: number;
  /** Dirección enode */
  enodeUrl?: string;
  /** Dirección IP */
  ipAddress?: string;
  /** Puertos mapeados */
  ports: {
    rpc: number;
    p2p: number;
  };
}

/**
 * Estado de una red Besu
 */
export interface BesuNetworkStatus {
  /** Nombre de la red */
  name: string;
  /** ID de la red Docker */
  networkId: string;
  /** Estado de los nodos */
  nodes: BesuNodeStatus[];
  /** Tiempo de actividad */
  uptime: number;
  /** Último bloque */
  lastBlock?: number;
}

/**
 * Opciones para la creación de una transacción
 */
export interface TransactionOptions {
  /** Dirección de origen */
  from: string;
  /** Dirección de destino */
  to: string;
  /** Valor en wei */
  value: string;
  /** Datos de la transacción */
  data?: string;
  /** Límite de gas */
  gasLimit?: string;
  /** Precio del gas */
  gasPrice?: string;
  /** Nonce */
  nonce?: number;
}

/**
 * Resultado de una transacción
 */
export interface TransactionResult {
  /** Hash de la transacción */
  hash: string;
  /** Número de bloque */
  blockNumber?: number;
  /** Hash del bloque */
  blockHash?: string;
  /** Índice de la transacción */
  transactionIndex?: number;
  /** Dirección de origen */
  from: string;
  /** Dirección de destino */
  to: string;
  /** Valor */
  value: string;
  /** Gas usado */
  gasUsed?: string;
  /** Estado (1 = éxito, 0 = fallo) */
  status?: number;
}

/**
 * Opciones para la creación de un bloque génesis
 */
export interface GenesisOptions {
  /** ID de la cadena */
  chainId: number;
  /** Protocolo de consenso */
  consensusProtocol: 'clique' | 'ibft2' | 'qbft';
  /** Tiempo de bloque en segundos */
  blockPeriod: number;
  /** Direcciones de los validadores */
  validatorAddresses: string[];
  /** Cuentas pre-financiadas */
  alloc?: Record<string, { balance: string }>;
  /** Opciones adicionales */
  additionalOptions?: Record<string, any>;
}

/**
 * Opciones para la configuración de Docker
 */
export interface DockerOptions {
  /** Imagen de Besu */
  besuImage: string;
  /** Socket de Docker */
  socketPath?: string;
  /** Host de Docker */
  host?: string;
  /** Puerto de Docker */
  port?: number;
  /** Opciones adicionales */
  additionalOptions?: Record<string, any>;
}