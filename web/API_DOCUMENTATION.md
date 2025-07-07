# 📚 Besu Network Management API - Complete Documentation

## 🎯 Overview

This API provides comprehensive management of Hyperledger Besu blockchain networks through RESTful endpoints. All endpoints support dynamic parameterization with intelligent defaults.

## 🏗️ API Architecture

```
/api/networks/
├── GET     /                      - List all networks
├── POST    /                      - Create new network
├── GET     /{networkId}           - Get network details
├── DELETE  /{networkId}           - Delete network
├── GET     /{networkId}/status    - Get network status
├── GET     /{networkId}/nodes     - List network nodes
├── POST    /{networkId}/nodes     - Add node to network
├── GET     /{networkId}/nodes/{nodeId}  - Get node details
└── DELETE  /{networkId}/nodes/{nodeId}  - Remove node
```

## 📝 API Endpoints Documentation

### 1. Networks Management

#### `GET /api/networks`
**Description:** List all existing networks with metadata

**Request Parameters:**
- `limit` (query, optional): Maximum networks to return (1-100, default: 10)
- `offset` (query, optional): Pagination offset (default: 0)
- `status` (query, optional): Filter by status ('running', 'stopped', 'error')

**Response:**
```typescript
{
  success: boolean;
  networks: Array<{
    networkId: string;           // e.g., "my-network"
    chainId: number;            // e.g., 1337
    subnet: string;             // e.g., "172.20.0.0/24"
    nodesCount: number;         // e.g., 3
    createdAt: string;          // ISO 8601 timestamp
    updatedAt: string;          // ISO 8601 timestamp
  }>;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}
```

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/networks?limit=20&status=running"
```

#### `POST /api/networks`
**Description:** Create a new Besu network with configurable parameters

**Request Body:**
```typescript
{
  networkId: string;              // Required: Unique network ID (3-50 chars)
  chainId: number;                // Required: Blockchain chain ID (1-2147483647)
  nodeCount?: number;             // Optional: Number of nodes (1-20, default: 2)
  subnet?: string;                // Optional: CIDR subnet (default: "172.20.0.0/24")
  gateway?: string;               // Optional: Gateway IP (default: "172.20.0.1")
  baseRpcPort?: number;           // Optional: Starting RPC port (default: 8545)
  baseP2pPort?: number;           // Optional: Starting P2P port (default: 30303)
  bootnodeCount?: number;         // Optional: Number of bootnodes (default: 1)
  minerCount?: number;            // Optional: Number of miners (default: remaining nodes)
  besuImage?: string;             // Optional: Docker image (default: "hyperledger/besu:latest")
  memoryLimit?: string;           // Optional: Memory per container (default: "2g")
  cpuLimit?: string;              // Optional: CPU limit per container (default: "1.0")
  labels?: Record<string, string>; // Optional: Custom Docker labels
  env?: Record<string, string>;    // Optional: Environment variables
}
```

**Response:**
```typescript
{
  success: boolean;
  network: {
    networkId: string;
    chainId: number;
    dockerNetworkId: string;        // Docker network identifier
    subnet: string;
    gateway: string;
    containersCreated: number;
    nodes: Array<{
      id: string;                   // e.g., "node-0"
      type: "bootnode" | "miner" | "rpc";
      ip: string;                   // e.g., "172.20.0.10"
      rpcPort: number;              // e.g., 8545
      p2pPort: number;              // e.g., 30303
      address: string;              // Ethereum address
    }>;
  };
  error?: string;
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/networks \
  -H "Content-Type: application/json" \
  -d '{
    "networkId": "production-network",
    "chainId": 12345,
    "nodeCount": 4,
    "subnet": "192.168.100.0/24",
    "gateway": "192.168.100.1",
    "baseRpcPort": 9000,
    "baseP2pPort": 31000,
    "bootnodeCount": 1,
    "minerCount": 2,
    "memoryLimit": "4g",
    "cpuLimit": "2.0"
  }'
