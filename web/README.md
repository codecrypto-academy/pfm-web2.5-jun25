# Besu Network Management API

A Next.js-based REST API for managing Hyperledger Besu networks using the `besu-network-manager` SDK. This API provides complete network and node lifecycle management through HTTP endpoints.

## Features

- **Network Management**: Create, list, view, and delete Besu networks
- **Node Management**: Add, list, view, and remove nodes from networks
- **Dynamic Configuration**: User-controlled ports, subnets, chain IDs, and node types
- **Docker Integration**: Automatic container and network management
- **File-based Storage**: JSON-based network state persistence (ready for DB migration)
- **Error Handling**: Comprehensive validation and conflict detection
- **RESTful Design**: Clean, predictable API endpoints

## Prerequisites

- Node.js 16+
- Docker daemon running
- `besu-network-manager` SDK installed
- `jq` (for testing scripts)

## Installation

```bash
# Install dependencies
yarn install

# Build the project
yarn build

# Start development server
yarn dev
```

The API will be available at `http://localhost:3000`.

## API Endpoints

### Networks

#### `GET /api/networks`
List all networks.

**Response:**
```json
{
  "success": true,
  "networks": [
    {
      "networkId": "my-network",
      "chainId": 1337,
      "subnet": "172.20.0.0/24",
      "nodesCount": 3,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

#### `POST /api/networks`
Create a new network.

**Request Body:**
```json
{
  "networkId": "my-network",
  "chainId": 1337,
  "nodeCount": 3,
  "subnet": "172.20.0.0/24",
  "gateway": "172.20.0.1",
  "baseRpcPort": 8545,
  "baseP2pPort": 30303,
  "bootnodeCount": 1,
  "minerCount": 2
}
```

**Response:**
```json
{
  "success": true,
  "network": {
    "networkId": "my-network",
    "chainId": 1337,
    "dockerNetworkId": "docker-network-id",
    "subnet": "172.20.0.0/24",
    "gateway": "172.20.0.1",
    "containersCreated": 3,
    "nodes": [
      {
        "id": "node-0",
        "type": "bootnode",
        "ip": "172.20.0.10",
        "rpcPort": 8545,
        "p2pPort": 30303,
        "address": "0x..."
      }
    ]
  }
}
```

#### `GET /api/networks/[id]`
Get network details.

**Response:**
```json
{
  "success": true,
  "network": {
    "networkId": "my-network",
    "chainId": 1337,
    "subnet": "172.20.0.0/24",
    "gateway": "172.20.0.1",
    "dockerNetworkId": "docker-network-id",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z",
    "nodes": [...],
    "containers": [
      {
        "id": "container-id",
        "name": "/besu-my-network-node-0",
        "state": "running",
        "status": "Up 5 minutes"
      }
    ]
  }
}
```

#### `DELETE /api/networks/[id]`
Delete a network and all its nodes.

**Response:**
```json
{
  "success": true
}
```

### Nodes

#### `GET /api/networks/[id]/nodes`
List all nodes in a network.

**Response:**
```json
{
  "success": true,
  "networkId": "my-network",
  "nodes": [
    {
      "id": "node-0",
      "type": "bootnode",
      "ip": "172.20.0.10",
      "rpcPort": 8545,
      "p2pPort": 30303,
      "address": "0x...",
      "enode": "enode://...",
      "containerStatus": {
        "containerId": "container-id",
        "state": "running",
        "status": "Up 5 minutes"
      }
    }
  ]
}
```

#### `POST /api/networks/[id]/nodes`
Add a new node to a network.

**Request Body:**
```json
{
  "type": "miner",
  "ip": "172.20.0.15",
  "rpcPort": 8548,
  "p2pPort": 30306
}
```

**Note:** All fields except `type` are optional. If not provided:
- `ip` will be auto-assigned from the network subnet
- `rpcPort` and `p2pPort` will be auto-assigned to avoid conflicts

**Response:**
```json
{
  "success": true,
  "node": {
    "id": "node-1234567890",
    "type": "miner",
    "ip": "172.20.0.15",
    "rpcPort": 8548,
    "p2pPort": 30306,
    "address": "0x...",
    "enode": "enode://...",
    "containerId": "container-id",
    "containerName": "besu-my-network-node-1234567890"
  }
}
```

#### `GET /api/networks/[id]/nodes/[nodeId]`
Get specific node details.

**Response:**
```json
{
  "success": true,
  "node": {
    "id": "node-0",
    "type": "bootnode",
    "ip": "172.20.0.10",
    "rpcPort": 8545,
    "p2pPort": 30303,
    "address": "0x...",
    "enode": "enode://...",
    "containerStatus": {
      "containerId": "container-id",
      "state": "running",
      "status": "Up 5 minutes"
    }
  }
}
```

#### `DELETE /api/networks/[id]/nodes/[nodeId]`
Remove a node from a network.

**Response:**
```json
{
  "success": true
}
```

## User Control Features

### Dynamic Parameters
Users have complete control over:

- **Chain ID**: Any valid chain ID
- **Subnet & Gateway**: Custom network configuration
- **Ports**: Custom RPC and P2P ports for each node
- **Node Types**: bootnode, miner, rpc
- **Node Count**: Flexible number of nodes per network

### Auto-Assignment
When users don't specify parameters, the system intelligently assigns:

- **IP Addresses**: From the provided subnet
- **Ports**: Starting from user-provided base ports or sensible defaults
- **Node IDs**: Unique identifiers with timestamps

### Conflict Detection
The API automatically detects and prevents:

- **Network ID conflicts**: Duplicate network names
- **Port conflicts**: Within the same network
- **IP conflicts**: Within the same subnet
- **Container name conflicts**: Docker container naming

## Testing

### Automated Testing
Run the comprehensive test suite:

```bash
# Start the development server
yarn dev

