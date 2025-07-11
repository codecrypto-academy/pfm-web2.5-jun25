# Besu SDK: Professional TypeScript SDK for Hyperledger Besu Networks

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)

> Although the initial idea was to wrap modular Bash scripts with `child_process`, the original script was monolithic, offering no reuse value. Switching to Dockerode enables true cross-platform support, stable API interactions, and robust testing — all essential for building a professional SDK.
>
> 💡 **Pro Tip:** The source code is annotated with lightbulb emojis (💡) to highlight key architectural patterns and important implementation details.

This TypeScript SDK provides a modern, type-safe API for managing local Hyperledger Besu networks using Clique (PoA) consensus. Built with Dockerode for direct Docker API interaction, it offers a professional, cross-platform solution that works seamlessly on Windows, macOS, and Linux.

The SDK serves as a programmatic alternative to `docker-compose`, specifically tailored for Besu blockchain networks. It enables complete automation of network creation, management, and teardown through a clean, robust, and fully testable codebase.

## 1. Core Features

-   **Fluent Builder API**: A chainable, declarative interface (`BesuNetworkBuilder`) for constructing complex network topologies with ease.
-   **Fine-Grained Control**: Configure over 20 distinct parameters, from `chainId` and `blockPeriodSeconds` to Docker image tags and network subnets.
-   **Deterministic Generation**: Provide an optional `identitySeed` to deterministically generate node keys and addresses, ensuring reproducible network states for testing.
    > WARNING: Never use predictable seeds or reuse seeds in production environments.
-   **Robust Lifecycle Management**:
    -   Strict state machine using a `NetworkStatus` enum for nodes and the network.
    -   Built-in readiness probes (`waitForNodeReady`) to wait for RPC services to become available.
    -   Automated teardown and cleanup on startup failure to prevent orphaned containers.
    -   Emits operational events to allow for external monitoring.
-   **Advanced Networking**: Supports creating new Docker networks or attaching to pre-existing ones, with automatic subnet collision detection.
-   **Comprehensive Testing**: Includes a test suite with **136 test cases** built with Jest.

## 2. Architectural Concepts and Design Decisions

### 2.1. Direct Docker API Integration with Dockerode
The SDK leverages **Dockerode** for direct interaction with the Docker daemon. This approach offers several advantages over wrapping shell scripts:
*   **Native API Access**: Direct communication with Docker's API ensures stability and feature completeness.
*   **Cross-Platform Compatibility**: Works identically on Windows, macOS, and Linux without shell script dependencies.
*   **Enhanced Error Handling**: Structured responses and typed errors replace fragile text parsing.
*   **Superior Testing**: Easy mocking of Docker operations for comprehensive unit tests.

### 2.2. The "One Network, One Blockchain" Principle
The SDK is designed on a strict "one network, one blockchain" principle.
A `Network` instance must manage only ONE blockchain (a single `chainId`).
Running multiple `chainId`s on one Docker network is a critical anti-pattern that breaks peer discovery. To manage multiple blockchains, create separate `Network` instances; the SDK will correctly isolate them and prevent subnet collisions.

### 2.3. NetworkBuilder vs. Network
The SDK distinguishes between configuration-time and run-time operations:
-   **`BesuNetworkBuilder`**: Used to define the network's properties *before* it's created (e.g., `withChainId`, `withNode`). It also includes the `SystemValidator`.
-   **`Network`**: Represents an active, running network. Its methods are for interacting with the network *after* it has been built (e.g., `addNode`, `getNode`).

### 2.4. The Role of SystemValidator
You might see the `SystemValidator` in the `NetworkBuilder` and think it's unnecessary. However, it acts as a pre-flight check to ensure the host system is ready (Docker is running, etc.). Skipping it doesn't cause a direct error, but it exposes you to hard-to-diagnose failures if the underlying environment isn't configured correctly. Think of it as a pilot's checklist before takeoff.

### 2.5. Node Management and Encapsulation
Nodes are managed exclusively through the `Network` instance. You never create a `BesuNode` directly. This ensures that all nodes are correctly associated with a network and its lifecycle.

### 2.6. BesuNode vs. Network: Who Does What?
-   **`BesuNode` is selfish**: It only cares about itself. Each `BesuNode` instance that is RPC-enabled has its own unique `rpcUrl`. When you call `myRpcNode.getRpcProvider()`, it creates an `ethers.JsonRpcProvider` that points *only* to that node's URL. It knows nothing about other nodes.
-   **`Network` is the orchestra conductor**: It knows about all the nodes. The `network.getProvider()` method gives you a provider to interact with the network, typically by picking a healthy RPC node.

### 2.7. Understanding RPC, JSON-RPC, and Ethers.js
-   When you start a Besu node with RPC enabled, it starts an HTTP web server waiting for requests in the **JSON-RPC 2.0** format.
-   You could use a generic HTTP client like `curl` to send these JSON-RPC requests manually.
-   **`ethers.js`** is a specialized client library. Instead of using `curl`, it uses native JavaScript HTTP capabilities to create a `provider` object (`ethers.JsonRpcProvider(rpcNodeUrl)`). This provider abstracts away the raw `curl` commands, giving you pre-defined methods to interact with the node.

### 2.8. Naming Conventions and Defaults
-   **Container Name**: `besu-[network.name]-[node.name]`
-   **Network Name**: If no name is provided, a default one is generated: `besu-network-<timestamp>`

### 2.9. Data Directory Management
For better organization, you can specify an external data directory using `withDataDirectory(dir: string)`. This keeps generated node keys and blockchain data outside your project directory.
```typescript
const builder = new BesuNetworkBuilder()
  .withDataDirectory('../sdk-testnets'); // Recommended
```

### 2.10. How `validateChainIdUnique` Works
This function does **not** check against running Docker containers. Instead, it validates that the `chainId` is unique among all networks managed by the SDK that have their configuration persisted on the file system.

## 3. Installation and Usage

### 3.1. Installation
This SDK is designed for local use within this monorepo. Install it from a consuming project (e.g., `frontback/`) using a relative path. This creates a symlink, so changes in the SDK are immediately available.
```bash
# From the consuming directory (e.g., frontback/)
npm install ../besu-sdk
```

### 3.2. Peer Dependencies
This SDK does not bundle `ethers`. It must be provided by the host project. Ensure your project's `package.json` includes `ethers` as a dependency.

## 4. Development Workflow

### 4.1. Building
To compile TypeScript source files into JavaScript, run:
```bash
npm run build
```

### 4.2. Reflecting Changes in Other Projects
When you make a change in `besu-sdk` and want it to be effective in another project that uses it (like `frontback`), you must follow these steps:
```bash
# 1. Navigate to the SDK directory and rebuild it
cd ../besu-sdk
npm run build

# 2. Navigate to the consuming project and reinstall the dependency
cd ../frontback
npm install # This updates the symlinked package with the new build
```

### 4.3. Testing
The project includes scripts for running unit and end-to-end tests.

-   `npm test`: Runs ALL tests in `src/` (including `unit/` and `e2e/`).
-   `npm run test:unit`: Runs only tests in `src/__tests__/unit/`.

You may need to add these scripts to your `package.json`:
```json
"scripts": {
  "build": "tsc",
  "test": "jest",
}
```