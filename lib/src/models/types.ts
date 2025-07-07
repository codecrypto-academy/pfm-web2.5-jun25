/**
 * Definición de tipos e interfaces para la biblioteca de gestión de redes Besu
 */

/**
 * Tipos de nodos Besu según el Nivel 2
 */
export enum BesuNodeType {
  /** Nodo Firmador (Signer): Validador en red Clique PoA */
  SIGNER = 'signer',
  /** Nodo Minero (Miner): Procesa transacciones sin validar */
  MINER = 'miner',
  /** Nodo Normal: Solo sincronización y consultas */
  NORMAL = 'normal'
}

/**
 * Configuración para un nodo Besu
 */
export interface BesuNodeConfig {
  /** Nombre del nodo */
  name: string;
  /** Tipo de nodo */
  nodeType: BesuNodeType;
  /** Puerto RPC HTTP */
  rpcPort: number;
  /** Puerto P2P */
  p2pPort: number;
  /** Directorio de datos */
  dataDir: string;
  /** Dirección del validador (requerida para SIGNER) */
  validatorAddress?: string;
  /** Clave privada (requerida para SIGNER y MINER) */
  privateKey?: string;
  /** APIs habilitadas */
  enabledApis: string[];
  /** Opciones adicionales para el nodo */
  additionalOptions?: Record<string, string>;
  /** Indica si el nodo es un validador */
  isValidator?: boolean;
  /** Indica si el nodo es un bootnode */
  isBootnode?: boolean;
  /** Nodo al que está vinculado (para conexiones específicas) */
  linkedTo?: string;
}

/**
 * Configuración para la creación de un nodo
 */
export interface NodeCreationConfig {
  /** Nombre del nodo */
  name: string;
  /** Tipo de nodo */
  nodeType: BesuNodeType;
  /** Indica si el nodo es un validador */
  isValidator?: boolean;
  /** Indica si el nodo es un bootnode */
  isBootnode?: boolean;
  /** Nodo al que está vinculado (para conexiones específicas) */
  linkedTo?: string;
  /** Puerto RPC personalizado (opcional) */
  rpcPort?: number;
  /** Puerto P2P personalizado (opcional) */
  p2pPort?: number;
  /** Opciones adicionales para el nodo */
  additionalOptions?: Record<string, string>;
}

// BesuNetworkConfig eliminado - solo se usaba en ejemplos

// BesuNodeStatus y BesuNetworkStatus eliminados - no se usan en la aplicación

// TransactionOptions y TransactionResult eliminados - solo se usaban en TransactionService

// GenesisOptions y DockerOptions eliminados - se usan internamente pero no se exportan