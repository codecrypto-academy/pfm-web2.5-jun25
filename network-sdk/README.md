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

## Security

🔐 **This package contains only templates and infrastructure scripts.**

- All cryptographic keys and sensitive data are generated **locally** when you run the setup commands
- No private keys, passwords, or credentials are included in this package
- Each network setup creates fresh, unique keys specific to your environment
- Generated keys are stored in your local filesystem and never transmitted

**What's included:**
- ✅ Network setup automation scripts
- ✅ Configuration templates  
- ✅ Key generation algorithms
- ✅ Infrastructure management tools

**What's NOT included:**
- ❌ Pre-generated private keys
- ❌ Hardcoded credentials
- ❌ Production secrets
- ❌ User-specific data

Always keep your generated keys secure and never share them publicly.

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
