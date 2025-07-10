# @jviejo/docker-manager

A TypeScript library to manage Docker containers and networks using dockerode, with specialized support for Besu blockchain deployments.

## Installation

```bash
npm install @devisrael/docker-manager
```

## Features

- 🐳 **Docker Management**: Create and manage Docker containers and networks
- ⛓️ **Besu Blockchain**: Specialized deployment for Hyperledger Besu nodes
- 🔧 **TypeScript**: Full TypeScript support with type definitions
- 🧪 **Tested**: Comprehensive test suite
- 📦 **Simple API**: Easy-to-use interface

## Quick Start

### Basic Docker Management

```typescript
import { DockerManager } from '@jviejo/docker-manager';

const manager = new DockerManager();

// Create a network
const networkId = await manager.createNetwork({
  name: 'my-network',
  subnet: '172.20.0.0/16'
});

// Create a container
const containerId = await manager.createContainer({
  name: 'my-container',
  Image: 'nginx:latest',
  networkName: 'my-network',
  ip: '172.20.0.10'
});
```

### Besu Blockchain Deployment

```typescript
import { BesuDeployer } from '@jviejo/docker-manager';

const deployer = new BesuDeployer({
  networkName: 'besu-network',
  subnet: '172.25.0.0/16',
  dataPath: './besu-network'
});

const nodes = [
  { name: 'bootnode', ip: '172.25.0.10', isBootnode: true },
  { name: 'rpc-node', ip: '172.25.0.11', isRpc: true },
  { name: 'miner-node', ip: '172.25.0.12', isMiner: true }
];

await deployer.deployBesuNetwork(nodes);
```

## API Reference

### DockerManager

#### `createNetwork(options: NetworkCreateOptions): Promise<string>`
Creates a Docker network with the specified configuration.

#### `createContainer(options: ContainerOptions): Promise<string>`
Creates and starts a Docker container.

#### `removeContainer(nameOrId: string, force?: boolean): Promise<void>`
Removes a Docker container.

#### `removeNetwork(networkNameOrId: string, removeContainers?: boolean): Promise<void>`
Removes a Docker network and optionally its containers.

#### `getNetworkInfo(networkNameOrId: string): Promise<NetworkInfo>`
Gets detailed information about a network.

#### `getContainerInfo(containerNameOrId: string): Promise<ContainerInfo>`
Gets detailed information about a container.

### BesuDeployer

#### `deployBesuNetwork(nodes: BesuNodeConfig[]): Promise<void>`
Deploys a complete Besu blockchain network with the specified nodes.

#### `getNetworkStatus(): Promise<any>`
Gets the status of the deployed Besu network.

#### `getNodeLogs(nodeName: string): Promise<string>`
Gets the logs from a specific Besu node (useful for debugging).

## Types

```typescript
interface BesuNodeConfig {
  name: string;
  ip: string;
  port?: number;
  isBootnode?: boolean;
  isMiner?: boolean;
  isRpc?: boolean;
}

interface BesuNetworkConfig {
  networkName: string;
  subnet: string;
  dataPath: string;
}
```

## Examples

See the `src/examples/` directory for complete examples:

- `deploy-besu.ts`: Complete Besu network deployment example

## Requirements

- Node.js >= 14
- Docker installed and running
- TypeScript (for development)

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build library
npm run build

# Run example
npm run example:deploy
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

ISC

## Author

@devisrael