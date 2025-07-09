# Besu SDK: Professional TypeScript SDK for Hyperledger Besu Networks

> Although the initial idea was to wrap modular Bash scripts with `child_process`, the original script was monolithic, offering no reuse value. Switching to Dockerode enables true cross-platform support, stable API interactions, and robust testing — all essential for building a professional SDK.

This TypeScript SDK provides a modern, type-safe API for managing local Hyperledger Besu networks using Clique (PoA) consensus. Built with Dockerode for direct Docker API interaction, it offers a professional, cross-platform solution that works seamlessly on Windows, macOS, and Linux.

The SDK serves as a programmatic alternative to `docker-compose`, specifically tailored for Besu blockchain networks. It enables complete automation of network creation, management, and teardown through a clean, robust, and fully testable codebase.

## 1. Overview

> **💡 Pro Tip**: For a deeper understanding of the SDK's design decisions and implementation details, consider reading through the scripts paying special attention to the lightbulb tips (💡) scattered throughout - they provide valuable insights into the technical choices and trade-offs that shaped this SDK.

The original project utilized a monolithic Bash script (`/script/script.sh`) to automate the deployment of private Hyperledger Besu networks using Docker. Its capabilities included:

*   Configuration via YAML files.
*   Generation of cryptographic keys and `genesis.json`.
*   Launching various node types (validators, bootnodes, RPC).
*   Running integration tests with `ethers.js`.
*   Support for PoA (Clique) consensus.
*   Real-time monitoring and an interactive post-deployment menu.

While effective for a PoC, Bash scripts present significant limitations in portability and professional deployment. This TypeScript library aims to solve these issues by offering:

*   **True Cross-Platform Support**: Native Windows, macOS, and Linux compatibility through Dockerode's direct API interaction.
*   **Professional Testing**: Full unit and integration test support with mockable Docker interactions.
*   **Type Safety**: Complete TypeScript coverage with strict typing for robust development.
*   **Modern API Design**: Fluent builder pattern, event-driven architecture, and predictable state management.

## 2. Core Design: Direct Docker API Integration

The SDK leverages **Dockerode** for direct interaction with the Docker daemon, providing a robust and cross-platform solution. This approach offers several advantages:

*   **Native API Access**: Direct communication with Docker's API ensures stability and feature completeness.
*   **Cross-Platform Compatibility**: Works identically on Windows, macOS, and Linux without shell script dependencies.
*   **Enhanced Error Handling**: Structured responses and typed errors replace fragile text parsing.
*   **Superior Testing**: Easy mocking of Docker operations for comprehensive unit tests.

**Architecture Highlights:**
*   The SDK encapsulates all Docker operations within a dedicated `DockerManager` service.
*   Network state is managed through a finite state machine (FSM) for predictable behavior.
*   All node operations are orchestrated through a central `Network` class that ensures consistency.

## 3. Getting Started

The library is located in the `besu-sdk/` directory. This directory serves a dual purpose: it's a shared Node.js environment for other project scripts in this repository and the development home for this library.

### 3.1. Installation

1.  Navigate to the library directory:
    ```bash
    cd besu-sdk/
    ```

2.  If `package.json` does not exist, initialize a new Node.js project:
    ```bash
    npm init -y
    ```

3.  Install all required dependencies. This command will install production dependencies like `dockerode`, `ethers` and development dependencies like `typescript`, `jest`, `ts-jest`, and their associated types.
    ```bash
    npm install
    ```
    > **Note for new contributors:** You only need to run `npm install` to set up the project. The SDK uses Dockerode for Docker interaction and ethers.js for blockchain operations.

### 3.2. First-Time Configuration

If you are setting up the project from scratch, run these commands to generate the necessary configuration files:

*   **TypeScript Configuration:** Creates `tsconfig.json`, which defines how your TypeScript code is compiled.
    ```bash
    npx tsc --init
    ```

*   **Jest Configuration:** Creates `jest.config.js`, configuring Jest to run tests written in TypeScript via `ts-jest`.
    ```bash
    npx ts-jest config:init
    ```

## 4. Development Workflow

Ensure your `package.json` contains the following scripts for building and testing the library:

```json
"scripts": {
  "build": "tsc",
  "test": "jest"
}
```

### 4.1. Building the Library

The build command compiles all TypeScript source files into JavaScript.

*   **Command:**
    ```bash
    npm run build
    ```
*   **Action:** Uses `tsconfig.json` to compile files from `src/` and outputs the resulting `.js` and `.d.ts` (declaration) files to the `dist/` directory.


### To be used at "frontback"

There's no mistery in this. The file is imported as 

### To be used somewhere else


# Besu Network Automation SDK

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)

A professional-grade, type-safe TypeScript library for programmatically creating, managing, and tearing down private Hyperledger Besu networks using Docker.

> **Pro Tip:** The source code is annotated with 💡 lightbulb emojis to highlight key architectural patterns and important implementation details.

## Core Features

-   **Fluent Builder API**: A chainable, declarative interface (`BesuNetworkBuilder`) for constructing complex network topologies with ease.
-   **Fine-Grained Control**: Configure over 20 distinct parameters, from `chainId` and `blockPeriodSeconds` to Docker image tags and network subnets.
-   **Deterministic Generation**: Provide an optional `identitySeed` to deterministically generate node keys and addresses, ensuring reproducible network states for testing.
-   **Robust Lifecycle Management**:
    -   Strict state machine using a `NetworkStatus` enum for nodes and the network.
    -   Built-in readiness probes (`waitForNodeReady`) to wait for RPC services to become available.
    -   Automated teardown and cleanup on startup failure to prevent orphaned containers.
    -   Emits operational events to allow for external monitoring.
-   **Advanced Networking**: Supports creating new Docker networks or attaching to pre-existing ones, with automatic subnet collision detection.
-   **Comprehensive Testing**: Includes a test suite with **136 test cases** built with Jest.

## Installation

### Local Development / Monorepo Integration

For use within this project or a similar monorepo structure, install it using a relative file path. This creates a symbolic link, allowing changes in the SDK to be immediately reflected in the consuming project.

From the consuming directory (e.g., `frontback/`):
```bash
npm install ../besu-sdk
```

This will add the following entry to your `package.json`:
```json
"dependencies": {
  "besu-sdk": "file:../besu-sdk"
}
```

### Peer Dependencies

This SDK does not bundle `ethers`. It must be provided by the host project to avoid version conflicts and reduce package size. Ensure your project's `package.json` includes `ethers`.

**`besu-sdk/package.json`:**
```json
"peerDependencies": {
  "ethers": "^6.7.0"
}
```