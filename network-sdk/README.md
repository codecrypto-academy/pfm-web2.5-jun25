# Besu Network SDK

A clean, focused TypeScript library providing essential building blocks for managing Hyperledger Besu networks with Docker containers. This SDK provides individual components that can be composed together in applications like Next.js to create complete network management solutions.

## Features

- **Modular Architecture**: Individual components for Docker, Genesis, and Key management
- **Docker Integration**: Native dockerode integration for container management
- **Clique Consensus**: Built-in support for Clique PoA consensus mechanism
- **TypeScript First**: Fully typed with comprehensive TypeScript definitions
- **Key Generation**: Ethereum key generation with enode URL creation
- **Genesis Generation**: Clique genesis block generation with validator configuration
- **Network Management**: Docker network and container lifecycle management

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

## Components Overview

The SDK provides three main components:

- **`DockerManager`** - Handles Docker networks and container operations
- **`GenesisGenerator`** - Creates Clique consensus genesis blocks  
- **`KeyGenerator`** - Generates Ethereum keypairs and enode URLs

## Usage Examples

### 1. DockerManager - Container & Network Operations

```typescript
import { DockerManager, NetworkConfig, BesuNodeConfig } from 'besu-network-manager';

const dockerManager = new DockerManager();

// Check Docker availability
const isAvailable = await dockerManager.isDockerAvailable();
if (!isAvailable) {
  throw new Error('Docker is not available');
}

// Create a Docker network
const networkConfig: NetworkConfig = {
  networkId: 'my-besu-network',
  chainId: 1337,
  subnet: '172.20.0.0/24',
  gateway: '172.20.0.1',
  nodes: [] // Will be populated with node configs
};

const dockerNetworkId = await dockerManager.createDockerNetwork(networkConfig);
console.log('Docker network created:', dockerNetworkId);

// Check if network exists
const exists = await dockerManager.networkExists('my-besu-network');
console.log('Network exists:', exists);

// Find containers in network
const containers = await dockerManager.findNetworkContainers('my-besu-network');
console.log('Containers in network:', containers.length);
```

### 2. KeyGenerator - Ethereum Key Management

```typescript
import { KeyGenerator } from 'besu-network-manager';

const keyGenerator = new KeyGenerator();

// Generate a new keypair with enode
const credentials = keyGenerator.generateKeyPair('172.20.0.10', 30303);
console.log('Generated credentials:', {
  address: credentials.address,
  enode: credentials.enode,
  // privateKey and publicKey are also available
});

// Generate from existing private key
const existingKey = '0x1234567890abcdef...';
const restoredCredentials = keyGenerator.fromPrivateKey(
  existingKey, 
  '172.20.0.11', 
  30303
);

// Generate multiple keypairs (useful for initial network setup)
const multipleKeys = KeyGenerator.generateMultiple(3, '172.20.0.0/24', 30303);
multipleKeys.forEach((cred, index) => {
  console.log(`Node ${index + 1}:`, cred.address);
});
```

### 3. GenesisGenerator - Clique Genesis Blocks

```typescript
import { GenesisGenerator } from 'besu-network-manager';

// Generate genesis with validators
const validatorAddresses = [
  '0x1234567890123456789012345678901234567890',
  '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
];

const genesis = GenesisGenerator.generateGenesis({
  chainId: 1337,
  validators: validatorAddresses,
  gasLimit: '0x1fffffffffffff'
});

console.log('Generated genesis:', JSON.stringify(genesis, null, 2));

// Validate existing genesis
const isValid = GenesisGenerator.isValidGenesis(genesis);
console.log('Genesis is valid:', isValid);
```

### 4. Complete Network Creation Example (Next.js API Route)

