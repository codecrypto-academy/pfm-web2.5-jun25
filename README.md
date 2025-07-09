# Project: From Monolithic Script to Modular SDK — A Besu Network Deployment Journey

## Overview

This repository documents the evolution of a toolset for deploying and managing private Hyperledger Besu networks. It showcases a journey from a powerful, self-contained Bash script to a modular, reusable TypeScript SDK, culminating in a web-based user interface that interacts with the deployed blockchain.

The project is structured into three distinct but interconnected components:

1.  **`/script`**: A robust, configuration-driven Bash script for end-to-end network deployment. The origin and the workhorse.
2.  **`/besu-sdk`**: A professional-grade, type-safe TypeScript library that encapsulates the core logic of network management, designed for programmatic use. The evolution.
3.  **`/frontback`**: A Next.js web application that serves as a front-end to interact with the deployed network, demonstrating the integration of all pieces. The result.

---

## The Project Walkthrough: A Live Demonstration Guide

This guide outlines the step-by-step process to demonstrate the project's full capabilities, from deploying a blockchain from scratch to interacting with it via a web UI.

### **Step 1: The Monolithic Orchestrator (`/script`)**

We begin with the foundational tool: a single, powerful Bash script designed for maximum automation and transparency.

> **Pro Tip for Code Review:** The script is intentionally verbose for educational purposes. To understand its architecture, navigate the code by searching for the 🚩 emoji flag. Each flag marks a key decision or a critical execution checkpoint.

**Key Characteristics:**

*   **Configuration-Driven Automation**: Instead of hardcoding, all network parameters are defined in `script/config.yaml`. This file controls:
    *   Node topology (names, IPs, roles like `validator` or `bootnode`).
    *   Genesis block parameters (`chainId`, pre-funded accounts).
    *   Automated test transactions to execute upon successful deployment.
    *   The location of `ethers.js` dependencies (`../frontback/`).
    *   **Crucially, the output path for the RPC node's environment variables, which bridges the gap to the front-end.**
*   **Intelligent Deployment Logic**: The script automatically identifies bootnodes and launches them first, waiting for them to stabilize before starting other peers. This dramatically increases the reliability of network formation.
*   **Interactive Control & State Management**: Upon successful deployment, the script presents an interactive menu:
    1.  **Monitor**: Continue displaying new blocks in real-time.
    2.  **Stop & Preserve**: Halt the Docker containers but keep all generated node keys and configuration (`--no-cleanup` ready).
    3.  **Stop & Clean**: Tear down the entire network, including all generated files.
*   **Flags for Development**:
    *   `--no-cleanup`: Restarts the network using existing keys and blockchain data, ideal for DApp development workflows.
    *   `--debug`: Enables verbose logging for deep troubleshooting.

### **Step 2: The Evolution — A Modular SDK (`/besu-sdk`)**

Next, we present the evolution of this logic into a modern, reusable TypeScript library. This SDK is not a wrapper around shell commands; it re-implements the entire orchestration logic using `dockerode` for direct, programmatic control over the Docker daemon.

> **Pro Tip for Code Review:** The SDK's source code is annotated with 💡 lightbulb emojis to highlight key architectural patterns and important implementation details.

**Core Capabilities:**

*   **Fluent Builder API**: Chainable methods for declarative network construction (`new BesuNetworkBuilder().withChainId(..).withNode(..)`).
*   **Fine-Grained Control**: Over 20 configurable parameters, including support for attaching to pre-existing Docker networks.
*   **Deterministic Generation**: Use an `identitySeed` to generate the same node keys and addresses across multiple runs.
*   **Robust Lifecycle Management**: Emits operational events and uses a strict `NetworkStatus` enum to manage the state of the network and its nodes. It includes readiness probes (`waitForNodeReady`) and automated teardown on failure.
*   **Testing**: Includes a comprehensive test suite with **136 test cases** (`npm test`).

### **Step 3: The User Interface & Final Integration (`/frontback`)**

Finally, we demonstrate the `frontback` application, which ties everything together. It's a Next.js application built with React, TypeScript, and Tailwind CSS.

**The Integration Mechanism:**

1.  **RPC Connection**: The `script.sh` (from Step 1) is configured to generate an environment file (e.g., `.env`) inside the `/frontback` directory. This file contains the live RPC URL and the private key of a pre-funded node.
2.  **Shared Dependencies**: `frontback` is the official home for the `ethers` library. The `besu-sdk` declares `ethers` as a `peerDependency`, avoiding version conflicts and duplicate installations.
3.  **Local SDK Usage**: `frontback` installs the SDK via a local path: `npm install ../besu-sdk`. This creates a symlink in `node_modules`, meaning any changes made to the `besu-sdk` source code are immediately available in `frontback` after a rebuild, streamlining development.

---

### **The Complete Live Demo Workflow**

1.  **Terminal 1: Deploy the Network**
    ```bash
    cd script/
    ./script.sh
    ```
    *   Observe the real-time logs as the script generates keys, builds the genesis file, and launches the nodes.
    *   When the interactive menu appears, select **option [2] (Stop containers but preserve configuration)**. This leaves the network state and the crucial `.env` file in `frontback` ready for use.

2.  **Terminal 2: Launch the Frontend**
    ```bash
    cd frontback/
    npm install
    npm run dev
    ```
    *   The application will start, read the RPC URL from the environment file, and connect to the persistent blockchain network.

**Result:** You now have a live, private Hyperledger Besu network and a web interface connected to it, demonstrating a full end-to-end workflow from infrastructure deployment to user-facing application.

### Technology Stack

| Component     | Technologies                                           |
|---------------|--------------------------------------------------------|
| **`script`**  | Bash, Docker, `yq`, `jq`, Node.js (for transaction signing) |
| **`besu-sdk`**| TypeScript, Node.js, `dockerode`, Jest                   |
| **`frontback`**| Next.js, React, TypeScript, Tailwind CSS, Ethers.js    |