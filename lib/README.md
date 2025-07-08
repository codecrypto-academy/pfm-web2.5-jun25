# TypeScript Library for Besu Network Management

This library provides a robust, programmatic API for managing Hyperledger Besu private networks. It is designed to replace the initial Proof-of-Concept Bash script (`/script/script.sh`) with a more portable, maintainable, and integration-friendly solution.

## 1. Overview

The original project utilized a monolithic Bash script (`/script/script.sh`) to automate the deployment of private Hyperledger Besu networks using Docker. Its capabilities included:

*   Configuration via YAML files.
*   Generation of cryptographic keys and `genesis.json`.
*   Launching various node types (validators, bootnodes, RPC).
*   Running integration tests with `ethers.js`.
*   Support for PoA (Clique) consensus.
*   Real-time monitoring and an interactive post-deployment menu.

While effective for a PoC, Bash scripts present significant limitations in portability and professional deployment. This TypeScript library aims to solve these issues by offering:

*   **Abstraction**: Clean APIs to interact with the network, hiding the underlying shell command complexity.
*   **Portability**: Runs on any Node.js backend (Linux, macOS, Windows via WSL), eliminating OS-specific dependencies.
*   **Maintainability**: A codebase that is easier to test, document, and extend compared to shell scripts.

## 2. Core Design: Wrapping Shell Scripts

A key implementation strategy is to **avoid re-implementing all Docker and Besu logic in TypeScript**. We will not use low-level libraries like `dockerode`.

Instead, this library functions as a **wrapper around modularized Bash scripts**. The complex logic from the original `script.sh` will be broken down into smaller, single-purpose scripts. The TypeScript functions will then execute these scripts.

**Example:**
*   A TypeScript function `network.addNode()` will internally call an `add-node.sh` script.

This approach dramatically reduces complexity, leverages existing logic, and focuses the TypeScript library on providing a clean, high-level API.

## 3. Getting Started

The library is located in the `lib/shared/` directory. This directory serves a dual purpose: it's a shared Node.js environment for other project scripts and the development home for this library.

### 3.1. Installation

1.  Navigate to the library directory:
    ```bash
    cd lib/shared/
    ```

2.  If `package.json` does not exist, initialize a new Node.js project:
    ```bash
    npm init -y
    ```

3.  Install all required dependencies. This command will install production dependencies like `ethers` and development dependencies like `typescript`, `jest`, `ts-jest`, and their associated types.
    ```bash
    npm install
    ```
    > **Note for new contributors:** You only need to run `npm install` to set up the project.

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