# PFM Web 2.5 - Cryptographic Key Generator

A modern TypeScript utility for generating Ethereum-compatible cryptographic keys and enode URLs using ES6+ features and optimized performance.

## ✨ Features

- 🔑 Generate secp256k1 private/public key pairs (Ethereum compatible)
- 🏠 Generate Ethereum addresses from public keys
- 🌐 Create enode URLs for network connectivity
- 🚀 Modern TypeScript with arrow functions and latest ECMAScript features
- ⚡ Optimized performance with EC instance reuse and concurrent file operations
- 📦 Yarn-based dependency management
- 🛡️ Type-safe with comprehensive TypeScript types

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- Yarn package manager

### Installation

```bash
# Clone the repository
cd /path/to/pfm-web2.5

# Install dependencies
yarn install

# Build the project
yarn build
```

## 📖 Usage

### Development Mode (TypeScript)

```bash
# Generate basic keys
yarn dev createKeys ./output-directory

# Generate keys with enode URL
yarn dev createKeysAndEnode <ip> <port> ./output-directory
```

### Production Mode (Compiled JavaScript)

```bash
# Build first
yarn build

# Generate basic keys
yarn createKeys ./output-directory

# Generate keys with enode URL
yarn createKeysAndEnode 192.168.1.100 42007 ./output-directory
```

### Examples

```bash
# Create keys in a 'keys' directory
yarn dev createKeys ./keys

# Create keys with enode for IP 192.168.1.100 on port 42007
yarn dev createKeysAndEnode 192.168.1.100 42007 ./network-keys

# Production usage
yarn build
node dist/network/createKeys.js createKeys ./production-keys
```

## 📁 Output Files

The tool generates the following files in the specified directory:

- `key` - Private key (hex format)
- `pub` - Public key (hex format)  
- `address` - Ethereum address (hex format)
- `enode` - Enode URL (only when using createKeysAndEnode)

## 🏗️ Project Structure

```
network/
├── createKeys.ts     # Modern TypeScript source code
├── createKeys.mjs    # Original optimized JavaScript version
└── script.sh        # Shell script utilities

dist/                 # Compiled JavaScript output
package.json         # Yarn configuration
tsconfig.json        # TypeScript configuration
```

## 🔧 Scripts

- `yarn build` - Compile TypeScript to JavaScript
- `yarn dev <command>` - Run in development mode with tsx
- `yarn createKeys <dir>` - Build and run createKeys command
- `yarn createKeysAndEnode <ip> <port> <dir>` - Build and run createKeysAndEnode command
- `yarn clean` - Remove compiled output

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

- `elliptic` - Elliptic curve cryptography
- `keccak256` - Keccak hashing algorithm
- `typescript` - TypeScript compiler
- `tsx` - TypeScript execution for Node.js
- `@types/node` - Node.js type definitions

## 🔒 Cryptography

This tool uses the secp256k1 elliptic curve, the same cryptographic standard used by:

- Ethereum
- Bitcoin  
- Hyperledger Besu
- Most blockchain networks

Generated keys are compatible with standard Ethereum tooling and networks.
