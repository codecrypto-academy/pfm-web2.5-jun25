/**
 * BesuNetwork Update Tests
 * Author: Javier Ruiz-Canela López
 * Email: jrcanelalopez@gmail.com
 * Date: June 30, 2025
 * 
 * Tests for update functionality in Hyperledger Besu networks.
 * These tests verify network configuration updates, account management, and node updates.
 */

import { BesuNetwork, BesuNetworkConfig, BesuNodeDefinition, FileService } from '../src/create-besu-networks';
import { BesuNode } from '../src/create-besu-networks';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('BesuNetwork Update Tests', () => {
    let tempDir: string;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'besu-update-test-'));
    });

    afterEach(() => {
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    // ========================================
    // TESTS DE ACTUALIZACIÓN DE CONFIGURACIÓN DE RED
    // ========================================

    describe('Network Configuration Updates', () => {
        test('should update network configuration correctly', async () => {
            const timestamp = Date.now();
            const initialConfig = {
                name: `test-update-network-${timestamp}`,
                chainId: 1337,
                subnet: '172.25.0.0/16',
                consensus: 'clique' as const,
                gasLimit: '0x47E7C4',
                blockTime: 5
            };

            const network = new BesuNetwork(initialConfig, tempDir);
            
            try {
                // Create a simple network with bootnode and miner (required for clique consensus)
                await network.create({
                    nodes: [
                        { name: 'bootnode1', ip: '172.25.0.10', rpcPort: 8545, type: 'bootnode' },
                        { name: 'miner1', ip: '172.25.0.11', rpcPort: 8546, type: 'miner' }
                    ]
                });

                // Verify initial configuration
                expect(network.getConfig().subnet).toBe('172.25.0.0/16');
                expect(network.getConfig().gasLimit).toBe('0x47E7C4');
                expect(network.getConfig().blockTime).toBe(5);

                // Update network configuration
                await network.updateNetworkConfig({
                    subnet: '172.27.0.0/16',
                    gasLimit: '0x989680',
                    blockTime: 10
                });

                // Verify updated configuration
                const updatedConfig = network.getConfig();
                expect(updatedConfig.subnet).toBe('172.27.0.0/16');
                expect(updatedConfig.gasLimit).toBe('0x989680');
                expect(updatedConfig.blockTime).toBe(10);

                // Verify that unchanged fields remain the same
                expect(updatedConfig.name).toBe(`test-update-network-${timestamp}`);
                expect(updatedConfig.chainId).toBe(1337);
                expect(updatedConfig.consensus).toBe('clique');

                // Verify that nodes were updated with new subnet
                const nodes = network.getNodes();
                const bootnode = nodes.get('bootnode1');
                const miner = nodes.get('miner1');
                
                expect(bootnode).toBeDefined();
                expect(miner).toBeDefined();
                
                if (bootnode) {
                    const nodeConfig = bootnode.getConfig();
                    expect(nodeConfig.ip).toBe('172.27.0.10'); // IP should be updated to new subnet
                }
                
                if (miner) {
                    const nodeConfig = miner.getConfig();
                    expect(nodeConfig.ip).toBe('172.27.0.11'); // IP should be updated to new subnet
                }
            } finally {
                // Cleanup: ensure network is destroyed
                try {
                    await network.destroy();
                } catch (error) {
                    // Ignore cleanup errors
                }
            }
        });

        test('should validate parameters in updateNetworkConfig', async () => {
            const timestamp = Date.now();
            const initialConfig = {
                name: `test-validation-network-${timestamp}`,
                chainId: 1337,
                subnet: '172.26.0.0/16',
                consensus: 'clique' as const,
                gasLimit: '0x47E7C4',
                blockTime: 5
            };

            const network = new BesuNetwork(initialConfig, tempDir);
            
            // Add nodes to the configuration (simulating a created network without actually creating it)
            const fileService = new FileService(tempDir);
            (network as any).nodes.set('bootnode1', new BesuNode(
                { name: 'bootnode1', ip: '172.26.0.10', port: 30303, rpcPort: 8545, type: 'bootnode' }, 
                fileService
            ));
            (network as any).nodes.set('miner1', new BesuNode(
                { name: 'miner1', ip: '172.26.0.11', port: 30304, rpcPort: 8546, type: 'miner' }, 
                fileService
            ));

            // Test invalid subnet validation
            await expect(network.updateNetworkConfig({
                subnet: 'invalid-subnet'
            })).rejects.toThrow(/Invalid subnet format/);

            // Test invalid gasLimit validation
            await expect(network.updateNetworkConfig({
                gasLimit: '0x100' // Too low (256)
            })).rejects.toThrow(/Gas limit must be between/);

            await expect(network.updateNetworkConfig({
                gasLimit: '0xFFFFFFFFFF' // Too high
            })).rejects.toThrow(/Gas limit must be between/);

            // Test invalid blockTime validation
            await expect(network.updateNetworkConfig({
                blockTime: 0 // Too low
            })).rejects.toThrow(/Block time must be between/);

            await expect(network.updateNetworkConfig({
                blockTime: 400 // Too high
            })).rejects.toThrow(/Block time must be between/);

            // Test multiple validation errors
            await expect(network.updateNetworkConfig({
                subnet: 'invalid',
                gasLimit: '0x100',
                blockTime: 0
            })).rejects.toThrow(/Network configuration update validation failed/);

            // Test valid updates (without Docker requirements)
            // Mock the dockerManager to avoid Docker calls
            const originalDockerManager = (network as any).dockerManager;
            (network as any).dockerManager = {
                removeNetwork: jest.fn(),
                createNetwork: jest.fn(),
                isNetworkCreated: jest.fn().mockReturnValue(false),
                removeContainers: jest.fn()
            };

            // Mock the stop and updateNodeConfigurations methods to avoid file system operations
            const originalStop = network.stop;
            const originalUpdateNodeConfigs = (network as any).updateNodeConfigurations;
            
            (network as any).stop = jest.fn().mockResolvedValue(undefined);
            (network as any).updateNodeConfigurations = jest.fn().mockResolvedValue(undefined);

            await network.updateNetworkConfig({
                subnet: '172.28.0.0/16',
                gasLimit: '0x989680',
                blockTime: 15
            });

            const updatedConfig = network.getConfig();
            expect(updatedConfig.subnet).toBe('172.28.0.0/16');
            expect(updatedConfig.gasLimit).toBe('0x989680');
            expect(updatedConfig.blockTime).toBe(15);

            // Restore original methods and dockerManager
            (network as any).dockerManager = originalDockerManager;
            (network as any).stop = originalStop;
            (network as any).updateNodeConfigurations = originalUpdateNodeConfigs;
        });
    });

    // ========================================
    // TESTS DE VALIDACIÓN PARA UPDATE NETWORK ACCOUNTS
    // ========================================

    describe('Account Update Validation Tests', () => {
        test('Should validate updateNetworkAccountsByName with invalid address format', async () => {
            console.log('🧪 Test: Validation - Invalid address format\n');
            
            await expect(BesuNetwork.updateNetworkAccountsByName('test-network', [
                {
                    address: 'invalid-address',
                    weiAmount: '1000000000000000000'
                }
            ])).rejects.toThrow('Account 0 address must be a valid Ethereum address');
            
            console.log('✅ Invalid address format validation working correctly');
        });

        test('Should validate updateNetworkAccountsByName with negative wei amount', async () => {
            console.log('🧪 Test: Validation - Negative wei amount\n');
            
            await expect(BesuNetwork.updateNetworkAccountsByName('test-network', [
                {
                    address: '0x742d35Cc6354C6532C4c0a1b9AAB6ff119B4a4B9',
                    weiAmount: '-1000'
                }
            ])).rejects.toThrow('Account 0 wei amount must be a valid positive number');
            
            console.log('✅ Negative wei amount validation working correctly');
        });

        test('Should validate updateNetworkAccountsByName with invalid wei amount format', async () => {
            console.log('🧪 Test: Validation - Invalid wei amount format\n');
            
            await expect(BesuNetwork.updateNetworkAccountsByName('test-network', [
                {
                    address: '0x742d35Cc6354C6532C4c0a1b9AAB6ff119B4a4B9',
                    weiAmount: 'not-a-number'
                }
            ])).rejects.toThrow('Account 0 wei amount must be a valid positive number');
            
            console.log('✅ Invalid wei amount format validation working correctly');
        });

        test('Should validate updateNetworkAccountsByName with duplicate addresses', async () => {
            console.log('🧪 Test: Validation - Duplicate addresses\n');
            
            await expect(BesuNetwork.updateNetworkAccountsByName('test-network', [
                {
                    address: '0x742d35Cc6354C6532C4c0a1b9AAB6ff119B4a4B9',
                    weiAmount: '1000000000000000000'
                },
                {
                    address: '0x742d35Cc6354C6532C4c0a1b9AAB6ff119B4a4B9', // Same address
                    weiAmount: '2000000000000000000'
                }
            ])).rejects.toThrow('Account 1 address is duplicated');
            
            console.log('✅ Duplicate addresses validation working correctly');
        });

        test('Should validate updateNetworkAccountsByName with unreasonable wei amount', async () => {
            console.log('🧪 Test: Validation - Unreasonable wei amount\n');
            
            const unreasonableAmount = '10000000000000000000000000'; // > 10^24 wei (exceeds 1M ETH limit)
            
            await expect(BesuNetwork.updateNetworkAccountsByName('test-network', [
                {
                    address: '0x742d35Cc6354C6532C4c0a1b9AAB6ff119B4a4B9',
                    weiAmount: unreasonableAmount
                }
            ])).rejects.toThrow('should be between 1 wei and 10^24 wei');
            
            console.log('✅ Unreasonable wei amount validation working correctly');
        });

        test('Should pass validation with valid inputs and fail on network not found', async () => {
            console.log('🧪 Test: Validation - Valid inputs, network not found\n');
            
            await expect(BesuNetwork.updateNetworkAccountsByName('non-existent-network', [
                {
                    address: '0x742d35Cc6354C6532C4c0a1b9AAB6ff119B4a4B9',
                    weiAmount: '1000000000000000000'
                }
            ])).rejects.toThrow("Network 'non-existent-network' not found");
            
            console.log('✅ Valid input passed validation, correctly failed at network lookup');
        });

        test('Should validate instance method updateNetworkAccounts', async () => {
            console.log('🧪 Test: Validation - Instance method updateNetworkAccounts\n');
            
            const config: BesuNetworkConfig = {
                name: 'test-network',
                chainId: 1337,
                subnet: '172.24.0.0/16',
                consensus: 'clique',
                gasLimit: '0x47E7C4'
            };
            
            const network = new BesuNetwork(config);
            
            // Test invalid address
            await expect(network.updateNetworkAccounts([
                {
                    address: 'invalid-address',
                    weiAmount: '1000000000000000000'
                }
            ])).rejects.toThrow('Account 0 address must be a valid Ethereum address');
            
            // Test valid update (should not throw, just update config)
            const result = await network.updateNetworkAccounts([
                {
                    address: '0x742d35Cc6354C6532C4c0a1b9AAB6ff119B4a4B9',
                    weiAmount: '1000000000000000000'
                }
            ]);
            
            expect(result.success).toBe(true);
            expect(result.configUpdated).toBe(true);
            expect(result.transfersExecuted).toHaveLength(1);
            
            console.log('✅ Instance method validation working correctly');
        });
    });

    // ========================================
    // TESTS DE ACTUALIZACIÓN DE CUENTAS (FUNCIONANDO CON API ACTUAL)
    // ========================================

    describe('Network Account Updates', () => {
        describe('updateNetworkAccountsByName functionality', () => {
            test('should validate account updates correctly', async () => {
                const { BesuNetwork } = await import('../src/create-besu-networks');
                
                // Test BesuNetwork.updateNetworkAccountsByName with non-existing network
                try {
                    await BesuNetwork.updateNetworkAccountsByName('non-existing-network', [
                        { address: '0x742d35Cc6635C0532925a3b8D9C0d8a8b23F4Fa3', weiAmount: '1000000000000000000' }
                    ], { performTransfers: false });
                    fail('Should have thrown an error for non-existing network');
                } catch (error) {
                    expect(error).toBeInstanceOf(Error);
                    expect((error as Error).message).toContain('not found');
                    console.log('✅ BesuNetwork.updateNetworkAccountsByName correctly throws error for non-existing network');
                }

                console.log('🎉 updateNetworkAccountsByName interface works correctly!');
            });

            test('should validate account format correctly', async () => {
                const { BesuNetwork } = await import('../src/create-besu-networks');
                
                // Test with invalid address format
                try {
                    await BesuNetwork.updateNetworkAccountsByName('non-existing-network', [
                        { address: 'invalid-address', weiAmount: '1000000000000000000' }
                    ], { performTransfers: false });
                    fail('Should have thrown validation error for invalid address');
                } catch (error) {
                    expect(error).toBeInstanceOf(Error);
                    expect((error as Error).message).toContain('Validation failed');
                    console.log('✅ Correctly validates invalid address format');
                }

                // Test with invalid wei amount
                try {
                    await BesuNetwork.updateNetworkAccountsByName('non-existing-network', [
                        { address: '0x742d35Cc6635C0532925a3b8D9C0d8a8b23F4Fa3', weiAmount: 'invalid-amount' }
                    ], { performTransfers: false });
                    fail('Should have thrown validation error for invalid wei amount');
                } catch (error) {
                    expect(error).toBeInstanceOf(Error);
                    expect((error as Error).message).toContain('Validation failed');
                    console.log('✅ Correctly validates invalid wei amount');
                }

                console.log('✅ All account validation tests passed');
            });

            test('should handle duplicate addresses', async () => {
                const { BesuNetwork } = await import('../src/create-besu-networks');
                
                // Test with duplicate addresses
                try {
                    await BesuNetwork.updateNetworkAccountsByName('non-existing-network', [
                        { address: '0x742d35Cc6635C0532925a3b8D9C0d8a8b23F4Fa3', weiAmount: '1000000000000000000' },
                        { address: '0x742d35Cc6635C0532925a3b8D9C0d8a8b23F4Fa3', weiAmount: '2000000000000000000' }
                    ], { performTransfers: false });
                    fail('Should have thrown validation error for duplicate addresses');
                } catch (error) {
                    expect(error).toBeInstanceOf(Error);
                    expect((error as Error).message).toContain('duplicated');
                    console.log('✅ Correctly validates duplicate addresses');
                }

                console.log('✅ Duplicate address validation test passed');
            });
        });

        describe('Network configuration validation', () => {
            test('should validate network configurations properly', async () => {
                const { BesuNetwork } = await import('../src/create-besu-networks');
                
                // Test validation with proper accounts array but non-existing network
                const validAccounts = [
                    { address: '0x742d35Cc6635C0532925a3b8D9C0d8a8b23F4Fa3', weiAmount: '1000000000000000000' },
                    { address: '0x8ba1f109551bD432803012645Aac136c72a90e32', weiAmount: '2000000000000000000' }
                ];

                try {
                    await BesuNetwork.updateNetworkAccountsByName('non-existing-network', validAccounts, { 
                        performTransfers: false 
                    });
                    fail('Should have thrown error for non-existing network even with valid accounts');
                } catch (error) {
                    expect(error).toBeInstanceOf(Error);
                    expect((error as Error).message).toContain('not found');
                    console.log('✅ Correctly handles non-existing network even with valid account data');
                }

                console.log('✅ All network configuration validation tests completed successfully');
            });
        });

        // Helper function tests
        test('should test ethToWei helper function', () => {
            console.log('🧪 Test: Helper function - ethToWei\n');
            
            const ethToWei = (ethAmount: string): string => {
                // Use ethers for precise conversion
                const { ethers } = require('ethers');
                return ethers.parseEther(ethAmount).toString();
            };
            
            expect(ethToWei('1')).toBe('1000000000000000000');
            expect(ethToWei('0.5')).toBe('500000000000000000');
            expect(ethToWei('1000')).toBe('1000000000000000000000');
            
            console.log('✅ Helper function working correctly');
        });

        console.log('✅ Network account update tests completed');
    });

    console.log('✅ Tests de actualización completados');
});
