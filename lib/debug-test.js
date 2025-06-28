const { BesuNetwork } = require("./dist/index.js");
const fs = require("fs");
const path = require("path");
const os = require("os");

// Crear directorio temporal
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "besu-debug-"));

const config = {
  name: "test-mixed-port-scenarios",
  chainId: 1337,
  subnet: "172.50.0.0/16",
  consensus: "clique",
  gasLimit: "0x47E7C4",
};

const network = new BesuNetwork(config, tempDir);

const mixedNodes = [
  {
    name: "node1",
    ip: "172.50.0.20",
    rpcPort: 8545,
    p2pPort: 30303,
    type: "bootnode",
  },
  {
    name: "node2",
    ip: "172.50.0.21", // IP diferente
    rpcPort: 8545, // Mismo puerto RPC pero IP diferente
    p2pPort: 30303, // Mismo puerto P2P pero IP diferente
    type: "miner",
  },
  {
    name: "node3",
    ip: "172.50.0.20", // Misma IP que node1
    rpcPort: 8546, // Puerto RPC diferente
    p2pPort: 30304, // Puerto P2P diferente
    type: "rpc",
  },
];

console.log("🔍 Debugging validation for mixed port scenarios...\n");
console.log("Nodes configuration:");
mixedNodes.forEach((node, index) => {
  console.log(
    `  ${index + 1}. ${node.name} (${node.type}): ${node.ip}:${
      node.rpcPort
    } (P2P: ${node.p2pPort})`
  );
});

const validation = network.validateNetworkConfiguration({ nodes: mixedNodes });

console.log("\n📋 Validation Result:");
console.log(`Valid: ${validation.isValid}`);
console.log(`Errors count: ${validation.errors.length}`);

if (validation.errors.length > 0) {
  console.log("\n❌ Validation Errors:");
  validation.errors.forEach((error, index) => {
    console.log(`  ${index + 1}. Field: ${error.field}`);
    console.log(`     Type: ${error.type}`);
    console.log(`     Message: ${error.message}`);
    console.log();
  });
}

// Limpiar
fs.rmSync(tempDir, { recursive: true, force: true });
