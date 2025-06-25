# Besu Network Manager

A modular, robust solution for setting up and managing a Hyperledger Besu blockchain network using Podman containers on macOS.

## Features

- ✅ **Podman-based**: Uses Podman instead of Docker for better security and macOS compatibility
- ✅ **Modular Architecture**: Separate scripts for different concerns
- ✅ **Error Handling**: Comprehensive error checking and graceful failure handling  
- ✅ **Race Condition Prevention**: Proper container startup sequencing and health checks
- ✅ **macOS Optimized**: Designed specifically for macOS (no WSL2 dependencies)
- ✅ **Configuration-driven**: Easy customization through config files
- ✅ **TypeScript Integration**: Uses the modern createKeys.ts for key generation
- ✅ **Comprehensive Logging**: Color-coded logs with different severity levels
- ✅ **Network Testing**: Built-in connectivity and RPC testing utilities

## Prerequisites

Install the required tools using Homebrew:

```bash
# Install Podman
brew install podman

# Install Node.js (version 18 or higher)
brew install node

# Optional but recommended
brew install jq curl
```

## Project Structure

```
network/
├── besu-network.sh              # Main orchestrator script
├── config/
│   └── network.conf             # Network configuration
├── lib/
│   └── common.sh               # Shared utilities and functions
├── scripts/
│   ├── setup-network.sh        # Podman network setup
│   ├── generate-keys.sh         # Cryptographic key generation
│   ├── generate-config.sh       # Genesis and TOML config generation
│   ├── start-network.sh         # Container startup
│   ├── stop-network.sh          # Container shutdown
│   └── network-utils.sh         # Status, logs, testing utilities
└── besu-network/               # Generated data directory
    ├── genesis.json            # Genesis block configuration
    ├── config.toml             # Node configuration
    ├── bootnode-config.toml    # Bootnode-specific configuration
    ├── bootnode/               # Bootnode keys and data
    ├── miner-node/            # Miner node keys and data
    └── rpc-node/              # RPC node keys and data
```

## Quick Start

### 1. Complete Setup (First Time)

```bash
# Set up everything from scratch
./besu-network.sh setup

# Start the network
./besu-network.sh start
```

### 2. Check Network Status

```bash
./besu-network.sh status
```

### 3. Test Network Connectivity

```bash
./besu-network.sh test
```

## Detailed Usage

### Main Commands

```bash
# Complete network setup
./besu-network.sh setup

# Start the network
./besu-network.sh start

# Stop the network
./besu-network.sh stop

# Force stop (immediate)
./besu-network.sh stop --force

# Restart the network
./besu-network.sh restart

# Show network status
./besu-network.sh status

# Show container logs
./besu-network.sh logs [container-name]

# Test network connectivity
./besu-network.sh test

# Reset everything (destructive)
./besu-network.sh reset
```

### Individual Script Usage

If you need more granular control:

```bash
# Set up Podman network only
./scripts/setup-network.sh

# Generate keys only
./scripts/generate-keys.sh

# Generate configuration files only
./scripts/generate-config.sh

# Start containers only
./scripts/start-network.sh

# Stop containers
./scripts/stop-network.sh [--force]

# Network utilities
./scripts/network-utils.sh status|logs|test|reset
```

## Network Configuration

The network is configured through `config/network.conf`. Key settings:

```bash
# Network settings
NETWORK_NAME="besu-network"
NETWORK_SUBNET="192.47.0.0/16"

# Node IPs
BOOTNODE_IP="192.47.0.2"
MINER_NODE_IP="192.47.0.3"
RPC_NODE_IP="192.47.0.4"

# Ports
P2P_PORT="42007"
RPC_PORT="8545"
RPC_EXTERNAL_PORT="4200"

# Chain configuration
CHAIN_ID="842115"
BLOCK_PERIOD="4"
EPOCH_LENGTH="30000"
```

## Network Architecture

The network consists of three nodes:

1. **Bootnode** (`192.47.0.2:42007`)
   - Discovery and peer coordination
   - Entry point for other nodes

2. **Miner Node** (`192.47.0.3:42007`)
   - Clique PoA mining/validation
   - Pre-funded with test Ether

3. **RPC Node** (`192.47.0.4:42007`)
   - JSON-RPC endpoint for external connections
   - Exposed on `localhost:4200`

## RPC API Usage

Once the network is running, you can interact with it:

```bash
# Get current block number
curl -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:4200

# Get network/chain ID
curl -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}' \
  http://localhost:4200

# Get account balance
curl -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0x<address>","latest"],"id":1}' \
  http://localhost:4200
```

## Troubleshooting

### Podman Machine Issues

If you get Podman-related errors:

```bash
# Initialize and start Podman machine
podman machine init
podman machine start

# Check machine status
podman machine list
```

### Container Issues

```bash
# Check container status
./besu-network.sh status

# View container logs
./besu-network.sh logs [container-name]

# Force restart
./besu-network.sh stop --force
./besu-network.sh start
```

### Network Issues

```bash
# Test connectivity
./besu-network.sh test

# Check if ports are available
lsof -i :4200

# Reset everything if corrupted
./besu-network.sh reset
./besu-network.sh setup
```

### Key Generation Issues

Make sure you have the dependencies installed:

```bash
# Install project dependencies
yarn install

# Test key generation manually
yarn dev createKeys ./test-keys
```

## Security Considerations

- **Development Only**: This setup is for development/testing purposes
- **Private Keys**: Keys are generated and stored in plain text
- **Network Access**: RPC endpoint accepts connections from anywhere (`*`)
- **Container Security**: Containers run with elevated permissions for volume mounting

## Performance Tuning

You can adjust performance by modifying `config/network.conf`:

```bash
# Faster block times (reduce from 4 seconds)
BLOCK_PERIOD="2"

# More frequent epochs
EPOCH_LENGTH="15000"

# Adjust container resources in start-network.sh if needed
```

## Integration with Development Tools

### Web3.js Example

```javascript
const Web3 = require('web3');
const web3 = new Web3('http://localhost:4200');

// Get current block
web3.eth.getBlockNumber().then(console.log);

// Get network ID
web3.eth.net.getId().then(console.log);
```

### MetaMask Configuration

- **Network Name**: Besu Local
- **RPC URL**: `http://localhost:4200`
- **Chain ID**: `842115`
- **Currency Symbol**: ETH

## Improvements Over Original Script

1. **Modular Design**: Separated concerns into focused scripts
2. **Error Handling**: Comprehensive error checking at every step
3. **Race Condition Prevention**: Proper container startup sequencing
4. **Podman Migration**: Full Docker-to-Podman conversion for macOS
5. **Configuration Management**: Centralized configuration file
6. **Logging**: Structured, color-coded logging system
7. **Health Checks**: Container and network readiness validation
8. **Testing Tools**: Built-in connectivity and RPC testing
9. **Documentation**: Comprehensive usage documentation
10. **TypeScript Integration**: Proper integration with createKeys.ts

## Contributing

When making changes:

1. Test with `./besu-network.sh setup` from clean state
2. Verify all error paths work correctly
3. Update configuration documentation
4. Test on clean macOS system

## License

MIT License - see LICENSE file for details.
