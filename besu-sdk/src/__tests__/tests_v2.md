## E2E Test Files (`e2e/*.test.ts`)

### 1. `e2e/e2e.basic.test.ts` (The Super Easy Test)

**Purpose:** Verify the most basic end-to-end network creation and interaction.
**Scope:** `createTestNetwork` function.
*   **Covers:** `createTestNetwork(1, 1)` happy path (status `RUNNING`, node counts, `ethers.js` functional, `getBlockNumber()` works).
*   **Covers:** `validatorCount = 0` / `(0, 1)` throws `ConfigurationValidationError`.
*   **Covers:** `DEFAULTS.rpcPort + i` are expected and unique (verified implicitly by RPC provider function and explicitly by `NetworkBuilder` if not overridden).
*   **Covers:** `teardown()` completes.
*   **Confirms Principles:** This is the "super easy, no-arguments, zero-advanced-features" script that covers end-to-end elements in the most straightforward way.

### 2. `e2e/e2e.network-lifecycle.test.ts`

**Purpose:** Test the full lifecycle of a network, including dynamic node addition and removal.
**Scope:** `Network` class methods (`setup`, `addNode`, `removeNode`, `teardown`, getters) and `NetworkBuilder`.
*   **Setup/Teardown:** Uses `beforeAll`/`afterAll` for efficiency.
*   **Covers:**
    *   Initial Network State: `status = RUNNING`, correct `getNodes()`, `getValidators()`, `getProvider()` functional.
    *   `setup()`: Happy path, Docker network created, `genesis.json` generated and valid (structure, `chainId`, `extraData`, `alloc`).
    *   `addNode()`: Adding basic, RPC, and validator nodes; all become `RUNNING`.
    *   `addNode()` with `initialBalance`: Verify node's address is funded correctly with specified balance (e.g., "5.5" ETH).
    *   `removeNode()`: Removing non-validator and RPC nodes successfully.
    *   `removeNode()`: `LastValidatorRemovalError` if removing the last validator.
    *   `teardown()`: Complete cleanup of Docker resources, data persists if `removeData = false`.

### 3. `e2e/e2e.network-persistence-adoption.test.ts`

**Purpose:** Test network persistence (not deleting data) and subsequent adoption.
**Scope:** `NetworkBuilder.build()` (network name matching and `adoptNetwork`), `Network.teardown(false)`.
*   **Covers:**
    *   Phase 1: Create network, then `network.teardown(false)` to leave data (`network.json`, keys) on disk.
    *   Phase 2: Create a *new* `NetworkBuilder` instance, then `build()` with the same `networkName` (without specifying `subnet` or node details).
    *   **Expected:** `NetworkBuilder` adopts the existing network metadata from `network.json`, rebuilds Docker resources, and starts nodes. The adopted network is `RUNNING` and functional.
    *   **Covers:** Verifying adopted network's `chainId`, `subnet`, and node configs match original.
    *   **Covers (Edge Case):** If `teardown(true)` was used, adoption should fail (`NetworkNotFoundError`).

### 4. `e2e/e2e.network-failure-scenarios.test.ts`

**Purpose:** Test how the SDK handles various operational failures, especially around Docker and invalid configurations.
**Scope:** `NetworkBuilder.build()`, `Network` methods, `BesuNode` methods when Docker errors occur.
*   **Setup/Teardown:** `beforeEach`/`afterEach` for isolation.
*   **Covers:**
    *   **Docker Daemon Unavailable:** Attempt `NetworkBuilder.build()` with Docker stopped throws `DockerNotAvailableError`. (Covers `SystemValidator.checkPrerequisites` failure).
    *   **Insufficient System Resources:** (Simulated, or real if env configured) `NetworkBuilder.build()` throws `InsufficientResourcesError`.
    *   **ChainId Conflict:** Create network A, `teardown(false)`, then attempt to create network B with same `chainId` but different name; throws `ChainIdConflictError`. (Covers `validateChainIdUnique`).
    *   **Subnet Conflict:** Create network A, then attempt to create network B with same `subnet`; throws `SubnetConflictError`. (Covers `getExistingSubnets`).
    *   **Port in Use:** Create two networks attempting to use the same RPC port; the second fails with `DockerOperationError`.
    *   **Node Fails to Start:** Simulating a node failing to start (e.g., container not running after start command, or `waitForNodeReady` timeout); `Network.setup()` goes to `ERROR` and attempts cleanup.
    *   **Invalid State Operations:** `network.setup()` on `RUNNING` network, `network.addNode()` on `STOPPED` network, `network.teardown()` on `UNINITIALIZED` network; all throw `InvalidNetworkStateError`.
    *   **`addNode()` with invalid parameters:** Duplicate node name/IP, IP outside subnet; throws relevant `ConfigurationValidationError` or `DuplicateNodeNameError`/`IPAddressConflictError`.
    *   **Contenedor se detiene inesperadamente:** Subsequent interaction (e.g., `getEnodeUrl()`) with that node should fail appropriately.
    *   **Puertos privilegiados sin permisos:** If Docker denies binding, `DockerOperationError`.

