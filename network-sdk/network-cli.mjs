#!/usr/bin/env node

/**
 * Network CLI utility for managing Besu network
 * Usage: node scripts/network-cli.mjs <command>
 */

import { NetworkManager } from './dist/network/NetworkManager.js';

const commands = {
  async setup() {
    console.log('🚀 Setting up Besu network...');
    const nm = new NetworkManager();
    await nm.setup();
    console.log('✅ Network setup complete');
  },

  async start() {
    console.log('▶️ Starting Besu network...');
    const nm = new NetworkManager();
    await nm.start();
    console.log('✅ Network started');
  },

  async stop() {
    console.log('🛑 Stopping Besu network...');
    const nm = new NetworkManager();
    await nm.stop();
    console.log('✅ Network stopped');
  },

  async restart() {
    console.log('🔄 Restarting Besu network...');
    const nm = new NetworkManager();
    await nm.restart();
    console.log('✅ Network restarted');
  },

  async status() {
    console.log('📊 Checking network status...');
    const nm = new NetworkManager();
    const status = await nm.getStatus();
    console.log(status);
  },

  async test() {
    console.log('🧪 Testing network connectivity...');
    const nm = new NetworkManager();
    const result = await nm.test();
    console.log(result);
  },

  async logs() {
    console.log('📋 Fetching network logs...');
    const nm = new NetworkManager();
    const logs = await nm.getLogs();
    console.log(logs);
  },

  async reset() {
    console.log('💥 Resetting network (destructive operation)...');
    const nm = new NetworkManager();
    await nm.reset();
    console.log('✅ Network reset complete');
  },

  help() {
    console.log(`
🔗 Besu Network CLI

Usage: node network-cli.mjs <command>

Available commands:
  setup     Setup the complete network (network + keys + config)
  start     Start the network containers
  stop      Stop the network containers
  restart   Restart the network
  status    Show network status
  test      Test network connectivity
  logs      Show container logs
  reset     Reset the entire network (destructive!)
  help      Show this help message

Examples:
  node network-cli.mjs setup
  node network-cli.mjs start
  node network-cli.mjs stop
  node network-cli.mjs status

Or use npm scripts:
  yarn network:setup
  yarn network:start
  yarn network:stop
  yarn network:status
`);
  }
};

async function main() {
  const command = process.argv[2];
  
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    commands.help();
    return;
  }

  if (!commands[command]) {
    console.error(`❌ Unknown command: ${command}`);
    console.error('Run "node network-cli.mjs help" for available commands');
    process.exit(1);
  }

  try {
    await commands[command]();
  } catch (error) {
    console.error(`❌ Command failed:`, error.message);
    process.exit(1);
  }
}

// Run only if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { commands };
