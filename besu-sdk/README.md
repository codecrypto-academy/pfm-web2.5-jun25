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

The library is located in the `besu-sdk/` directory. This directory serves a dual purpose: it's a shared Node.js environment for other project scripts and the development home for this library.

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

### 4.2. Running Tests

The test command executes all unit and integration tests for the library.

*   **Command:**
    ```bash
    npm test
    ```
*   **Action:** Runs Jest, which discovers and executes all test files matching the `*.test.ts` pattern within the `src/` directory, as configured in `jest.config.js`.

For better organization, create a dedicated directory for your tests:

```bash
mkdir -p src/__tests__
```