```typescript
// pages/api/networks/create.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  DockerManager, 
  GenesisGenerator, 
  KeyGenerator,
  NetworkConfig,
  BesuNodeConfig 
} from 'besu-network-manager';
import * as fs from 'fs';
import * as path from 'path';

export async function POST(request: NextRequest) {
  const dockerManager = new DockerManager();
  const keyGenerator = new KeyGenerator();
  
  try {
    const { networkId, chainId, nodeCount } = await request.json();
    
    // 1. Check Docker availability
    if (!await dockerManager.isDockerAvailable()) {
      return NextResponse.json(
        { error: 'Docker is not available' }, 
        { status: 500 }
      );
    }
    
    // 2. Generate network configuration
    const networkConfig: NetworkConfig = {
      networkId,
      chainId,
      subnet: '172.20.0.0/24',
      gateway: '172.20.0.1',
      nodes: []
    };
    
    // 3. Generate keys for nodes
    const nodeCredentials = [];
    const validators = [];
    
    for (let i = 0; i < nodeCount; i++) {
      const ip = `172.20.0.${10 + i}`;
      const credentials = keyGenerator.generateKeyPair(ip, 30303 + i);
      
      const nodeConfig: BesuNodeConfig = {
        id: `node-${i}`,
        type: i === 0 ? 'bootnode' : 'miner',
        ip,
        rpcPort: 8545 + i,
        p2pPort: 30303 + i,
        address: credentials.address,
        enode: credentials.enode
      };
      
      networkConfig.nodes.push(nodeConfig);
      nodeCredentials.push(credentials);
      
      if (nodeConfig.type === 'miner') {
        validators.push(credentials.address);
      }
    }
    
    // 4. Generate genesis file
    const genesis = GenesisGenerator.generateGenesis({
      chainId,
      validators
    });
    
    // 5. Create Docker network
    const dockerNetworkId = await dockerManager.createDockerNetwork(networkConfig);
    
    // 6. Create node directories and save keys
    const networkPath = `/tmp/besu-networks/${networkId}`;
    await fs.promises.mkdir(networkPath, { recursive: true });
    
    for (let i = 0; i < networkConfig.nodes.length; i++) {
      const node = networkConfig.nodes[i];
      const credentials = nodeCredentials[i];
      
      // Create node directory
      const nodePath = path.join(networkPath, node.id);
      await fs.promises.mkdir(nodePath, { recursive: true });
      
      // Save node files
      await fs.promises.writeFile(
        path.join(nodePath, 'key'), 
        credentials.privateKey.slice(2)
      );
      await fs.promises.writeFile(
        path.join(nodePath, 'address'), 
        credentials.address
      );
      await fs.promises.writeFile(
        path.join(nodePath, 'enode'), 
        credentials.enode
      );
    }
    
    // Save genesis file
    await fs.promises.writeFile(
      path.join(networkPath, 'genesis.json'),
      JSON.stringify(genesis, null, 2)
    );
    
    // 7. Create and start containers
    const containers = [];
    for (const node of networkConfig.nodes) {
      const nodePath = path.join(networkPath, node.id);
      const container = await dockerManager.createBesuContainer(
        networkConfig,
        node,
        nodePath
      );
      containers.push(container);
    }
    
    return NextResponse.json({
      success: true,
      network: {
        networkId,
        dockerNetworkId,
        chainId,
        containers: containers.length,
        nodes: networkConfig.nodes.map(n => ({
          id: n.id,
          type: n.type,
          rpcPort: n.rpcPort,
          address: n.address
        }))
      }
    });
    
  } catch (error) {
    console.error('Network creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to create network' },
      { status: 500 }
    );
  }
}
```

### 5. Adding a Node to Existing Network

