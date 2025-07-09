/**
 * Core TypeScript interfaces and types for the Besu SDK
 * 
 * This module defines the fundamental data structures used throughout the SDK,
 * providing type safety and clear contracts for network configuration,
 * node management, and system state tracking.
 */

/**
 * Configuration for a Besu network using Clique (PoA) consensus
 * 
 * This interface defines all parameters needed to create and configure
 * a complete Hyperledger Besu network with multiple nodes.
 */
export interface NetworkConfig {
  /** Ethereum chain ID - must be unique to avoid conflicts with public networks */
  chainId: number;
  
  /** Block creation period in seconds for Clique consensus */
  blockPeriodSeconds: number;
  
  /** Docker network configuration for node communication */
  network: {
    /** Docker network name - used to isolate this Besu network */
    name: string;
    /** IP subnet in CIDR notation (e.g., "172.20.0.0/16") */
    subnet: string;
  };
  
  /** Array of node configurations to be created during network setup */
  nodes: NodeConfig[];
}

/**
 * Configuration for an individual Besu node
 * 
 * Each node in the network has specific settings that determine its role
 * (validator vs non-validator) and accessibility (RPC exposure).
 */
export interface NodeConfig {
  /** Unique identifier for the node within the network */
  name: string;
  
  /** Static IP address within the Docker network subnet */
  ip: string;
  
  /** Whether this node participates in block validation (Clique signer) */
  validator?: boolean;
  
  /** Whether to expose JSON-RPC interface for external interactions */
  rpc?: boolean;
  
  /** Host port to map the RPC service (default: 8545 if rpc is true) */
  rpcPort?: number;
  
  /** 
   * Optional seed to generate a deterministic identity for this node.
   * If provided, the node will always have the same address and keys.
   * WARNING: For testing and development purposes only.
   */
  identitySeed?: string;
  
  /**
   * The initial balance of the node in the genesis block, specified in Ether.
   * If not provided, a default large balance will be allocated.
   * Example: "100.5" for 100.5 ETH.
   */
  initialBalance?: string;
}

/**
 * Options for dynamically adding a node to a running network
 * 
 * Similar to NodeConfig but used for runtime node creation,
 * allowing the network to grow after initial setup.
 */
export interface NodeOptions {
  /** Unique identifier for the new node */
  name: string;
  
  /** IP address - must be within network subnet and not already in use */
  ip: string;
  
  /** Enable JSON-RPC interface */
  rpc?: boolean;
  
  /** Host port for RPC mapping */
  rpcPort?: number;
  
  /** Whether to add as a validator (requires consensus from existing validators) */
  validator?: boolean;
  
  /**
   * The initial balance to fund the new node with, specified in Ether.
   * This is funded via a transaction from an existing validator.
   * Requires an RPC node to be available in the network.
   */
  initialBalance?: string;
}

/**
 * Cryptographic identity for a Besu node
 * 
 * Each node requires a unique identity consisting of an Ethereum address
 * and corresponding key pair for signing blocks and transactions.
 */
export interface NodeIdentity {
  /** Ethereum address derived from the public key (with 0x prefix) */
  address: string;
  
  /** Public key in hex format (with 0x prefix) */
  publicKey: string;
  
  /** Private key in hex format (with 0x prefix) - must be kept secure */
  privateKey: string;
}

/**
 * Network lifecycle states
 * 
 * The network follows a strict state machine to ensure operations
 * are only performed when valid, preventing inconsistent states.
 */
export enum NetworkStatus {
  /** Initial state - configuration loaded but resources not created */
  UNINITIALIZED = 'UNINITIALIZED',
  
  /** Transitional state - Docker resources being created */
  INITIALIZING = 'INITIALIZING',
  
  /** Operational state - all nodes running and network accessible */
  RUNNING = 'RUNNING',
  
  /** Transitional state - shutting down nodes and cleaning resources */
  STOPPING = 'STOPPING',
  
  /** Terminal state - all resources released */
  STOPPED = 'STOPPED',
  
  /** Error state - unexpected failure, manual cleanup may be needed */
  ERROR = 'ERROR'
}

/**
 * Individual node lifecycle states
 * 
 * Each node has its own state machine that coordinates with the
 * network-level state to ensure consistent behavior.
 */
export enum NodeStatus {
  /** Node configuration and files created, container not yet started */
  CREATED = 'CREATED',
  
  /** Docker container being created and started */
  STARTING = 'STARTING',
  
  /** Container running and node operational */
  RUNNING = 'RUNNING',
  
  /** Container being stopped */
  STOPPING = 'STOPPING',
  
  /** Container stopped but not removed */
  STOPPED = 'STOPPED',
  
  /** Unexpected error state */
  ERROR = 'ERROR'
}

/**
 * Event payloads for network lifecycle events
 * 
 * These interfaces define the data emitted by the Network class
 * during various lifecycle transitions and operational events.
 */

/** Emitted when network status changes */
export interface NetworkStatusChangeEvent {
  from: NetworkStatus;
  to: NetworkStatus;
  timestamp: Date;
}

/** Emitted when a node is successfully added to the network */
export interface NodeAddedEvent {
  node: {
    name: string;
    address: string;
    isValidator: boolean;
  };
  timestamp: Date;
}

/** Emitted when a new block is mined on the network */
export interface NewBlockEvent {
  number: number;
  miner: string;
  timestamp: number;
  gasUsed: string;
  transactionCount: number;
}

/** Emitted when a node status changes */
export interface NodeStatusChangeEvent {
  nodeName: string;
  from: NodeStatus;
  to: NodeStatus;
  timestamp: Date;
}

/**
 * Docker container configuration options
 * 
 * Subset of Docker's ContainerCreateOptions focused on
 * parameters relevant for Besu node containers.
 */
export interface ContainerOptions {
  name: string;
  image: string;
  env: string[];
  volumes: string[];
  networkMode: string;
  networks: {
    [networkName: string]: {
      ipv4Address: string;
    };
  };
  ports?: {
    [containerPort: string]: {
      hostPort: number;
    };
  };
}

/**
 * Metadata about a running network
 * 
 * Persisted information that allows SDK to reconnect to
 * or manage previously created networks.
 */
export interface NetworkMetadata {
  name: string;
  chainId: number;
  createdAt: string;
  dockerNetworkId: string;
  dataDirectory: string;
  nodes: {
    [nodeName: string]: {
      containerId: string;
      address: string;
      ip: string;
      isValidator: boolean;
    };
  };
}