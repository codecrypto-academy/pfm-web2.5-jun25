# PFM Web 2.5 - Besu Network Manager & Key Generator

A comprehensive TypeScript-based solution for managing Hyperledger Besu blockchain networks with modern cryptographic key generation utilities using ES6+ features and optimized performance.

## ✨ Features

### Key Generation
- 🔑 Generate secp256k1 private/public key pairs (Ethereum compatible)
- 🏠 Generate Ethereum addresses from public keys
- 🌐 Create enode URLs for network connectivity
- 🚀 Modern TypeScript with arrow functions and latest ECMAScript features
- ⚡ Optimized performance with EC instance reuse and concurrent file operations
- 📦 Yarn-based dependency management
- 🛡️ Type-safe with comprehensive TypeScript types

### Besu Network Management
- 🐳 **Podman-based**: Uses Podman instead of Docker for better security and macOS compatibility
- 🧩 **Modular Architecture**: Separate scripts for different network management concerns
- 🛡️ **Error Handling**: Comprehensive error checking and graceful failure handling  
- 🚫 **Race Condition Prevention**: Proper container startup sequencing and health checks
- 🍎 **macOS Optimized**: Designed specifically for macOS (no WSL2 dependencies)
- ⚙️ **Configuration-driven**: Easy customization through config files
- 🔍 **Comprehensive Logging**: Color-coded logs with different severity levels
- 🧪 **Network Testing**: Built-in connectivity and RPC testing utilities
- 📦 **Yarn-based dependency management**

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- Yarn package manager
- Podman (for network management)
- macOS (recommended)

### Installation

```bash
# Clone the repository
cd /path/to/pfm-web2.5

# Install dependencies
yarn install

# Build the project
yarn build

# Install system prerequisites (macOS)
brew install make
```

## 📖 Usage

### Key Generation

#### Development Mode (TypeScript)

```bash
# Generate basic keys
yarn dev createKeys ./output-directory

# Generate keys with enode URL
yarn dev createKeysAndEnode <ip> <port> ./output-directory
```

#### Production Mode (Compiled JavaScript)

```bash
# Build first
yarn build

# Generate basic keys
yarn createKeys ./output-directory

# Generate keys with enode URL
yarn createKeysAndEnode 192.168.1.100 42007 ./output-directory
```

#### Examples

```bash
# Create keys in a 'keys' directory
yarn dev createKeys ./keys

# Create keys with enode for IP 192.168.1.100 on port 42007
yarn dev createKeysAndEnode 192.168.1.100 42007 ./network-keys

# Production usage
yarn build
node dist/network/createKeys.js createKeys ./production-keys
```

### Besu Network Management

#### Using Make Commands (Recommended)

```bash
# Complete network setup from scratch
make setup

# Start the network
make start

# Stop the network
make stop

# Check network status
make status

# View logs
make logs

# Test network connectivity
make test

# Restart the network
make restart

# Clean up containers
make clean

# Complete reset (destructive!)
make reset

# Show available commands
make help
```

#### Using Direct Scripts

```bash
# Navigate to network directory
cd network

# Setup and start network
./besu-network.sh setup
./besu-network.sh start

# Stop network
./besu-network.sh stop

# Check status
./besu-network.sh status
```

## 📁 Output Files

### Key Generation Output

The key generation tool creates the following files in the specified directory:

- `key` - Private key (hex format)
- `pub` - Public key (hex format)  
- `address` - Ethereum address (hex format)
- `enode` - Enode URL (only when using createKeysAndEnode)

### Network Data

The network manager creates a complete Besu network setup:

- `besu-network/` - Main network directory
  - `genesis.json` - Genesis block configuration
  - `config.toml` - Node configuration  
  - `bootnode-config.toml` - Bootnode specific configuration
  - `bootnode/` - Bootnode keys and data
  - `miner-node/` - Miner node keys and data
  - `rpc-node/` - RPC node keys and data

## 🏗️ Project Structure

