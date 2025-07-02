# Besu Network Manager

A TypeScript library for managing Hyperledger Besu networks with Clique consensus using Docker containers.

## Features

- **Docker-based**: Uses dockerode to manage Besu containers, no shell scripts required
- **Clique Consensus**: Built-in support for Clique PoA consensus mechanism
- **Dynamic IP Management**: Automatic IP allocation within configurable subnets
- **TypeScript Support**: Fully typed with comprehensive TypeScript definitions
- **Network Management**: Create, delete, and modify networks with multiple node types
- **Node Management**: Add/remove nodes dynamically with automatic configuration
- **Key Generation**: Built-in Ethereum key generation and enode URL creation

## Installation

```bash
yarn add besu-network-manager
# or
npm install besu-network-manager
```

## Prerequisites

- Docker daemon running
- Node.js 16+ 
- TypeScript 4.5+ (for development)

## Quick Start

```typescript
import { NetworkManager } from 'besu-network-manager';

// Create a network manager instance
const manager = new NetworkManager();

// Create a simple network configuration
const networkConfig = {
  networkId: 'my-test-network',
  chainId: 1337,
  subnet: '172.20.0.0/24',
  besuVersion: 'latest'
};

// Add some initial nodes
networkConfig.nodes = [
  { id: 'miner1', type: 'miner', rpcPort: 8545 },
  { id: 'rpc1', type: 'rpc', rpcPort: 8546 }
];

// Create the network
const networkInfo = await manager.createNetwork(networkConfig);
console.log('Network created:', networkInfo.networkId);

// Add another node dynamically
const newNode = { id: 'miner2', type: 'miner', rpcPort: 8547 };
await manager.addNode(networkInfo.networkId, newNode);

// Get network status
const status = await manager.getNetworkStatus(networkInfo.networkId);
console.log('Network status:', status);

// Clean up
await manager.deleteNetwork(networkInfo.networkId);
```

## API Reference

### NetworkManager

The main class for managing Besu networks.

#### Methods

- `createNetwork(config: BesuNetworkConfig): Promise<NetworkInfo>`
- `deleteNetwork(networkId: string): Promise<void>`
- `addNode(networkId: string, nodeConfig: BesuNodeConfig): Promise<NodeInfo>`
- `removeNode(networkId: string, nodeId: string): Promise<void>`
- `getNetworkInfo(networkId: string): NetworkInfo | undefined`
- `getNetworkStatus(networkId: string): Promise<NetworkStatus>`
- `listNetworks(): NetworkInfo[]`
- `isDockerAvailable(): boolean`

### Configuration Types

#### BesuNetworkConfig

```typescript
interface BesuNetworkConfig {
  networkId: string;           // Unique network identifier
  chainId: number;            // Blockchain chain ID
  subnet: string;             // Docker network subnet (CIDR)
  name?: string;              // Display name
  besuVersion?: string;       // Docker image version
  nodes?: BesuNodeConfig[];   // Initial nodes
  genesis?: GenesisConfig;    // Genesis block overrides
}
```

#### BesuNodeConfig

```typescript
interface BesuNodeConfig {
  id: string;                        // Unique node identifier
  type: 'bootnode' | 'miner' | 'rpc' | 'validator';
  ip?: string;                       // Specific IP (auto-assigned if not provided)
  rpcPort?: number;                  // RPC port (default: 8545)
  p2pPort?: number;                  // P2P port (default: 30303)
  mining?: boolean;                  // Enable mining
  credentials?: NodeCredentials;     // Node keys (auto-generated if not provided)
  env?: Record<string, string>;     // Environment variables
  extraArgs?: string[];             // Additional Besu arguments
}
```

## Advanced Usage

### Custom Docker Configuration

```typescript
import Docker from 'dockerode';

const docker = new Docker({
  socketPath: '/var/run/docker.sock'
});

const manager = new NetworkManager(docker);
```

### Custom Genesis Configuration

```typescript
const networkConfig = createNetworkConfig('custom-network', 1337);
networkConfig.genesis = {
  gasLimit: '0x1fffffffffffff',
  difficulty: '0x1',
  extraConfig: {
    clique: {
      period: 3,  // 3 second block time
      epoch: 30000
    }
  }
};
```

### Event Handling

```typescript
manager.on('networkCreated', (networkInfo) => {
  console.log('Network created:', networkInfo.networkId);
});

manager.on('nodeAdded', (networkId, nodeInfo) => {
  console.log('Node added:', nodeInfo.id, 'to network:', networkId);
});

manager.on('dockerUnavailable', (error) => {
  console.log('Docker not available:', error.suggestions);
});

manager.on('error', (error) => {
  console.error('Network manager error:', error);
});
```

### Key Generation

```typescript
import { KeyGenerator } from 'besu-network-manager';

const keyGen = new KeyGenerator();

// Generate new keys
const credentials = keyGen.generateKeyPair();
console.log('Address:', credentials.address);
console.log('Private Key:', credentials.privateKey);

// Generate from existing private key
const existingCredentials = keyGen.generateFromPrivateKey('0x...');

// Generate multiple keys
const multipleKeys = keyGen.generateMultipleKeyPairs(5);
```

## Network Types

### Bootnode
- Entry point for network discovery
- Automatically created as the first node
- Maintains peer connections

### Miner
- Participates in block production
- Validates transactions
- Can be validator in Clique consensus

### RPC
- Provides JSON-RPC API access
- Read-only node (no mining)
- Used for client connections

### Validator
- Participates in Clique consensus
- Signs blocks in rotation
- Requires initial allocation in genesis

## Development

```bash
# Install dependencies
yarn install

# Build the project
yarn build

# Run linting
yarn lint

# Format code
yarn format
```

## Docker Requirements

The library requires access to Docker daemon. Ensure Docker is running and accessible:

```bash
# Test Docker connectivity
docker ps

# Check Docker network capabilities
docker network ls
```

## Troubleshooting

### Common Issues

1. **Docker Permission Denied**
   - Ensure your user is in the `docker` group
   - Or run with appropriate permissions

2. **Port Conflicts**
   - Ensure RPC/P2P ports are available
   - Use different port ranges for multiple networks

3. **Subnet Conflicts**
   - Use unique subnets for each network
   - Check existing Docker networks: `docker network ls`

4. **Container Startup Issues**
   - Check Docker logs: `docker logs <container-name>`
   - Verify Besu image is available: `docker images hyperledger/besu`

### Debug Mode

Enable debug logging:

```typescript
const manager = new NetworkManager();
manager.on('error', console.error);
manager.on('dockerUnavailable', (error) => {
  console.log('Docker issue:', error.suggestions);
});

// Check Docker availability
if (!manager.isDockerAvailable()) {
  console.log('Docker is not available');
}
```

## Project Structure

```
network-sdk/
├── src/
│   ├── index.ts              # Main exports
│   ├── types.ts              # TypeScript definitions
│   ├── NetworkManager.ts     # Main orchestration class
│   ├── KeyGenerator.ts       # Key generation utilities
│   ├── GenesisGenerator.ts   # Genesis block creation
│   └── ConfigGenerator.ts    # Docker configuration
├── dist/                     # Compiled JavaScript + .d.ts
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript config
└── README.md                 # Documentation
```

## Requirements

- Docker daemon running
- Node.js 16+
- Proper Docker permissions for container management

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request
