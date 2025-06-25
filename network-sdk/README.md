# Network SDK

TypeScript SDK for managing Besu blockchain networks.

## Features

- 🔧 **Network Management**: Start, stop, restart, and monitor Besu networks
- 🔑 **Key Generation**: Generate cryptographic keys and enode URLs  
- 🏗️ **TypeScript**: Full type safety and modern ES6+ features
- 🧩 **Modular**: Clean separation of concerns

## Installation

```bash
cd network-sdk
yarn install
yarn build
```

## Usage

```typescript
import { NetworkManager, KeyGenerator } from 'network-sdk';

// Network management
const network = new NetworkManager();
await network.setup();
await network.start();

// Key generation
const keys = KeyGenerator.generateKeys();
await KeyGenerator.saveKeys(keys, './output');
```

## API

### NetworkManager

- `setup()` - Complete network setup
- `start()` - Start the network
- `stop()` - Stop the network  
- `restart()` - Restart the network
- `getStatus()` - Get network status
- `getLogs(container?)` - Get container logs
- `test()` - Test network connectivity
- `reset()` - Reset network (destructive)

### KeyGenerator

- `generateKeys()` - Generate basic cryptographic keys
- `generateKeysWithEnode(ip, port)` - Generate keys with enode URL
- `saveKeys(keys, directory)` - Save keys to filesystem