### 5. `e2e/e2e.advanced-network-config.test.ts`

**Purpose:** Test various `NetworkBuilder` configurations beyond defaults.
**Scope:** `NetworkBuilder` methods (`withChainId`, `withBlockPeriod`, `withSubnet`, `withDataDirectory`, `addValidator`, `addNode`, `addRpcNode` options).
*   **Setup/Teardown:** `beforeEach`/`afterEach` for isolation.
*   **Covers:**
    *   **`autoStart` Argument:** `builder.build(false)` returns `UNINITIALIZED` network, requiring manual `setup()`. Confirms default `builder.build()` behavior (autostarts).
    *   **Custom ChainId and Block Period:** Network starts, `getConfig()` matches, `genesis.json` content reflects.
    *   **Custom Subnet:** Network starts, nodes get IPs in range, Docker network uses specified subnet.
    *   **Nodes with `identitySeed`:** Identical `identitySeed` yields identical keys/addresses; different `identitySeed` yields unique.
    *   **Network with only Validators (acting as RPC):** `addValidator` with `rpc: true`; `getRpcNode()` returns validator; provider works.
    *   **Custom Data Directory:** Data written to specified path; cleanup works.
    *   **Node `initialBalance` parsing:** Correctly funds node for integer, decimal, and large values. Handles invalid formats (warns, uses default).

### 1. `unit/unit.network-builder.test.ts`