```

#### `GET /api/networks/{networkId}`
**Description:** Get detailed information about a specific network

**Path Parameters:**
- `networkId` (string): Network identifier

**Response:**
```typescript
{
  success: boolean;
  network: {
    networkId: string;
    chainId: number;
    subnet: string;
    gateway: string;
    dockerNetworkId: string;
    createdAt: string;
    updatedAt: string;
    nodes: Array<{
      id: string;
      type: "bootnode" | "miner" | "rpc";
      ip: string;
      rpcPort: number;
      p2pPort: number;
      address: string;
      enode: string;                // Ethereum node URL
    }>;
    containers: Array<{
      id: string;                   // Docker container ID
      name: string;                 // Container name
      state: string;                // running, stopped, etc.
      status: string;               // Detailed status
    }>;
  };
}
```

#### `DELETE /api/networks/{networkId}`
**Description:** Delete a network and clean up all resources

**Path Parameters:**
- `networkId` (string): Network identifier

**Response:**
```typescript
{
  success: boolean;
  cleanup: {
    networkId: string;
    containersRemoved: number;      // Number of containers deleted
    dockerNetworkRemoved: boolean;
    filesCleanedUp: boolean;
  };
}
```

### 2. Node Management

#### `GET /api/networks/{networkId}/nodes`
**Description:** List all nodes in a network with their status

**Path Parameters:**
- `networkId` (string): Network identifier

**Response:**
```typescript
{
  success: boolean;
  networkId: string;
  nodes: Array<{
    id: string;
    type: "bootnode" | "miner" | "rpc";
    ip: string;
    rpcPort: number;
    p2pPort: number;
    address: string;
    enode: string;
    containerStatus: {
      containerId: string;
      state: string;
      status: string;
    } | null;
  }>;
}
```

#### `POST /api/networks/{networkId}/nodes`
**Description:** Add a new node to an existing network

**Path Parameters:**
- `networkId` (string): Network identifier

**Request Body:**
```typescript
{
  type: "miner" | "rpc";          // Required: Node type (bootnode not allowed via this endpoint)
  ip?: string;                    // Optional: Custom IP (auto-assigned if not provided)
  rpcPort?: number;               // Optional: Custom RPC port (auto-assigned if not provided)
  p2pPort?: number;               // Optional: Custom P2P port (auto-assigned if not provided)
  ipOffset?: number;              // Optional: IP offset for auto-assignment (default: 10)
  portStrategy?: "sequential" | "random"; // Optional: Port assignment strategy
  nodeIdPrefix?: string;          // Optional: Custom node ID prefix
  memoryLimit?: string;           // Optional: Memory limit for container
  cpuLimit?: string;              // Optional: CPU limit for container
  labels?: Record<string, string>; // Optional: Custom Docker labels
  env?: Record<string, string>;    // Optional: Environment variables
}
```

**Response:**
```typescript
{
  success: boolean;
  node: {
    id: string;                     // e.g., "node-1672531200000"
    type: "miner" | "rpc";
    ip: string;
    rpcPort: number;
    p2pPort: number;
    address: string;                // Ethereum address
    enode: string;                  // Ethereum node URL
    containerId: string;            // Docker container ID
    containerName: string;          // Docker container name
  };
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/networks/production-network/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "type": "miner",
    "rpcPort": 9500,
    "p2pPort": 31500,
    "memoryLimit": "3g",
    "nodeIdPrefix": "prod"
  }'
```

#### `GET /api/networks/{networkId}/nodes/{nodeId}`
**Description:** Get detailed information about a specific node

**Path Parameters:**
- `networkId` (string): Network identifier
- `nodeId` (string): Node identifier

**Response:**
```typescript
{
  success: boolean;
  node: {
    id: string;
    type: "bootnode" | "miner" | "rpc";
    ip: string;
    rpcPort: number;
    p2pPort: number;
    address: string;
    enode: string;
    bootnodes: string[];            // Connected bootnode URLs
    files: {
      hasKeyFile: boolean;          // Private key file exists
      hasAddressFile: boolean;      // Address file exists
      hasEnodeFile: boolean;        // Enode file exists
    };
    container: {
      containerId: string;
      names: string[];
      state: string;
      status: string;
      ports: Array<{
        IP?: string;
        PrivatePort: number;
        PublicPort?: number;
        Type: string;
      }>;
    } | null;
  };
}
```

#### `DELETE /api/networks/{networkId}/nodes/{nodeId}`
**Description:** Remove a node from the network

**Path Parameters:**
- `networkId` (string): Network identifier
- `nodeId` (string): Node identifier

**Response:**
```typescript
{
  success: boolean;
  removed: {
    nodeId: string;
    containerRemoved: boolean;
    filesRemoved: boolean;
    metadataUpdated: boolean;
  };
}
```

**Note:** Cannot remove the last bootnode in a network.

### 3. Network Status

#### `GET /api/networks/{networkId}/status`
**Description:** Get real-time status of network and all nodes

**Path Parameters:**
- `networkId` (string): Network identifier

**Response:**
```typescript
{
  success: boolean;
  status: {
    networkId: string;
    overallStatus: "running" | "stopped" | "partial" | "error";
    totalNodes: number;
    runningNodes: number;
    stoppedNodes: number;
    errorNodes: number;
    nodes: Array<{
      id: string;
      type: string;
      status: "running" | "stopped" | "error" | "restarting" | "paused";
      ip: string;
      rpcPort: number;
      p2pPort: number;
      containerInfo: {
        containerId: string;
        state: string;
        status: string;
        created: number;              // Unix timestamp
      } | null;
    }>;
  };
}
```

## 🔧 Configuration Parameters

### Default Values
All endpoints use configurable defaults that can be overridden:

```typescript
// Network defaults
NETWORK_DEFAULTS = {
  NODE_COUNT: 2,
  SUBNET: '172.20.0.0/24',
  GATEWAY: '172.20.0.1',
  BOOTNODE_COUNT: 1,
  MAX_NODES_PER_NETWORK: 20
}