```
pfm-web2.5/
├── package.json              # Yarn configuration & dependencies
├── tsconfig.json             # TypeScript configuration
├── README.md                 # Project documentation
├── LICENSE                   # MIT license
├── .gitignore               # Git ignore rules
├── yarn.lock                # Yarn lockfile
├── dist/                    # Compiled JavaScript output
│   ├── createKeys.js        # Compiled key generator
│   └── network/             # Compiled network utilities
└── network/                 # Network management & key generation
    ├── createKeys.ts        # Modern TypeScript key generator
    ├── besu-network.sh      # Main network orchestrator script
    ├── Makefile            # Convenient make commands
    ├── README.md           # Network-specific documentation
    ├── config/
    │   └── network.conf    # Network configuration
    ├── lib/
    │   └── common.sh       # Shared utilities and functions
    ├── scripts/
    │   ├── setup-network.sh     # Podman network setup
    │   ├── generate-keys.sh     # Cryptographic key generation
    │   ├── generate-config.sh   # Genesis and TOML config generation
    │   ├── start-network.sh     # Container startup
    │   ├── stop-network.sh      # Container shutdown
    │   ├── test-network.sh      # Network testing utilities
    │   └── network-utils.sh     # Status, logs, testing utilities
    └── besu-network/           # Generated network data (created at runtime)
        ├── genesis.json        # Genesis block configuration
        ├── config.toml         # Node configuration
        ├── bootnode-config.toml # Bootnode configuration
        ├── bootnode/           # Bootnode keys and database
        ├── miner-node/         # Miner node keys and database
        └── rpc-node/           # RPC node keys and database
```

## 🔧 Scripts

### Yarn Scripts

- `yarn build` - Compile TypeScript to JavaScript
- `yarn dev <command>` - Run in development mode with tsx
- `yarn createKeys <dir>` - Build and run createKeys command
- `yarn createKeysAndEnode <ip> <port> <dir>` - Build and run createKeysAndEnode command
- `yarn clean` - Remove compiled output
- `yarn start` - Start the compiled key generator
- `yarn prepare` - Pre-build hook (runs on install)

### Make Commands (Network Management)

- `make help` - Show all available commands
- `make install` - Install prerequisites (macOS)
- `make setup` - Complete network setup from scratch
- `make start` - Start the network
- `make stop` - Stop the network gracefully
- `make restart` - Restart the network
- `make status` - Show network status
- `make logs` - Show all container logs
- `make test` - Test network connectivity
- `make clean` - Stop and clean up containers
- `make reset` - Complete network reset (destructive!)

## 🆕 Modern Features Used

- **Arrow Functions**: All functions use modern arrow syntax
- **Template Literals**: Enhanced string formatting
- **Destructuring**: Clean parameter extraction
- **Spread Operator**: Elegant object composition
- **Async/Await**: Modern asynchronous patterns
- **Type Guards**: Enhanced error handling
- **Object Methods**: Modern object manipulation
- **Promise.all**: Concurrent file operations
- **Optional Chaining**: Safe property access

## 🎯 Optimizations

1. **EC Instance Reuse**: Single elliptic curve instance for better performance
2. **Concurrent File Operations**: Parallel file writing using Promise.all
3. **Type Safety**: Full TypeScript type coverage
4. **Memory Efficiency**: Optimized string and buffer operations
5. **Error Handling**: Comprehensive error management with proper typing

## 📦 Dependencies

### Runtime Dependencies
- `elliptic` - Elliptic curve cryptography
- `keccak256` - Keccak hashing algorithm
- `@types/elliptic` - TypeScript types for elliptic

### Development Dependencies
- `typescript` - TypeScript compiler
- `tsx` - TypeScript execution for Node.js
- `@types/node` - Node.js type definitions

### System Dependencies (for Network Management)
- `podman` - Container management (replaces Docker)
- `node` - Node.js runtime (>=18.0.0)
- `jq` - JSON processor (optional, for log formatting)
- `curl` - HTTP client (for network testing)

## 🔒 Cryptography

This tool uses the secp256k1 elliptic curve, the same cryptographic standard used by:

- Ethereum
- Bitcoin  
- Hyperledger Besu
- Most blockchain networks

Generated keys are compatible with standard Ethereum tooling and networks.

## 🌐 Network Configuration

The Besu network is configured with:

- **Chain ID**: 246700 (custom private network)
- **RPC Port**: 4200 (host machine)
- **Network Name**: besu-network
- **Consensus**: Proof of Authority (PoA)
- **Nodes**: 
  - Bootnode (discovery and peer management)
  - Miner Node (block production)
  - RPC Node (API access)

## 🧪 Testing

The network includes comprehensive testing utilities:

```bash
# Test network connectivity
make test

# Manual RPC testing
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:4200
```

## 🔍 Troubleshooting

### Common Issues

1. **Port conflicts**: Check if port 4200 is available
2. **Podman not running**: Start Podman machine with `podman machine start`
3. **Container startup issues**: Check logs with `make logs`
4. **Network connectivity**: Verify Podman network with `podman network ls`

### Debugging Commands

```bash
# Check container status
podman ps -a --filter name=besu

# View specific container logs
podman logs besu-bootnode
podman logs besu-miner
podman logs besu-rpc

# Inspect network
podman network inspect besu-network

# Clean reset if needed
make reset
```