**Purpose:** Test `NetworkBuilder`'s configuration methods, internal state, and validations.
**Scope:** `NetworkBuilder` class.
*   **Mocks:** `SystemValidator`, `DockerManager`, `FileManager`, `Network` constructor (for isolation).
*   **Covers:**
    *   **`withX` methods:** Happy path, and `ConfigurationValidationError` for all invalid inputs (`0`, negative, float, `NaN`, empty string, regex fails, length, public IP range for subnet).
    *   **`addXNode` methods:** Happy path. `ConfigurationValidationError` for duplicate name/IP, invalid name/IP format, `rpcPort` without `rpc:true`, out-of-range ports.
    *   **IPs problematic specific:** Direct tests for network/broadcast addresses (`172.20.0.0`, `172.20.0.255` for `/24`), and IP out of subnet (`172.21.0.10` for `172.20.0.0/16`) throw `ConfigurationValidationError`. **`IP del gateway` (e.g., `172.20.0.1`): Covered by allowing it if it's a valid host IP within the subnet; if a specific warning/rejection is intended, it would be added here.**
    *   **`build()` logic:** Calls to `validateNetworkConfig`, `checkPrerequisites`, `createNetwork`/`adoptNetwork`. Correct `Network` instance returned.
    *   **`build()` validations:** `ConfigurationValidationError` for missing `chainId`, `blockPeriodSeconds`, `subnet`, `nodes`. Explicitly `ConfigurationValidationError` for "no validators".
    *   **`validateChainIdUnique` mock:** Mocked `FileManager` to simulate existing `network.json` and trigger `ChainIdConflictError` or no error. Handles corrupt metadata by logging warn.
    *   **`getExistingSubnets` mock:** Mocked `DockerManager` to trigger `SubnetConflictError` or no error.
    *   **`autoStart` argument:** Verifies `network.setup()` is/isn't called based on `autoStart`.
    *   **`networkName` not specified:** Verify auto-generated name.
    *   **`clone()`:** Deep copy verification (modifying clone doesn't affect original).
    *   **`reset()`:** Verifies builder state is reset.
    *   **`getConfig()`:** Verifies it reflects builder state accurately.

### 2. `unit/unit.network.test.ts`

**Purpose:** Test `Network`'s internal logic, `EventEmitter`, and auxiliary functions, with extensive mocking.
**Scope:** `Network` class methods that don't necessarily require full Docker interaction for their core logic.
*   **Mocks:** `DockerManager`, `FileManager`, `BesuNode` constructor and methods, `ethers.JsonRpcProvider`, `key-generator`, `logger`.
*   **Covers:**
    *   **Getters:** Return correct config/status based on mocked internal state. `getNode` throws `NodeNotFoundError`. `getRpcNode()`/`getProvider()` return `null` if no RPC nodes.
    *   **`generateGenesis()`:** Verifies `writeNodeKeys` calls, and generated `genesis.json` structure (e.g., `extraData`, `alloc`, correct hex-encoded balances, default balance usage).
    *   **`createAndStartNode()`:** Verifies `BesuNode` instantiation with correct parameters, `node.start()` call, node added to internal maps. Correct `bootnodes` passing (handles `enodeUrl` warning from `BesuNode`).
    *   **`startBlockMonitoring()` / `stopBlockMonitoring()`:** Verifies `provider.on`/`removeAllListeners` calls. Emits `new-block` event with correct data when mock provider triggers.
    *   **`saveNetworkMetadata()`:** Verifies `FileManager.writeJSON` call with correct `network.json` structure.
    *   **`logNetworkInfo()`:** Verifies `logger` output.
    *   **`validateState()`:** Throws `InvalidNetworkStateError` for forbidden state transitions (e.g., `setup()` from `RUNNING`).
    *   **`setStatus()`:** Verifies internal state update and `status-change` event emission (`from`, `to`, `timestamp`).
    *   **`addNode()` funding failures:** Mock `sendTransaction` or `tx.wait` failing, verify `logger.warn` and node still added (unfunded).

### 3. `unit/unit.besu-node.test.ts`

**Purpose:** Test `BesuNode`'s internal logic, configuration building, and state transitions (mocking Docker interactions).
**Scope:** `BesuNode` class.
*   **Mocks:** `DockerManager`, `FileManager`, `ethers.JsonRpcProvider` (for `waitForNodeReady`).
*   **Covers:**
    *   **Getters:** All getters return correct values based on config and mocked state (e.g., `getRpcUrl`, `getWallet`).
    *   **`start()`:** `InvalidNodeStateError` if already running. Happy path calls `createContainer`, `startContainer`, `waitForNodeReady`. Error path sets status to `ERROR`.
    *   **`stop()`:** `InvalidNodeStateError` if not running. Happy path calls `stopContainer`. Error path sets status to `ERROR`.
    *   **`remove()`:** Happy path calls `removeContainer`, clears internal container reference.
    *   **`getLogs()`:** Calls `dockerManager.getContainerLogs`. Throws if no container.
    *   **`getEnodeUrl()`:** `InvalidNodeStateError` if not running. Happy path: mock `executeSystemCommand` and verify correct `enode://` format. Error path: `DockerOperationError`.
    *   **`createContainer()`:** Correct `ContainerOptions` generated (Env, Volumes, PortBindings, HostConfig, NetworkingConfig, Labels). `pullImageIfNeeded` called.
    *   **`buildEnvironment()`:** Correct Besu environment vars, RPC vars only if `rpc:true`, bootnodes. Covers default `rpcPort=8545` if `rpc:true` but no port specified.
    *   **`buildVolumes()`:** Correct `/data` and `genesis.json` mappings.
    *   **`waitForNodeReady()`:** Polling logic for RPC (`getBlockNumber`) and non-RPC (`getContainerState`). Timeout (`ContainerStateTimeoutError`) and unexpected state (`UnexpectedContainerStateError`).
    *   **`setStatus()`:** Internal status update and `status-change` event emission.

### 4. `unit/unit.docker-manager.test.ts`

**Purpose:** Test the `DockerManager`'s direct interactions with the `dockerode` library, wrapping errors and translating inputs.
**Scope:** `DockerManager` class.
*   **Mocks:** Extensively mocks `dockerode` library and its methods (e.g., `docker.listNetworks`, `network.inspect`, `container.start`).
*   **Covers:**
    *   **`createNetwork`:** Happy path (correct IPAM, labels). `NetworkAlreadyExistsError`. `DockerOperationError` for other Docker API errors.
    *   **`adoptNetwork`:** Happy path (returns `DockerNetworkConfig` with subnet/gateway). `NetworkNotFoundError` (404). `DockerOperationError`. Handles networks without IPAM.
    *   **`removeNetwork`:** Calls `removeContainers` and `network.remove()`. Ignores 404 (not found).
    *   **`networkExists`:** `true`/`false` based on `listNetworks` mock.
    *   **`pullImageIfNeeded`:** Checks if image exists first. Calls `docker.pull()` if needed. Throws `BesuImageNotFoundError` on pull failure.
    *   **`createContainer`:** Translates `ContainerOptions` fully (names, image, env, volumes, port bindings, host config, networking, labels). Throws `DockerOperationError`.
    *   **`startContainer`, `stopContainer`, `removeContainer`:** Happy path. Ignores 304/404 for `stop`/`remove`. Throws `DockerOperationError`.
    *   **`getContainerState`, `waitForContainerState`:** State polling, timeout (`ContainerStateTimeoutError`), unexpected state (`UnexpectedContainerStateError`).
    *   **`getContainerLogs`, `executeSystemCommand`:** Correctly calls `dockerode` methods and handles success/failure.
    *   **`listContainers`, `listNetworks`:** Correctly filters by `besu-sdk=true` label and `networkName`.
    *   **`removeContainers`, `removeAllNetworks`:** Calls `listX` and `removeX` for each item, handles individual errors gracefully.
    *   **`getGatewayIP(subnet)`:** Correctly calculates `.1` gateway IP.

### 5. `unit/unit.file-manager.test.ts`

**Purpose:** Test file system operations, ensuring proper error handling and path management.
**Scope:** `FileManager` class.
*   **Testing Approach:** Uses a unique temporary directory for each test/suite to ensure real `fs` interaction and cleanup.
*   **Covers:**
    *   **`ensureDirectory`:** Creates new/nested directories. No error if exists. `FileSystemError` on permission issues.
    *   **`writeFile` / `writeJSON`:** Writes content/JSON correctly, creates parent dirs, overwrites. `writeJSON` formats. `FileSystemError` on permissions/path/disk full.
    *   **`readFile` / `readJSON`:** Reads content. `readJSON` parses. `FileSystemError` if file not found, permissions, or **invalid JSON content**.
    *   **`exists`:** `true`/`false` accurately.
    *   **`removeFile` / `removeDirectory`:** Removes. Idempotent. `removeDirectory` is recursive. `FileSystemError` on permissions.
    *   **`copyFile`:** Copies, creates destination dir. `FileSystemError` on source/dest errors.
    *   **`listFiles` / `listDirectories`:** Correctly lists files/directories, handles recursion.
    *   **`createNetworkStructure`:** Creates standard directory layout.
    *   **`writeNodeKeys`:** Writes `key`, `key.pub`, `address` files, stripping `0x` correctly.
    *   **`ensureBaseDataDirectory`:** Creates base dir if not exists, returns absolute path.

### 6. `unit/unit.system-validator.test.ts`

**Purpose:** Test environment checks (Docker, resources).
**Scope:** `SystemValidator` class.
*   **Mocks:** Mocks `dockerode` methods (`ping`, `info`, `version`, `getImage`) and potentially system-level commands.
*   **Covers:**
    *   **`checkPrerequisites()`:** Orchestrates all sub-checks and propagates errors (`DockerNotAvailableError`, `InsufficientResourcesError`).
    *   **`checkDockerAvailable()`:** Docker responding vs. not reachable.
    *   **`checkDockerVersion()`:** Version OK vs. too old. Logs warning if version cannot be determined.
    *   **`checkResources()`:** Sufficient vs. insufficient memory/disk (mock `info.MemTotal`, `info.DriverStatus`). Logs warnings for missing info (`MemTotal`, `DriverStatus`) or many running containers.
    *   **`checkBesuImage()`:** Image exists vs. not found (logs `info` about pulling later).
    *   **`checkPortsAvailable()`:** **Explicitly verifies `logger.warn` is called for privileged ports (e.g., 80, 443) and common ports (e.g., 22, 8080)**. (Does not perform actual port scanning).
    *   **`networkExists()`:** Checks `docker.listNetworks` mock.
    *   **Pure utility functions (`parseVersion`, `isVersionLower`, `parseDiskInfo`, `estimateRequirements`):** Exhaustive inputs for parsing, comparisons, and calculations.

### 7. `unit/unit.key-generator.test.ts`

**Purpose:** Test generation, derivation, and validation of cryptographic identities.
**Scope:** `utils/key-generator.ts`.
*   **Mocks:** Mocks `logger.warn` for deterministic identity warnings. Uses `ethers.js` for cryptographic validation.
*   **Covers:**
    *   **`generateNodeIdentity()`:** Returns valid `NodeIdentity` (address, publicKey, privateKey) with correct formats and `0x` prefixes. Verifies uniqueness and cryptographic consistency.
    *   **`generateMultipleIdentities(count)`:** Generates correct number of unique, valid identities. Throws for invalid `count` (`0`, negative, float).
    *   **`generateDeterministicIdentity(seed)`:** **Crucially, confirms identical output for same seed, different for different seeds.** **Verifies `logger.warn` is called** (warning about production use).
    *   **`deriveAddressFromPrivateKey()`:** Correctly derives address from private key (with/without `0x`). Throws for invalid private keys (length, hex chars).
    *   **`validateNodeIdentity()`:** Returns `true` for valid identity. Throws for invalid address format, private key not matching address/public key.
    *   **`formatPrivateKeyForBesu()`:** Correctly strips `0x` prefix.
    *   **`addressFromEnode()`:** Parses valid `enodeUrl` to address. Throws for invalid `enodeUrl` format.

### 8. `unit/unit.config-validators.test.ts`

**Purpose:** Test all configuration validation functions exhaustively with valid and invalid inputs.
**Scope:** `validators/config.ts`.
*   **Mocks:** Mocks `console.warn` to capture warnings.
*   **Covers:**
    *   **`validateNetworkConfig()`:** Happy path. Extensive `ConfigurationValidationError` tests for `chainId` (0, negative, float, well-known logs warn), `blockPeriodSeconds` (0, negative, float, long logs warn), `networkName` (empty, invalid chars, too long), `subnet` (invalid format, public range). Also for `nodes` array (empty, duplicate names/IPs/RPC ports, no validators).
    *   **`validateSubnet()`:** Happy paths for private CIDRs. `ConfigurationValidationError` for invalid format, prefix length, public IP range.
    *   **`validateNodeConfig()` / `validateNodeOptions()`:** Happy path. `ConfigurationValidationError` for invalid name/IP/rpcPort format. **IPs:** `IP outside subnet`, `IP is network address`, `IP is broadcast address`. **`rpcPort` without `rpc:true`**.
    *   **`validateNodeIp()`:** Direct validation for valid IPs within subnet, and invalid ones (outside, network, broadcast). **For `IP del gateway` (`172.20.0.1`): Covered by allowing it if it's a valid host IP within subnet, as no explicit warning/rejection is stated for it in the original `validators/config.ts` analysis section.**
    *   **`validateRpcPort()`:** Happy path for valid range. `ConfigurationValidationError` for `0`, negative, `65536`, float. **Verifies `console.warn` for privileged (80, 443) and common (22, 3306, 5432, 8080) ports.**
    *   **`validateDockerConnection()`:** Valid formats (`unix://`, `tcp://`). Throws `ConfigurationValidationError` for invalid prefixes.

---

This refined and meticulously cross-checked plan encompasses all the requirements, test ideas, edge cases, and assumptions from your original analysis. It adheres to the principles of simplicity, organization, and efficient resource use. I am confident this is the best and most complete test suite structure I can provide based on your input.