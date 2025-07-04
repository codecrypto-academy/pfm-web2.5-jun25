#!/usr/bin/env node

/**
 * Simple test to verify that our simplified API imports work
 */

async function testImports() {
  try {
    console.log('Testing imports...');
    
    // Test the import
    const { SimpleDockerManager, SimpleGenesisGenerator } = await import('besu-network-manager/simple-index');
    
    console.log('✅ SimpleDockerManager imported:', typeof SimpleDockerManager);
    console.log('✅ SimpleGenesisGenerator imported:', typeof SimpleGenesisGenerator);
    
    // Try to instantiate
    const dockerManager = new SimpleDockerManager();
    const genesisGenerator = new SimpleGenesisGenerator();
    
    console.log('✅ SimpleDockerManager instantiated');
    console.log('✅ SimpleGenesisGenerator instantiated');
    
    // Test basic functionality
    console.log('✅ All imports and instantiation successful!');
    
  } catch (error) {
    console.error('❌ Import test failed:', error.message);
    console.error(error.stack);
  }
}

testImports();