```typescript
// pages/api/networks/[id]/nodes/add.ts
import { NextRequest, NextResponse } from 'next/server';
import { DockerManager, KeyGenerator } from 'besu-network-manager';
import * as fs from 'fs';
import * as path from 'path';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const dockerManager = new DockerManager();
  const keyGenerator = new KeyGenerator();
  
  try {
    const { id: networkId } = await params;
    const { nodeType, ip, rpcPort, p2pPort } = await request.json();
    
    // 1. Check if network exists
    if (!await dockerManager.networkExists(networkId)) {
      return NextResponse.json(
        { error: 'Network not found' }, 
        { status: 404 }
      );
    }
    
    // 2. Generate node configuration
    const nodeId = `node-${Date.now()}`;
    const credentials = keyGenerator.generateKeyPair(ip, p2pPort);
    
    const nodeConfig = {
      id: nodeId,
      type: nodeType,
      ip,
      rpcPort,
      p2pPort,
      address: credentials.address,
      enode: credentials.enode
    };
    
    // 3. Create node directory and save keys
    const networkPath = `/tmp/besu-networks/${networkId}`;
    const nodePath = path.join(networkPath, nodeId);
    await fs.promises.mkdir(nodePath, { recursive: true });
    
    await fs.promises.writeFile(
      path.join(nodePath, 'key'), 
      credentials.privateKey.slice(2)
    );
    await fs.promises.writeFile(
      path.join(nodePath, 'address'), 
      credentials.address
    );
    await fs.promises.writeFile(
      path.join(nodePath, 'enode'), 
      credentials.enode
    );
    
    // 4. Add node to network
    const networkConfig = {
      networkId,
      chainId: 1337, // Load from stored config
      subnet: '172.20.0.0/24',
      gateway: '172.20.0.1',
      nodes: [nodeConfig]
    };
    
    const container = await dockerManager.addNodeToNetwork(
      networkConfig,
      nodeConfig,
      nodePath
    );
    
    return NextResponse.json({
      success: true,
      node: {
        id: nodeId,
        containerId: container.containerId,
        type: nodeType,
        address: credentials.address,
        rpcPort,
        p2pPort
      }
    });
    
  } catch (error) {
    console.error('Failed to add node:', error);
    return NextResponse.json(
      { error: 'Failed to add node' },
      { status: 500 }
    );
  }
}
```

### 6. Network Cleanup

```typescript
// pages/api/networks/[id]/delete.ts
import { NextRequest, NextResponse } from 'next/server';
import { DockerManager } from 'besu-network-manager';
import * as fs from 'fs';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const dockerManager = new DockerManager();
  
  try {
    const { id: networkId } = await params;
    
    // 1. Remove all containers in the network
    const containers = await dockerManager.findNetworkContainers(networkId);
    for (const container of containers) {
      await dockerManager.removeContainer(container.Id);
    }
    
    // 2. Remove Docker network
    await dockerManager.removeDockerNetwork(networkId);
    
    // 3. Clean up files
    const networkPath = `/tmp/besu-networks/${networkId}`;
    if (fs.existsSync(networkPath)) {
      await fs.promises.rm(networkPath, { recursive: true });
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Failed to delete network:', error);
    return NextResponse.json(
      { error: 'Failed to delete network' },
      { status: 500 }
    );
  }
}
```

## Type Definitions

```typescript
// Core network configuration
interface NetworkConfig {
  networkId: string;
  chainId: number;
  subnet: string;
  gateway: string;
  nodes: BesuNodeConfig[];
  genesis?: any;
}

// Node configuration
interface BesuNodeConfig {
  id: string;
  type: 'bootnode' | 'miner' | 'rpc';
  rpcPort: number;
  p2pPort: number;
  ip: string;
  enode?: string;
  address?: string;
  bootnodes?: string[];
}

// Container information
interface ContainerInfo {
  id: string;
  containerId: string;
  containerName: string;
  status: 'running' | 'stopped' | 'error';
}

// Node credentials
interface NodeCredentials {
  privateKey: string;
  publicKey: string;
  address: string;
  enode: string;
}
```

## Architecture Principles

This SDK follows a **modular, building-block approach**:

1. **Single Responsibility**: Each component has one clear purpose
2. **Composable**: Components can be combined in applications as needed  
3. **Framework Agnostic**: Works with Next.js, Express, or any Node.js application
4. **Docker Native**: Direct integration with Docker APIs, no shell scripts
5. **Type Safe**: Full TypeScript support with comprehensive type definitions

## Development

```bash
# Install dependencies
yarn install

# Build the project
yarn build

# Check types
npx tsc --noEmit
```

## Requirements

- Docker daemon running and accessible
- Node.js 16+
- Proper Docker permissions for container management

## License

MIT
