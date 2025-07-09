# Hyperledger Besu Private Network Automation Tool

![Besu Version](https://img.shields.io/badge/Hyperledger%20Besu-latest-blue.svg)
![Shell Script](https://img.shields.io/badge/Script-Bash-lightgrey.svg)
![Docker](https://img.shields.io/badge/Docker-Required-blue.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)

> ⚠ **WSL Note:** If the script freezes at `Verifying npm installation...`, it's likely because the current directory was deleted or renamed from Windows.
> 💡 To fix it, run `cd ~` and then `cd /mnt/c/.../your-project` to refresh WSL’s working directory state.
> This resolves internal `npm` errors like `uv_cwd` caused by broken path references in cross-platform filesystems.


## 📜 Table of Contents

1.  [General Description](#-general-description)
2.  [Prerequisites](#-prerequisites)
    *   [Installing "ethers"](#installing-ethers)
    *   [Using in Other Environments](#using-in-other-environments)
3.  [Quick Start](#-quick-start)
4.  [How it Works: The Execution Flow](#-how-it-works-the-execution-flow)
5.  [Execution Options](#-execution-options)
    *   [Normal Mode (with Cleanup)](#normal-mode-with-cleanup)
    *   [Persistence Mode (`--no-cleanup`)](#persistence-mode---no-cleanup)
6.  [Common Workflows](#-common-workflows)
7.  [Configuration File Analysis (`config.yaml`)](#-configuration-file-analysis-configyaml)
8.  [Internal Design Decisions](#-internal-design-decisions)
9.  [Common Errors & Troubleshooting](#-common-errors--troubleshooting)

## Overview

This directory contains a bash script (`script.sh`) that deploys a private Hyperledger Besu network from scratch using Docker. It automates the creation of containers, the startup of multiple Besu nodes, and the execution of test transactions to validate the network’s operation, all based on the configuration defined in `config.yaml`, without needing to directly edit the script code.

> **🚩 Pro tip:** While this script is large and includes debug-focused overhead, 🚩 flags throughout the code mark key architectural decisions and implementation checkpoints (searchable via `CTRL+F`). It also provides real-time async feedback through color-coded logs like "(🔷 \$1)", a purposeful feature that enhances visibility during node setup. For production, use the modular `besu-sdk/` for greater clarity and maintainability.
>
> **The primary goal of this script is not for you to understand its internal logic line-by-line, but rather to execute it and observe its output. This provides a detailed, real-time understanding of what happens "under the hood" when setting up a PoA blockchain.**


## ⚙️ Prerequisites

To run the script correctly, you must have the following installed:

*   **Node.js** and **npm** – used to sign transactions via JavaScript scripts.
*   **Docker** – to run the blockchain network nodes. Ensure the Docker daemon is running before executing the script.
*   **`jq` & `yq`** – Command-line tools for processing JSON and YAML, respectively. The script needs them to parse `config.yaml` and node responses.
    *   If they are not found, the script will offer to install them for you.
*   **WSL2** – Required if you're working from Windows.
    > **⚠️ WSL2 Warning**: Occasionally, WSL2 can experience file system synchronization issues between Windows and Linux. This may cause strange errors, like `npm` not detecting a newly installed package. The script includes a workaround to "refresh" the file system state, but if you encounter persistent issues, restarting the terminal or WSL itself (`wsl --shutdown`) usually resolves them.

### Installing "ethers"

During its testing phase, the script uses Node.js libraries (`ethers.js`) to sign transactions. To install it:

```bash
# From the project root
cd besu-sdk/
npm install ethers  # to avoid installing other libs (used for next blocks) via `npm install`
cd ../script
```

> **Why `besu-sdk/`?** This folder already contains a separate Next.js app, but it's **not** used in these tests. We just reuse its `node_modules` to avoid duplicate installs. If you're only running the Bash script, you can ignore all Next.js files—both parts of the repo are independent.
>
> The script reads the path to these dependencies from **`config.yaml`** (`tx_signer_deps_dir`). The default is `../besu-sdk/`, but you can change it if your directory layout differs. See the next section for details.

#### Using in Other Environments

If you plan to reuse this script in a different project or folder structure, you’ll need to install the required dependencies in the new location and update the corresponding path in `config.yaml`.

1.  **Install the dependencies in the desired directory:**
    ```bash
    # Suppose you're in 'script/' and will use '../backend' as the target
    npm init -y         
    npm install ethers  # generates node_modules and package-lock.json
    ```

2.  **Update the `config.yaml` file accordingly:**
    ```yaml
    tx_signer_deps_dir: "../backend"
    ```

> This value should point to the directory where the Node.js dependencies (e.g., `ethers`) are installed. Note that the path is **relative to the location of the `config.yaml` file itself**, not to where the script is executed from. The script then resolves it to an absolute path to ensure consistent behavior.

## 🚀 Quick Start

1.  **Ensure all prerequisites are met** (Docker is running, Node.js is installed, etc.).
2.  **Install Node.js dependencies** as described above.
3.  **Customize `config.yaml`** to define your desired network topology (node count, roles, etc.).
4.  **Run the script**:
    ```bash
    ./script.sh
    ```
    Upon completion, the script will present an **interactive menu** with three options:
    - **[1]** Continue monitoring blocks in real-time
    - **[2]** Stop containers but preserve configuration (for later `--no-cleanup` restart)
    - **[3]** Stop the network completely and clean up everything

## 🛠️ How it Works: The Execution Flow

The script follows a well-defined operational flow to ensure a clean and predictable deployment.

1.  **Phase 1: Cleanup (if not using `--no-cleanup`)**
    *   Stops and removes any Docker containers tagged with the project label (`project=besu-net`).
    *   Removes the project's Docker network to prevent IP conflicts.
    *   Deletes the `nodes/` directory, which contains all keys, addresses, and configuration files from previous runs.

2.  **Phase 2: Creation and Configuration**
    *   **Docker Network**: Creates a new `bridge` Docker network with the IP subnet defined in `config.yaml`.
    *   **Node Identities**: For each node defined in `config.yaml`, it runs an ephemeral Besu container to generate its key pair (private and public) and Ethereum address. These files are stored in `nodes/<node-name>/`. During this process, you'll see async status messages like "(🔷 $1)" showing each node's generation progress in real-time.
    *   **Genesis File**: Constructs the `genesis.json` file. It reads the `chainId`, validators (nodes with the `validator` role), and pre-funded accounts (`alloc`) from `config.yaml` to create the blockchain's initial state.
    *   **Node Configuration**: Generates a `config.toml` file for each node. This file tells the node how to start, which bootnodes to connect to, whether to enable RPC, whether to mine blocks, etc.

3.  **Phase 3: Deployment and Startup**
    *   **Staggered Launch**: The script intelligently launches the nodes.
        1.  First, it starts the **bootnodes**.
        2.  It then waits a few seconds for them to stabilize.
        3.  Finally, it starts the remaining nodes, which will use the bootnodes for peer discovery and synchronization.
    *   This staggered approach drastically increases the reliability of P2P network formation.

4.  **Phase 4: Verification and Testing**
    *   The script runs a suite of automated tests to validate that the network is operating as expected:
        *   **RPC Availability**: Confirms that nodes can be communicated with.
        *   **P2P Connectivity**: Verifies that nodes have connected to each other.
        *   **Block Production**: Waits for at least one new block to be mined.
        *   **Transactions**: If `testTransactions` are configured, it signs and sends transactions to the network and awaits their confirmation.

5.  **Phase 5: Interactive Menu & Monitoring**
    *   Once everything is deployed and verified, the script presents an **interactive menu** with three options:
        1.  **[1] Continue and monitor blocks in real-time** - Enters passive monitoring mode, displaying each new block as it's created. You can stop with `CTRL+C`.
        2.  **[2] Stop containers but preserve configuration** - Stops all Docker containers but keeps the `nodes/` directory, `genesis.json`, and Docker network intact. Perfect for development workflows where you want to pause and resume later using `--no-cleanup`.
        3.  **[3] Stop the network completely** - Performs full cleanup: stops containers, removes Docker network, and deletes all generated files.
    *   This flexible approach allows you to choose the appropriate cleanup level based on your needs.

## ⚙️ Execution Options

The script's behavior changes fundamentally based on the `--no-cleanup` flag.

### Normal Mode (with Cleanup)

This is the default mode (`./script.sh`).

*   **On Start**: It completely destroys any remnants of a previous run (containers, Docker network, `nodes/` directory). It creates a **brand new network from scratch**, with new keys and a fresh initial state.
*   **On Completion**: Presents an interactive menu with three exit options:
    - **[1]** Continue monitoring blocks (exit with `CTRL+C` triggers full cleanup)
    - **[2]** Stop containers but preserve configuration for future `--no-cleanup` runs
    - **[3]** Stop and clean up everything immediately
*   **Emergency Exit** (via `CTRL+C` during monitoring): A cleanup process (`trap`) is triggered, which stops the containers and removes the Docker network and the `nodes/` directory. The system is left clean.

**When to use it**: When you want a fresh start, need to test a new genesis configuration, or want to ensure no residual state interferes.

### Persistence Mode (`--no-cleanup`)

Activated with `./script.sh --no-cleanup`.

*   **On Start**: It **does not** delete the `nodes/` directory or the Docker network. If they exist from a previous run, it reuses them. If they don't exist (first time running `--no-cleanup`), the script gracefully ignores the flag, logs a message, and proceeds with normal mode to create everything from scratch.
*   **During Execution**: It simply stops and removes old containers and launches new ones using the existing keys, addresses, and `genesis.json` already on disk.
*   **On Exit**: When using the interactive menu option **[2]**, it stops the containers but **leaves the `nodes/` directory and the Docker network intact** for future `--no-cleanup` runs.

**When to use it**: 
- **Development Workflow**: After using option **[2]** to pause your network, restart it later with `--no-cleanup` to continue with the same blockchain state.
- **Testing**: When you want to restart nodes without losing blockchain history or node identities.
- **DApp Development**: Apply changes to your application code and test against a persistent network state.

> **💡 Smart Behavior**: If you run `./script.sh --no-cleanup` but no previous configuration exists, the script automatically detects this and creates everything from scratch (same as normal mode), ensuring a smooth experience regardless of whether you have prior state or not.

## 🔄 Common Workflows

Understanding when to use each option helps optimize your development process:

### 🆕 Fresh Start Workflow
```bash
./script.sh                    # Creates everything from scratch
# Choose option [3] to clean up completely when done
```
**Use when**: First time setup, testing configuration changes, or ensuring a completely clean state.

### 🔧 Development Workflow (Pause & Resume)
```bash
./script.sh                    # Initial setup
# Choose option [2] to preserve configuration

# Later, resume with existing state:
./script.sh --no-cleanup      # Restart with same keys/blockchain
# Choose option [2] again to pause, or [3] to clean up completely
```
**Use when**: Developing DApps, testing against persistent blockchain state, or working across multiple sessions.

### 🔄 Quick Restart Workflow
```bash
./script.sh --no-cleanup      # If previous state exists, reuse it
                               # If no previous state, creates from scratch
```
**Use when**: You want to restart quickly, regardless of whether previous state exists.

### ⚡ Testing Workflow
```bash
./script.sh                    # Setup
# Choose option [1] to monitor and test live
# Use Ctrl+C to stop with full cleanup
```
**Use when**: Running automated tests, demos, or one-time validations.

## 📄 Configuration File Analysis (`config.yaml`)

This file is the brain of the tool. Each section is described below.

<details>
<summary>Click to see a complete example of <code>config.yaml</code></summary>

```yaml
# ======================================================
# 🌐 HYPERLEDGER BESU - PRIVATE NETWORK CONFIGURATION 🌐
# ======================================================

# Blockchain and consensus parameters
blockchain:
  chainId: 123999
  blockPeriodSeconds: 15
  epochLength: 30000

consensus:
  type: "clique" # Currently, only Clique (PoA) is supported

# Docker network configuration
network:
  name: "besu-network"
  subnet: "172.24.0.0/16"
  label: "project=besu-net"

# Besu Docker image configuration
docker:
  image: "hyperledger/besu:latest"
  user_permissions: true

# Definition of the network's nodes
nodes:
  # ⚠️ Be careful: setting N validators to 2 makes synchronization extremely difficult.
  # The nodes have trouble agreeing on block timing, which can lead to unstable behavior.
  
  # MULTI-ROLE NODE: Bootnode + Validator/Signer + RPC
  - name: "rpc-validator-bootnode-0"
    ip: "172.24.0.11"
    roles: ["validator", "bootnode", "rpc"]
    rpc_mapping: "9999:8545"
    rpc_alias: "primary"
    prefunding: 2500 # ETH amount

  # REGULAR NODES: Just replicate the blockchain
  - name: "data-replica-1"
    ip: "172.24.0.12"
    roles: []
    prefunding: 300
    
# External accounts to pre-fund in the genesis block
alloc:
  - address: "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B"
    prefunding: "1000000000000000000000" # 1000 ETH in Wei

# Path to Node.js dependencies for signing transactions
tx_signer_deps_dir: "../frontback/"

# Test transactions to validate the network
testTransactions:
  - from_node: "rpc-validator-bootnode-0"
    to: "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B"
    value_ether: 1.5
    gas: "21000"
    rpc_endpoint: "primary" # Directs this tx to the node with the "primary" alias
```
</details>

*   **`blockchain`**: Defines protocol-level parameters.
    *   `chainId`: Unique identifier for your network.
    *   `blockPeriodSeconds`: Target time between blocks. `15` is a balanced value.

*   **`nodes`**: The list of nodes that will make up the network.
    *   `roles`: A list defining the node's function.
        *   `validator`: The node is an authorized authority to create (mine) blocks. Its address will be included in the genesis `extraData`.
        *   `bootnode`: The node acts as a discovery meeting point for other nodes.
        *   `rpc`: The node exposes an RPC port to the host machine for external interaction (e.g., with MetaMask or a DApp).
    *   `rpc_alias`: An alias for this RPC endpoint, used in `testTransactions` to direct a transaction to a specific node.
    *   `prefunding`: Amount of ETH to be allocated to this node's address in the genesis block.

*   **`alloc`**: Allows pre-funding external accounts (that are not nodes) in the genesis block.
    *   `prefunding`: The amount in **Wei** (not Ether). `1 ETH = 10^18 Wei`.

*   **`testTransactions`**: Defines one or more transactions for the script to execute automatically to validate the network.
    *   `from_node`: The name of a node with the `rpc` role that will sign and send the transaction.
    *   `rpc_endpoint`: The `rpc_alias` of the node that should process this transaction.

## 🧠 Internal Design Decisions

The script makes certain decisions to improve robustness and usability. It's helpful to know them:

*   **Staggered Node Launch**: As mentioned, the script doesn't launch all nodes at once. It starts `bootnodes` first and gives them time to initialize before launching the rest. This prevents race conditions where peer nodes try to connect to a bootnode that isn't fully ready.

*   **Controlled RPC Endpoint Selection**: The script doesn't pick an RPC endpoint randomly. The `rpc_endpoint` key in `testTransactions` allows you to specify exactly which node (via its `rpc_alias`) should be used to send a transaction. This provides full control over the testing flow.

*   **Automatic Address Checksumming**: The `ethers.js` library is very strict and requires Ethereum addresses to use the EIP-55 "checksum" format (a mix of uppercase and lowercase letters). To prevent errors, the script **automatically formats any address** you provide in `config.yaml` to the correct format before using it, making the process more robust.

## 🚑 Common Errors & Troubleshooting

*   **The network stalls (stops producing blocks) with only 2 validators.**
    *   **Symptom**: Blocks are produced for a while, then stop.
    *   **Cause**: The Clique (PoA) consensus requires a majority of `floor(N/2) + 1` validators to sign a block. With `N=2`, the majority is `floor(2/2) + 1 = 2`. This means **both** validators must be perfectly synchronized and vote in time. Any minimal network latency can cause one validator not to receive the other's signature in time, stalling consensus.
    *   **Solution**: Always use an odd number of validators, and preferably 3 or more (`N=1`, `N=3`, `N=5`...). With `N=3`, the majority is 2, so the network can tolerate one validator being temporarily disconnected.

*   **"Invalid address checksum" error.**
    *   **Symptom**: The script fails while signing or sending a transaction.
    *   **Cause**: An address in `config.yaml` has an incorrect case-sensitive format.
    *   **Solution**: Although the script attempts to fix this automatically, the best practice is to use correctly checksummed addresses. You can use an explorer like Etherscan to find the correct checksum format for any address.

*   **Permission errors in the `nodes/` directory.**
    *   **Symptom**: The script fails when trying to delete the `nodes/` directory or create files within it.
    *   **Cause**: The files inside `nodes/` are created by a Docker container. If the script is not run with user permissions (`--user $(id -u):$(id -g)`), these files may be owned by the `root` user on the host system, and your regular user won't have permission to delete them.
    *   **Solution**: The script already includes the logic to use the current user's permissions (enabled by `user_permissions: true` in `config.yaml`). If it still fails, the script will attempt to use a Docker container to force the deletion. As a last resort, you can delete it manually with `sudo rm -rf nodes/`.

*   **"Cannot connect to the Docker daemon" error.**
    *   **Symptom**: The script fails at the beginning with a message about the Docker daemon.
    *   **Cause**: The Docker service is not running on your machine.
    *   **Solution**: Start Docker Desktop (on Mac/Windows) or the `dockerd` service (on Linux) with `sudo systemctl start docker`.