# In another terminal, run the test script
./test-api.sh
```

The test script covers:
- Network creation with custom parameters
- Node addition with custom and auto-assigned ports
- Error handling and validation
- Port conflict detection
- Resource cleanup

### Manual Testing Examples

#### Create a Network
```bash
curl -X POST http://localhost:3000/api/networks \
  -H "Content-Type: application/json" \
  -d '{
    "networkId": "my-test-network",
    "chainId": 12345,
    "nodeCount": 2,
    "subnet": "172.30.0.0/24",
    "baseRpcPort": 9000,
    "baseP2pPort": 31000
  }'
```

#### Add a Node with Custom Ports
```bash
curl -X POST http://localhost:3000/api/networks/my-test-network/nodes \
  -H "Content-Type: application/json" \
  -d '{
    "type": "rpc",
    "rpcPort": 9500,
    "p2pPort": 31500
  }'
```

#### List All Networks
```bash
curl http://localhost:3000/api/networks
```

#### Delete a Network
```bash
curl -X DELETE http://localhost:3000/api/networks/my-test-network
```

## Architecture

### File Structure
```
src/
├── app/
│   ├── api/
│   │   └── networks/
│   │       ├── route.ts                    # GET, POST /api/networks
│   │       └── [id]/
│   │           ├── route.ts                # GET, DELETE /api/networks/[id]
│   │           └── nodes/
│   │               ├── route.ts            # GET, POST /api/networks/[id]/nodes
│   │               └── [nodeId]/
│   │                   └── route.ts        # GET, DELETE /api/networks/[id]/nodes/[nodeId]
│   ├── layout.tsx
│   └── page.tsx
└── lib/
    ├── storage.ts                          # File-based storage utilities
    └── networkUtils.ts                     # Network configuration utilities
```

### Storage System
Current implementation uses JSON files in `/tmp/besu-networks/` for persistence:

- `{networkId}.json`: Network metadata
- `{networkId}/`: Network directory
- `{networkId}/{nodeId}/`: Node-specific files (keys, addresses, enodes)
- `{networkId}/genesis.json`: Genesis block configuration

### SDK Integration
The API is built on top of the `besu-network-manager` SDK:

- **DockerManager**: Container and network lifecycle
- **GenesisGenerator**: Clique consensus genesis blocks
- **KeyGenerator**: Ethereum keypair generation

## Future Enhancements

1. **Database Integration**: Replace file-based storage with PostgreSQL/MongoDB
2. **Authentication**: JWT-based API authentication
3. **Rate Limiting**: API rate limiting and quotas
4. **Monitoring**: Network and node health monitoring
5. **WebSocket**: Real-time network status updates
6. **Metrics**: Prometheus-compatible metrics export

## Error Handling

The API provides comprehensive error responses:

- **400 Bad Request**: Invalid input parameters
- **404 Not Found**: Network or node not found
- **409 Conflict**: Resource already exists or port conflicts
- **500 Internal Server Error**: System errors

Example error response:
```json
{
  "success": false,
  "error": "Network already exists"
}
```

## Development

### Scripts
- `yarn dev`: Start development server
- `yarn build`: Build for production
- `yarn start`: Start production server
- `yarn type-check`: TypeScript type checking

### Environment
- Node.js 16+
- Next.js 15+
- TypeScript 5+
- Docker API integration

This API provides a solid foundation for Besu network management with user-controlled parameters, robust error handling, and clean RESTful design.
