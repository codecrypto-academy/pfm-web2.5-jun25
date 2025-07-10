# PFM Web 2.5 - Besu Network Manager & Key Generator

A comprehensive TypeScript-based solution for managing Hyperledger Besu blockchain networks with modern cryptographic key generation utilities using ES6+ features and optimized performance.

## ✨ Features

### Monorepo Architecture
- 🧩 **Multi-Project Workspace**: Includes SDK, REST API backend, modern web frontend, and modular scripts
- 🔗 **Integrated Components**: All parts work together or independently for maximum flexibility
- 🧪 **Comprehensive Testing**: Unit, integration, and end-to-end tests across all modules


### Key Generation
- 🔑 Generate secp256k1 private/public key pairs (Ethereum compatible)
- 🏠 Generate Ethereum addresses from public keys
- 🌐 Create enode URLs for network connectivity
- 🚀 Modern TypeScript with arrow functions and latest ECMAScript features
- ⚡ Optimized performance with EC instance reuse and concurrent file operations
- 📦 Yarn-based dependency management
- 🛡️ Type-safe with comprehensive TypeScript types

### REST API & Web Interface
- 🌐 **Next.js REST API**: Full-featured API for network and node lifecycle management
- 🖥️ **Modern Web UI**: React + Mantine-based frontend for visual network management
- 🧑‍💻 **Dynamic Configuration**: User-controlled chain IDs, subnets, ports, node types, and counts
- 🗂️ **File-based & Extensible Storage**: JSON persistence, ready for DB migration
- 🧩 **SDK Integration**: All API and UI features built on the TypeScript SDK
- 🛡️ **Robust Error Handling**: Validation, conflict detection, and clear error responses

### Besu Network Management
- 🦭 **Podman-based Scripts**: Secure, macOS-optimized network orchestration (Podman replaces Docker in scripts)
- 🐳 **Docker SDK**: SDK uses Dockerode for cross-platform container management
- 🧩 **Modular Bash Scripts**: Setup, start, stop, test, and manage networks with granular control
- ⚙️ **Configuration-driven**: Centralized config files for easy customization
- 🔍 **Comprehensive Logging**: Color-coded logs, health checks, and status utilities
- 🧪 **Network Testing**: Built-in connectivity and RPC testing tools

### Developer Experience
- 🏗️ **TypeScript First**: Full type coverage, modern async/await, and advanced language features
- 🧪 **Jest Testing**: Unit and integration tests for SDK, scripts, and web
- 🧰 **Make/Yarn/CLI**: Flexible commands for every workflow
- 🧑‍💻 **Extensible**: Easy to add new node types, consensus mechanisms, or storage backends

### Security & Performance
- 🔒 **Private Key Management**: Local, plain-text for dev; extensible for secure storage
- ⚡ **Concurrent Operations**: Fast file and container management
- 🛡️ **Race Condition Prevention**: Sequenced startup and health checks

### UI/UX
- 🎨 **Mantine UI**: Beautiful, accessible, and responsive web interface
- 🔄 **Live Status**: Real-time network and node status in the frontend

---

### Besu Network Management
- 🦭 **Podman-based**: Uses Podman instead of Docker for better security and macOS compatibility
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

## 🚀 Quick Start (Workspace)


This is a **multi-project monorepo** with independent, but integrated, components:

```bash
# Install all dependencies for all projects
yarn install:all

# Build all projects
yarn build:all


# Start backend REST API (port 3000)
yarn start:backend

# Start frontend dev server (port 5173)
yarn dev:frontend

# Network operations (from any directory)
yarn network:setup    # Complete setup
yarn network:start     # Start network
yarn network:status    # Check status
yarn network:stop      # Stop network
```


## 📖 Usage


### Monorepo Components

#### 1. Network SDK (`network-sdk/`)
- TypeScript library for Docker-based Besu network management
- Provides: `DockerManager`, `GenesisGenerator`, `KeyGenerator`, and full type definitions
- Can be used standalone or as a dependency in other projects

#### 2. Backend REST API (`web/`)
- Next.js-based REST API for full network and node lifecycle management
- Exposes endpoints for creating, listing, updating, and deleting networks/nodes
- File-based storage (JSON), ready for DB migration

#### 3. Frontend Web Interface (`web/`)
- Modern React UI (Mantine) for visual network management
- Features: create/delete networks, add/remove nodes, live status, error feedback

#### 4. Scripts & CLI (`scripts/`)
- Modular Bash and TypeScript scripts for Podman-based orchestration
- Makefile for common workflows (`make setup`, `make start`, etc.)
- Granular control: setup, start, stop, test, logs, reset, and more


### Legacy Key Generation (Direct CLI)

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
├── package.json              # Root project config (Yarn workspaces)
├── tsconfig.json             # TypeScript config
├── README.md                 # Project documentation
├── LICENSE                   # MIT license
├── yarn.lock                 # Yarn lockfile
├── network-sdk/              # TypeScript SDK (Docker-based)
│   ├── src/                  # SDK source (DockerManager, GenesisGenerator, KeyGenerator, types)
│   └── dist/                 # Compiled SDK
├── web/                      # Next.js REST API & frontend (React + Mantine)
│   ├── src/app/              # API routes & UI pages
│   ├── src/lib/              # Storage, config, and network utilities
│   └── dist/                 # Built frontend
├── scripts/                  # Podman-based scripts & CLI
│   ├── besu-network.sh       # Main orchestrator
│   ├── bash/                 # Modular bash scripts (setup, start, stop, test, etc.)
│   ├── config/               # Network config
│   ├── lib/                  # Shared shell utilities
│   └── besu-network/         # Generated network data
└── ...
```


## 🔧 Scripts & Commands


### Yarn Scripts (Monorepo)

- `yarn build` - Compile TypeScript to JavaScript
- `yarn dev <command>` - Run in development mode with tsx
- `yarn createKeys <dir>` - Build and run createKeys command
- `yarn createKeysAndEnode <ip> <port> <dir>` - Build and run createKeysAndEnode command
- `yarn clean` - Remove compiled output
- `yarn start` - Start the compiled key generator
- `yarn prepare` - Pre-build hook (runs on install)


### Make Commands (Podman Network Management)

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


## 🧪 Testing & Developer Experience

### Automated & Manual Testing
- 🧪 **Jest**: Unit and integration tests for SDK, scripts, and web
- 🧪 **API Test Scripts**: Automated REST API tests (see `web/`)
- 🧪 **Manual Testing**: cURL, Postman, and web UI

### Developer Experience
- 🧰 **TypeScript everywhere**: Full type safety and modern language features
- 🧰 **Prettier & ESLint**: Consistent code style
- 🧰 **Make/Yarn/CLI**: Flexible for every workflow
- 🧰 **Extensible**: Add new node types, consensus, or storage backends easily

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


## 🔍 Troubleshooting & Contributing

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

---

## 🤝 Contributing

Contributions are welcome! Please:
- Test with `make setup` and `yarn build:all` from a clean state
- Add/extend tests for new features
- Update documentation for any changes
- Open issues or PRs for bugs, improvements, or questions

---
```