// Port defaults
PORT_DEFAULTS = {
  BASE_RPC_PORT: 8545,
  BASE_P2P_PORT: 30303,
  MIN_PORT: 1024,
  MAX_PORT: 65535
}

// Docker defaults
DOCKER_DEFAULTS = {
  BESU_IMAGE: 'hyperledger/besu:latest',
  MEMORY_LIMIT: '2g',
  CPU_LIMIT: '1.0'
}
```

### Smart Auto-Assignment
When parameters are not provided, the API intelligently assigns values:

- **IP Addresses**: Sequential assignment within the subnet starting at offset 10
- **Ports**: Sequential assignment starting from base ports, avoiding conflicts
- **Node IDs**: Timestamp-based unique identifiers
- **Types**: Balanced distribution of bootnode, miner, and RPC nodes

## 🛡️ Error Handling

### HTTP Status Codes
- `200` - Success
- `400` - Bad Request (validation errors)
- `404` - Not Found (network/node doesn't exist)
- `409` - Conflict (duplicate network ID, port conflicts)
- `500` - Internal Server Error

### Error Response Format
```typescript
{
  success: false;
  error: string;                    // Human-readable error message
  details?: string[];               // Detailed validation errors
  code?: string;                    // Machine-readable error code
}
```

### Common Errors
- `NETWORK_EXISTS` - Network ID already in use
- `PORT_CONFLICT` - Requested ports already in use
- `DOCKER_UNAVAILABLE` - Docker daemon not accessible
- `INVALID_SUBNET` - Malformed subnet CIDR
- `NODE_NOT_FOUND` - Specified node doesn't exist
- `LAST_BOOTNODE` - Cannot remove the last bootnode

## 🚀 Usage Examples

### Complete Network Setup
```bash
# 1. Create network
curl -X POST http://localhost:3000/api/networks \
  -H "Content-Type: application/json" \
  -d '{
    "networkId": "dev-network",
    "chainId": 1337,
    "nodeCount": 3,
    "subnet": "172.25.0.0/24"
  }'

# 2. Check status
curl http://localhost:3000/api/networks/dev-network/status

# 3. Add additional node
curl -X POST http://localhost:3000/api/networks/dev-network/nodes \
  -H "Content-Type: application/json" \
  -d '{"type": "rpc"}'

# 4. List all nodes
curl http://localhost:3000/api/networks/dev-network/nodes

# 5. Cleanup
curl -X DELETE http://localhost:3000/api/networks/dev-network
```

### Production Network with Custom Configuration
```bash
curl -X POST http://localhost:3000/api/networks \
  -H "Content-Type: application/json" \
  -d '{
    "networkId": "production-mainnet",
    "chainId": 8881,
    "nodeCount": 6,
    "subnet": "10.0.100.0/24",
    "gateway": "10.0.100.1",
    "baseRpcPort": 8545,
    "baseP2pPort": 30303,
    "bootnodeCount": 2,
    "minerCount": 3,
    "memoryLimit": "8g",
    "cpuLimit": "4.0",
    "besuImage": "hyperledger/besu:23.10.2",
    "labels": {
      "environment": "production",
      "team": "blockchain",
      "project": "defi-platform"
    }
  }'
```

## 🔄 Migration from Hardcoded Values

For frontend applications consuming this API, here are the recommended parameter mappings:

### Before (Hardcoded)
```javascript
// Old hardcoded approach
const networkConfig = {
  chainId: 1337,
  ports: [8545, 8546, 8547],
  ips: ["172.20.0.10", "172.20.0.11", "172.20.0.12"]
};
```

### After (Parameterized)
```javascript
// New parameterized approach
const createNetwork = async (config) => {
  const response = await fetch('/api/networks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      networkId: config.networkId,
      chainId: config.chainId,
      nodeCount: config.nodeCount,
      subnet: config.subnet || "172.20.0.0/24",
      baseRpcPort: config.baseRpcPort || 8545,
      baseP2pPort: config.baseP2pPort || 30303,
      ...config.advanced
    })
  });
  return response.json();
};
```

---

This documentation provides a complete reference for frontend developers to integrate with the Besu Network Management API while leveraging all parameterization capabilities and avoiding hardcoded values.
