/**
 * BesuNetwork Update Functions
 * Author: Javier Ruiz-Canela López
 * Email: jrcanelalopez@gmail.com
 * Date: June 30, 2025
 * 
 * This file contains all update-related functions for Hyperledger Besu networks,
 * extracted from the main create-besu-networks.ts file for better organization.
 */

import * as fs from "fs";
import * as path from "path";
import { ethers } from "ethers";
import { 
  BesuNetwork, 
  BesuNode, 
  BesuNetworkConfig, 
  BesuNodeDefinition, 
  CryptoLib,
  ValidationError,
  isSubnetAvailable 
} from './create-besu-networks';

// ============================================================================
// BESU NETWORK UPDATE METHODS - Métodos de actualización para BesuNetwork
// ============================================================================

/**
 * Modifica la configuración de una red Besu existente sin afectar el genesis
 * Solo permite cambios en subnet, gasLimit y blockTime
 */
export async function updateNetworkConfig(
  network: BesuNetwork,
  updates: {
    subnet?: string;
    gasLimit?: string;
    blockTime?: number;
  }
): Promise<void> {
  let needsRestart = false;
  let needsSubnetUpdate = false;

  // Validar los cambios propuestos usando las mismas validaciones que en createNetwork
  const errors: ValidationError[] = [];
  const config = network.getConfig();

  // Actualizar subnet si se proporciona
  if (updates.subnet && updates.subnet !== config.subnet) {
    // Usar las mismas validaciones que en validateNetworkBasicConfig
    if (!isValidSubnet(updates.subnet)) {
      errors.push({
        field: 'subnet',
        type: 'format',
        message: 'Invalid subnet format. Expected format: xxx.xxx.xxx.xxx/xx (e.g., 172.24.0.0/16)'
      });
    } else if (!isSubnetAvailable(updates.subnet)) {
      errors.push({
        field: 'subnet',
        type: 'duplicate',
        message: `Subnet ${updates.subnet} is already in use by another Docker network`
      });
    }

    if (errors.length === 0) {
      console.log(`🔄 Updating subnet from ${config.subnet} to ${updates.subnet}`);
      config.subnet = updates.subnet;
      needsSubnetUpdate = true;
      needsRestart = true;
    }
  }

  // Actualizar gasLimit si se proporciona
  if (updates.gasLimit && updates.gasLimit !== config.gasLimit) {
    // Usar las mismas validaciones que en validateNetworkBasicConfig
    const gasLimit = parseInt(updates.gasLimit, 16);
    if (isNaN(gasLimit) || gasLimit < 4712388 || gasLimit > 100000000) {
      errors.push({
        field: 'gasLimit',
        type: 'range',
        message: 'Gas limit must be between 4,712,388 (0x47E7C4) and 100,000,000 (0x5F5E100)'
      });
    }

    if (errors.length === 0) {
      console.log(`🔄 Updating gas limit from ${config.gasLimit} to ${updates.gasLimit}`);
      config.gasLimit = updates.gasLimit;
      needsRestart = true;
    }
  }

  // Actualizar blockTime si se proporciona
  if (updates.blockTime !== undefined && updates.blockTime !== config.blockTime) {
    // Usar las mismas validaciones que en validateNetworkBasicConfig
    if (!Number.isInteger(updates.blockTime) || updates.blockTime < 1 || updates.blockTime > 300) {
      errors.push({
        field: 'blockTime',
        type: 'range',
        message: 'Block time must be between 1 and 300 seconds'
      });
    }

    if (errors.length === 0) {
      console.log(`🔄 Updating block time from ${config.blockTime || 'default'} to ${updates.blockTime}`);
      config.blockTime = updates.blockTime;
      needsRestart = true;
    }
  }

  // Si hay errores de validación, lanzar excepción con todos los errores
  if (errors.length > 0) {
    const errorMessages = errors.map(error => 
      `${error.field}: ${error.message}`
    ).join('\n');
    throw new Error(`Network configuration update validation failed:\n${errorMessages}`);
  }

  // Si hay cambios que requieren reinicio
  if (needsRestart) {
    console.log('⏸️  Stopping network for configuration update...');
    await network.stop();

    // Si cambió la subnet, recrear la red Docker
    if (needsSubnetUpdate) {
      console.log('🔧 Recreating Docker network with new subnet...');
      const dockerManager = (network as any).dockerManager;
      dockerManager.removeNetwork();
      
      // Actualizar IPs de los nodos para la nueva subnet
      updateNodesForNewSubnet(network, updates.subnet!);
      
      // Crear nueva red Docker
      dockerManager.createNetwork(updates.subnet!, {
        network: config.name,
        type: "besu",
      });
    }

    // Regenerar archivos de configuración TOML con los nuevos parámetros
    console.log('📝 Updating node configuration files...');
    await updateNodeConfigurations(network);

    // Guardar la configuración actualizada en el archivo network-config.json
    // Usar el fileService del objeto network para acceder al directorio de la red
    const networkPath = path.join((network as any).fileService?.basePath || './networks', config.name);
    const configPath = path.join(networkPath, 'network-config.json');
    
    try {
      // Asegurar que el directorio existe
      if (!fs.existsSync(path.dirname(configPath))) {
        fs.mkdirSync(path.dirname(configPath), { recursive: true });
      }
      
      // Escribir el archivo de configuración
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(`💾 Configuration saved to: ${configPath}`);
    } catch (error) {
      console.error(`⚠️ Error saving network configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log('✅ Network configuration updated successfully');
    console.log('💡 Use start() to restart the network with new configuration');
  } else {
    console.log('ℹ️  No changes detected in configuration');
  }
}

/**
 * Valida las actualizaciones de cuentas antes de aplicarlas
 */
export function validateAccountUpdates(
  network: BesuNetwork,
  accounts: Array<{ address: string; weiAmount: string }>
): ValidationError[] {
  const errors: ValidationError[] = [];
  const usedAddresses = new Set<string>();

  if (!accounts || accounts.length === 0) {
    errors.push({
      field: 'accounts',
      type: 'required',
      message: 'At least one account must be provided'
    });
    return errors;
  }

  accounts.forEach((account, index) => {
    if (!isValidEthereumAddress(account.address)) {
      errors.push({
        field: `accounts[${index}].address`,
        type: 'format',
        message: `Account ${index} address must be a valid Ethereum address (0x...)`
      });
    } else {
      const lowerAddress = account.address.toLowerCase();
      if (usedAddresses.has(lowerAddress)) {
        errors.push({
          field: `accounts[${index}].address`,
          type: 'duplicate',
          message: `Account ${index} address is duplicated`
        });
      } else {
        usedAddresses.add(lowerAddress);
      }
    }

    if (!isValidWeiAmount(account.weiAmount)) {
      errors.push({
        field: `accounts[${index}].weiAmount`,
        type: 'format',
        message: `Account ${index} wei amount must be a valid positive number`
      });
    } else if (!isReasonableWeiAmount(account.weiAmount)) {
      errors.push({
        field: `accounts[${index}].weiAmount`,
        type: 'range',
        message: `Account ${index} wei amount should be between 1 wei and 10^24 wei (1,000,000 ETH max)`
      });
    }
  });

  return errors;
}

/**
 * Actualiza las cuentas de una red Besu existente sin modificar el genesis
 * Permite añadir nuevas cuentas o actualizar balances existentes en una red activa
 */
export async function updateNetworkAccounts(
  network: BesuNetwork,
  accounts: Array<{ address: string; weiAmount: string }>,
  options: {
    performTransfers?: boolean; // Si true, realiza transferencias reales desde el miner
    rpcUrl?: string;
    confirmTransactions?: boolean; // Si true, espera confirmación de transacciones
  } = {}
): Promise<{
  success: boolean;
  configUpdated: boolean;
  transfersExecuted: Array<{
    address: string;
    amount: string;
    transactionHash?: string;
    success: boolean;
    error?: string;
  }>;
}> {
  const config = network.getConfig();
  console.log(`📝 Updating network accounts for: ${config.name}`);
  
  const performTransfers = options.performTransfers ?? false;
  const confirmTransactions = options.confirmTransactions ?? true;
  
  const result = {
    success: true,
    configUpdated: false,
    transfersExecuted: [] as Array<{
      address: string;
      amount: string;
      transactionHash?: string;
      success: boolean;
      error?: string;
    }>
  };

  // Validar las actualizaciones antes de aplicarlas
  const validationErrors = validateAccountUpdates(network, accounts);
  if (validationErrors.length > 0) {
    const errorMessages = validationErrors.map(error => `${error.field}: ${error.message}`).join('\n');
    throw new Error(`Validation failed:\n${errorMessages}`);
  }

  // Si se van a realizar transferencias, verificar que el miner esté disponible
  let minerWallet: ethers.Wallet | null = null;
  let provider: ethers.JsonRpcProvider | null = null;
  
  if (performTransfers) {
    console.log(`💰 Preparing to perform actual transfers from miner...`);
    
    // Obtener el nodo miner y crear wallet
    const minerNode = getMinerNode(network);
    if (!minerNode) {
      throw new Error('No miner node found in the network. Cannot perform transfers.');
    }
    
    const url = options.rpcUrl || `http://localhost:${getMinerRpcPort(network) + 10000}`;
    provider = new ethers.JsonRpcProvider(url);
    
    // Crear wallet del miner
    const fileService = network.getFileService();
    const rawPrivateKey = fileService.readFile(minerNode.getConfig().name, "key.priv");
    const minerPrivateKey = rawPrivateKey.startsWith('0x') ? rawPrivateKey : `0x${rawPrivateKey}`;
    minerWallet = new ethers.Wallet(minerPrivateKey, provider);
    
    // Verificar conectividad del miner
    try {
      await provider.getBlockNumber();
      console.log(`✅ Connected to miner RPC at ${url}`);
    } catch (error) {
      throw new Error(`Cannot connect to miner RPC at ${url}. Make sure the network is running.`);
    }
  }

  // Función auxiliar para realizar transferencias
  const performTransfer = async (address: string, weiAmount: string): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> => {
    if (!performTransfers || !minerWallet || !provider) {
      return { success: true }; // Sin transferencias, solo actualización de config
    }

    try {
      // Verificar balance actual de la cuenta
      const currentBalance = await provider.getBalance(address);
      const targetBalance = BigInt(weiAmount);
      
      console.log(`   📊 Current balance for ${address}: ${ethers.formatEther(currentBalance)} ETH`);
      console.log(`   🎯 Target balance: ${ethers.formatEther(targetBalance)} ETH`);
      
      if (currentBalance >= targetBalance) {
        console.log(`   ⏭️  Account already has sufficient balance, skipping transfer`);
        return { success: true };
      }
      
      const transferAmount = targetBalance - currentBalance;
      console.log(`   💸 Transfer amount needed: ${ethers.formatEther(transferAmount)} ETH`);
      
      // Verificar que el miner tiene suficiente balance
      const minerBalance = await provider.getBalance(minerWallet.address);
      const gasEstimate = BigInt(21000) * ethers.parseUnits('20', 'gwei');
      const totalRequired = transferAmount + gasEstimate;
      
      if (minerBalance < totalRequired) {
        const error = `Insufficient miner balance. Required: ${ethers.formatEther(totalRequired)} ETH, Available: ${ethers.formatEther(minerBalance)} ETH`;
        console.log(`   ❌ ${error}`);
        return { success: false, error };
      }
      
      // Realizar la transferencia
      console.log(`   📤 Sending ${ethers.formatEther(transferAmount)} ETH to ${address}...`);
      
      const transaction = {
        to: address,
        value: transferAmount,
        gasLimit: 21000,
        gasPrice: ethers.parseUnits('20', 'gwei')
      };
      
      const txResponse = await minerWallet.sendTransaction(transaction);
      console.log(`   ✅ Transaction sent: ${txResponse.hash}`);
      
      // Esperar confirmación si se solicita
      if (confirmTransactions) {
        console.log(`   ⏳ Waiting for transaction confirmation...`);
        const receipt = await txResponse.wait();
        console.log(`   ✅ Transaction confirmed in block ${receipt?.blockNumber}`);
      }
      
      return {
        success: true,
        transactionHash: txResponse.hash
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`   ❌ Transfer failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage
      };
    }
  };

  // Procesar todas las cuentas
  console.log(`🔄 Processing ${accounts.length} accounts...`);
  
  let allTransfersSuccessful = true;
  const updatedAccounts = [];
  
  for (const account of accounts) {
    console.log(`   📝 Processing account: ${account.address}`);
    
    const transferResult = await performTransfer(account.address, account.weiAmount);
    result.transfersExecuted.push({
      address: account.address,
      amount: ethers.formatEther(account.weiAmount),
      ...transferResult
    });
    
    if (transferResult.success) {
      updatedAccounts.push(account);
      console.log(`   ✅ Account processed: ${account.address} (${ethers.formatEther(account.weiAmount)} ETH)`);
    } else {
      allTransfersSuccessful = false;
      console.log(`   ❌ Failed to process account: ${account.address}`);
    }
  }
  
  // Actualizar configuración solo si todas las transferencias fueron exitosas
  if (allTransfersSuccessful) {
    // Actualizar o añadir cuentas a la configuración existente
    if (!config.accounts) {
      config.accounts = [];
    }
    
    // Merge accounts - update existing or add new ones
    for (const newAccount of updatedAccounts) {
      const existingIndex = config.accounts.findIndex(
        existing => existing.address.toLowerCase() === newAccount.address.toLowerCase()
      );
      
      if (existingIndex >= 0) {
        // Update existing account
        config.accounts[existingIndex] = newAccount;
      } else {
        // Add new account
        config.accounts.push(newAccount);
      }
    }
    
    result.configUpdated = true;
    console.log(`   ✅ All accounts updated successfully`);
  } else {
    result.success = false;
    console.log(`   ❌ Some account transfers failed, configuration not updated`);
  }

  // Resumen final
  if (result.success) {
    console.log('✅ Network accounts updated successfully');
    if (performTransfers) {
      const successfulTransfers = result.transfersExecuted.filter(t => t.success).length;
      const totalTransfers = result.transfersExecuted.length;
      console.log(`💸 Transfers completed: ${successfulTransfers}/${totalTransfers} successful`);
    }
    if (result.configUpdated) {
      console.log('📝 Network configuration updated with new account balances');
    }
  } else {
    console.log('❌ Network accounts update completed with errors');
    const failedTransfers = result.transfersExecuted.filter(t => !t.success);
    for (const transfer of failedTransfers) {
      console.log(`   ❌ Failed transfer to ${transfer.address}: ${transfer.error}`);
    }
  }
  
  if (!performTransfers) {
    console.log('💡 Note: Only configuration updated. Use performTransfers=true to execute actual transfers.');
  }

  return result;
}

/**
 * Versión estática para validar actualizaciones de cuentas
 */
export function validateAccountUpdatesStatic(accounts: Array<{ address: string; weiAmount: string }>): ValidationError[] {
  const errors: ValidationError[] = [];
  const usedAddresses = new Set<string>();

  // Función auxiliar para validar dirección Ethereum
  const isValidEthereumAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  // Función auxiliar para validar cantidad wei
  const isValidWeiAmount = (weiAmount: string): boolean => {
    try {
      const amount = BigInt(weiAmount);
      return amount > 0n;
    } catch (error) {
      return false;
    }
  };

  // Función auxiliar para validar cantidad wei razonable
  const isReasonableWeiAmount = (weiAmount: string): boolean => {
    try {
      const amount = BigInt(weiAmount);
      const maxReasonable = BigInt("1000000000000000000000000"); // 1,000,000 ETH in wei (10^6 * 10^18)
      return amount > 0n && amount <= maxReasonable;
    } catch (error) {
      return false;
    }
  };

  if (!accounts || accounts.length === 0) {
    errors.push({
      field: 'accounts',
      type: 'required',
      message: 'At least one account must be provided'
    });
    return errors;
  }

  accounts.forEach((account, index) => {
    if (!isValidEthereumAddress(account.address)) {
      errors.push({
        field: `accounts[${index}].address`,
        type: 'format',
        message: `Account ${index} address must be a valid Ethereum address (0x...)`
      });
    } else {
      const lowerAddress = account.address.toLowerCase();
      if (usedAddresses.has(lowerAddress)) {
        errors.push({
          field: `accounts[${index}].address`,
          type: 'duplicate',
          message: `Account ${index} address is duplicated`
        });
      } else {
        usedAddresses.add(lowerAddress);
      }
    }

    if (!isValidWeiAmount(account.weiAmount)) {
      errors.push({
        field: `accounts[${index}].weiAmount`,
        type: 'format',
        message: `Account ${index} wei amount must be a valid positive number`
      });
    } else if (!isReasonableWeiAmount(account.weiAmount)) {
      errors.push({
        field: `accounts[${index}].weiAmount`,
        type: 'range',
        message: `Account ${index} wei amount should be between 1 wei and 10^24 wei (1,000,000 ETH max)`
      });
    }
  });

  return errors;
}

/**
 * Método estático para actualizar las cuentas de una red existente por nombre
 */
export async function updateNetworkAccountsByName(
  networkName: string,
  accounts: Array<{ address: string; weiAmount: string }>,
  options: {
    performTransfers?: boolean; // Si true, realiza transferencias reales desde el miner
    rpcUrl?: string;
    confirmTransactions?: boolean; // Si true, espera confirmación de transacciones
    baseDir?: string;
  } = {}
): Promise<{
  success: boolean;
  configUpdated: boolean;
  transfersExecuted: Array<{
    address: string;
    amount: string;
    transactionHash?: string;
    success: boolean;
    error?: string;
  }>;
}> {
  const baseDir = options.baseDir || "./networks";
  console.log(`🔍 Loading network configuration for: ${networkName}`);

  // Validar las actualizaciones antes de proceder
  const validationErrors = validateAccountUpdatesStatic(accounts);
  if (validationErrors.length > 0) {
    const errorMessages = validationErrors.map(error => `${error.field}: ${error.message}`).join('\n');
    throw new Error(`Validation failed:\n${errorMessages}`);
  }

  // Construir la ruta del archivo de configuración
  const networkPath = path.join(baseDir, networkName);
  const configPath = path.join(networkPath, 'network-config.json');

  // Verificar que existe el directorio de la red
  if (!fs.existsSync(networkPath)) {
    throw new Error(`Network '${networkName}' not found. Directory does not exist: ${networkPath}`);
  }

  // Cargar la configuración existente
  let config: BesuNetworkConfig;
  if (fs.existsSync(configPath)) {
    const configData = fs.readFileSync(configPath, 'utf-8');
    config = JSON.parse(configData);
  } else {
    // Si no existe archivo de configuración, crear configuración básica
    console.log('⚠️  No network-config.json found, creating basic configuration...');
    config = {
      name: networkName,
      chainId: 1337, // Default chainId
      subnet: '172.24.0.0/16', // Default subnet
      consensus: 'clique',
      gasLimit: '0x47E7C4'
    };
  }

  // Crear instancia de la red con la configuración cargada
  const network = new BesuNetwork(config, baseDir);

  // Actualizar las cuentas (ya validadas)
  const result = await updateNetworkAccounts(network, accounts, {
    performTransfers: options.performTransfers,
    rpcUrl: options.rpcUrl,
    confirmTransactions: options.confirmTransactions
  });

  // Guardar la configuración actualizada solo si fue exitosa
  if (result.configUpdated) {
    const updatedConfigData = JSON.stringify(network.getConfig(), null, 2);
    fs.writeFileSync(configPath, updatedConfigData);
    console.log(`💾 Configuration saved to: ${configPath}`);
  }

  return result;
}

// ============================================================================
// NETWORK NODES UPDATER - Funciones para actualizar nodos existentes
// ============================================================================

export class BesuNetworkUpdater {
  private besuNetwork: BesuNetwork;

  constructor(besuNetwork: BesuNetwork) {
    this.besuNetwork = besuNetwork;
  }

  /**
   * Actualiza los nodos de una red Besu existente
   * Permite cambiar mainIp, configuraciones específicas de nodos, añadir y eliminar nodos
   */
  async updateNetworkNodes(updates: {
    mainIp?: string;
    nodes?: Array<{
      name: string;
      ip?: string;
      rpcPort?: number;
      p2pPort?: number;
    }>;
    addNodes?: BesuNodeDefinition[];
    removeNodes?: string[]; // Array de nombres de nodos a eliminar
  }): Promise<void> {
    let needsRestart = false;
    const errors: ValidationError[] = [];

    const config = this.besuNetwork.getConfig();
    const nodes = this.besuNetwork.getNodes();
    console.log(`🔧 Updating network nodes for: ${config.name}`);

    // Validar mainIp si se proporciona
    if (updates.mainIp && updates.mainIp !== config.mainIp) {
      if (!isValidIpAddress(updates.mainIp)) {
        errors.push({
          field: 'mainIp',
          type: 'format',
          message: 'Main IP must be a valid IP address'
        });
      } else {
        console.log(`📍 Changing main IP from ${config.mainIp || 'not set'} to ${updates.mainIp}`);
        config.mainIp = updates.mainIp;
        needsRestart = true;
      }
    }

    // Validar y aplicar actualizaciones específicas de nodos
    if (updates.nodes && updates.nodes.length > 0) {
      console.log(`🔧 Processing ${updates.nodes.length} node-specific updates...`);
      
      for (const nodeUpdate of updates.nodes) {
        const node = nodes.get(nodeUpdate.name);
        if (!node) {
          errors.push({
            field: `nodes[${nodeUpdate.name}]`,
            type: 'invalid',
            message: `Node '${nodeUpdate.name}' not found in network`
          });
          continue;
        }

        const currentNodeConfig = node.getConfig();
        let nodeChanged = false;

        // Validar y actualizar IP específica del nodo
        if (nodeUpdate.ip && nodeUpdate.ip !== currentNodeConfig.ip) {
          if (!isValidIpAddress(nodeUpdate.ip)) {
            errors.push({
              field: `nodes[${nodeUpdate.name}].ip`,
              type: 'format',
              message: `Invalid IP address for node '${nodeUpdate.name}': ${nodeUpdate.ip}`
            });
          } else {
            console.log(`  📍 Node ${nodeUpdate.name}: IP ${currentNodeConfig.ip} → ${nodeUpdate.ip}`);
            node.updateIp(nodeUpdate.ip);
            nodeChanged = true;
          }
        }

        // Validar y actualizar RPC Port
        if (nodeUpdate.rpcPort && nodeUpdate.rpcPort !== currentNodeConfig.rpcPort) {
          if (!this.isValidPort(nodeUpdate.rpcPort)) {
            errors.push({
              field: `nodes[${nodeUpdate.name}].rpcPort`,
              type: 'range',
              message: `Invalid RPC port for node '${nodeUpdate.name}': ${nodeUpdate.rpcPort}. Must be between 1024 and 65535`
            });
          } else if (this.isPortInUseByOtherNodes(nodeUpdate.rpcPort, nodeUpdate.name, nodes)) {
            errors.push({
              field: `nodes[${nodeUpdate.name}].rpcPort`,
              type: 'duplicate',
              message: `RPC port ${nodeUpdate.rpcPort} is already in use by another node`
            });
          } else {
            console.log(`  🔌 Node ${nodeUpdate.name}: RPC Port ${currentNodeConfig.rpcPort} → ${nodeUpdate.rpcPort}`);
            (node as any).updateRpcPort(nodeUpdate.rpcPort);
            nodeChanged = true;
          }
        }

        // Validar y actualizar P2P Port
        if (nodeUpdate.p2pPort && nodeUpdate.p2pPort !== (currentNodeConfig.port || 30303)) {
          if (!this.isValidPort(nodeUpdate.p2pPort)) {
            errors.push({
              field: `nodes[${nodeUpdate.name}].p2pPort`,
              type: 'range',
              message: `Invalid P2P port for node '${nodeUpdate.name}': ${nodeUpdate.p2pPort}. Must be between 1024 and 65535`
            });
          } else if (this.isPortInUseByOtherNodes(nodeUpdate.p2pPort, nodeUpdate.name, nodes)) {
            errors.push({
              field: `nodes[${nodeUpdate.name}].p2pPort`,
              type: 'duplicate',
              message: `P2P port ${nodeUpdate.p2pPort} is already in use by another node`
            });
          } else {
            const currentP2pPort = currentNodeConfig.port || 30303;
            console.log(`  🔗 Node ${nodeUpdate.name}: P2P Port ${currentP2pPort} → ${nodeUpdate.p2pPort}`);
            (node as any).updateP2pPort(nodeUpdate.p2pPort);
            nodeChanged = true;
          }
        }

        if (nodeChanged) {
          needsRestart = true;
          console.log(`  ✅ Node ${nodeUpdate.name} configuration updated`);
        } else {
          console.log(`  ℹ️  Node ${nodeUpdate.name}: No changes detected`);
        }
      }
    }

    // Validar y procesar nodos a eliminar
    if (updates.removeNodes && updates.removeNodes.length > 0) {
      console.log(`🗑️  Processing ${updates.removeNodes.length} nodes for removal...`);
      
      for (const nodeName of updates.removeNodes) {
        const node = nodes.get(nodeName);
        if (!node) {
          errors.push({
            field: `removeNodes[${nodeName}]`,
            type: 'invalid',
            message: `Node '${nodeName}' not found in network`
          });
          continue;
        }

        // Validar que no se está eliminando el último nodo de un tipo crítico
        const nodeConfig = node.getConfig();
        if (nodeConfig.type === 'bootnode' && this.getNodeCountByType('bootnode', nodes) <= 1) {
          errors.push({
            field: `removeNodes[${nodeName}]`,
            type: 'invalid',
            message: `Cannot remove '${nodeName}': At least one bootnode is required in the network`
          });
        } else if (nodeConfig.type === 'miner' && this.getNodeCountByType('miner', nodes) <= 1) {
          errors.push({
            field: `removeNodes[${nodeName}]`,
            type: 'invalid',
            message: `Cannot remove '${nodeName}': At least one miner is required in the network`
          });
        } else {
          console.log(`  🗑️  Node ${nodeName} (${nodeConfig.type}) marked for removal`);
          needsRestart = true;
        }
      }
    }

    // Validar y procesar nodos a añadir usando las mismas validaciones que createNetwork
    if (updates.addNodes && updates.addNodes.length > 0) {
      console.log(`➕ Processing ${updates.addNodes.length} nodes for addition...`);
      
      // Crear un Set con todas las IPs, puertos y nombres existentes
      const existingIps = new Set<string>();
      const existingRpcEndpoints = new Set<string>();
      const existingP2pEndpoints = new Set<string>();
      const existingNames = new Set<string>();
      
      // Poblar con nodos existentes (excluyendo los que van a ser eliminados)
      for (const [nodeName, node] of nodes) {
        if (updates.removeNodes && updates.removeNodes.includes(nodeName)) continue;
        
        const nodeConfig = node.getConfig();
        existingIps.add(nodeConfig.ip);
        existingRpcEndpoints.add(`${nodeConfig.ip}:${nodeConfig.rpcPort}`);
        existingP2pEndpoints.add(`${nodeConfig.ip}:${nodeConfig.port}`);
        existingNames.add(nodeName);
      }

      // Validar cada nodo a añadir
      for (let i = 0; i < updates.addNodes.length; i++) {
        const newNode = updates.addNodes[i];
        const p2pPort = newNode.p2pPort || 30303;

        // Validar nombre del nodo
        if (!newNode.name || newNode.name.trim().length === 0) {
          errors.push({
            field: `addNodes[${i}].name`,
            type: 'required',
            message: `New node ${i} name is required`
          });
        } else {
          const nameRegex = /^[a-zA-Z0-9_-]+$/;
          if (!nameRegex.test(newNode.name)) {
            errors.push({
              field: `addNodes[${i}].name`,
              type: 'format',
              message: `New node ${i} name can only contain letters, numbers, hyphens and underscores`
            });
          }

          if (existingNames.has(newNode.name)) {
            errors.push({
              field: `addNodes[${i}].name`,
              type: 'duplicate',
              message: `Node name '${newNode.name}' already exists in the network`
            });
          } else {
            existingNames.add(newNode.name);
          }
        }

        // Validar IP del nodo
        if (!isValidIpAddress(newNode.ip)) {
          errors.push({
            field: `addNodes[${i}].ip`,
            type: 'format',
            message: `New node ${i} IP address format is invalid`
          });
        } else {
          if (existingIps.has(newNode.ip)) {
            errors.push({
              field: `addNodes[${i}].ip`,
              type: 'duplicate',
              message: `IP address '${newNode.ip}' is already in use by another node`
            });
          } else {
            existingIps.add(newNode.ip);
          }

          // Validar que la IP está en la subnet
          if (!isIpInSubnet(newNode.ip, config.subnet)) {
            errors.push({
              field: `addNodes[${i}].ip`,
              type: 'invalid',
              message: `New node ${i} IP '${newNode.ip}' is not in the configured subnet '${config.subnet}'`
            });
          }
        }

        // Validar puerto RPC
        if (!this.isValidPort(newNode.rpcPort)) {
          errors.push({
            field: `addNodes[${i}].rpcPort`,
            type: 'range',
            message: `New node ${i} RPC port must be between 1024 and 65535`
          });
        } else {
          const rpcEndpoint = `${newNode.ip}:${newNode.rpcPort}`;
          if (existingRpcEndpoints.has(rpcEndpoint)) {
            errors.push({
              field: `addNodes[${i}].rpcPort`,
              type: 'duplicate',
              message: `RPC endpoint ${rpcEndpoint} is already in use`
            });
          } else {
            existingRpcEndpoints.add(rpcEndpoint);
          }
        }

        // Validar puerto P2P
        if (!this.isValidPort(p2pPort)) {
          errors.push({
            field: `addNodes[${i}].p2pPort`,
            type: 'range',
            message: `New node ${i} P2P port must be between 1024 and 65535`
          });
        } else {
          const p2pEndpoint = `${newNode.ip}:${p2pPort}`;
          if (existingP2pEndpoints.has(p2pEndpoint)) {
            errors.push({
              field: `addNodes[${i}].p2pPort`,
              type: 'duplicate',
              message: `P2P endpoint ${p2pEndpoint} is already in use`
            });
          } else {
            existingP2pEndpoints.add(p2pEndpoint);
          }

          // Verificar que P2P y RPC no conflicten en el mismo nodo
          if (p2pPort === newNode.rpcPort) {
            errors.push({
              field: `addNodes[${i}].p2pPort`,
              type: 'invalid',
              message: `New node ${i} P2P port cannot be the same as RPC port`
            });
          }
        }

        // Validar tipo de nodo
        const validNodeTypes = ['bootnode', 'miner', 'rpc', 'node'];
        if (!validNodeTypes.includes(newNode.type)) {
          errors.push({
            field: `addNodes[${i}].type`,
            type: 'invalid',
            message: `New node ${i} type '${newNode.type}' is invalid. Valid types: ${validNodeTypes.join(', ')}`
          });
        } else {
          console.log(`  ➕ Node ${newNode.name} (${newNode.type}) validated for addition`);
          needsRestart = true;
        }
      }
    }

    // Si hay errores de validación, lanzar excepción
    if (errors.length > 0) {
      const errorMessages = errors.map(error => 
        `${error.field}: ${error.message}`
      ).join('\n');
      throw new Error(`Network nodes update validation failed:\n${errorMessages}`);
    }

    // Si no hay cambios, informar y salir
    if (!needsRestart) {
      console.log('ℹ️  No changes detected in node configuration');
      return;
    }

    // Si hay cambios que requieren reinicio
    console.log('⏸️  Stopping network for node configuration update...');
    await this.besuNetwork.stop();

    // Procesar eliminaciones de nodos
    if (updates.removeNodes && updates.removeNodes.length > 0) {
      console.log('🗑️  Removing nodes...');
      for (const nodeName of updates.removeNodes) {
        if (nodes.has(nodeName)) {
          // Eliminar archivos del nodo
          const fileService = this.besuNetwork.getFileService();
          fileService.removeFolder(nodeName);
          
          // Eliminar del mapa de nodos
          nodes.delete(nodeName);
          console.log(`  ✅ Node ${nodeName} removed successfully`);
        }
      }
    }

    // Procesar adiciones de nodos
    if (updates.addNodes && updates.addNodes.length > 0) {
      console.log('➕ Adding new nodes...');
      
      for (const newNodeDef of updates.addNodes) {
        const nodeConfig = {
          name: newNodeDef.name,
          ip: newNodeDef.ip,
          port: newNodeDef.p2pPort || 30303,
          rpcPort: newNodeDef.rpcPort,
          type: newNodeDef.type
        };
        
        const fileService = this.besuNetwork.getFileService();
        const node = new BesuNode(nodeConfig, fileService);
        nodes.set(newNodeDef.name, node);
        
        console.log(`  ✅ Added ${newNodeDef.type} node: ${newNodeDef.name} (${newNodeDef.ip}:${newNodeDef.rpcPort})`);
      }
    }

    // Actualizar las IPs de los nodos según el mainIp solo si se especifica
    if (updates.mainIp) {
      console.log('📝 Updating node IP addresses...');
      await this.updateNodeIpAddresses(updates.mainIp);
    }

    // Actualizar archivos de configuración TOML con los nuevos parámetros
    console.log('📝 Updating node configuration files...');
    await this.updateNodeConfigurations();

    console.log('✅ Network nodes updated successfully');
    console.log('💡 Use start() to restart the network with new configuration');
  }

  /**
   * Valida si un puerto es válido (rango 1024-65535)
   */
  private isValidPort(port: number): boolean {
    return Number.isInteger(port) && port >= 1024 && port <= 65535;
  }

  /**
   * Verifica si un puerto está siendo usado por otros nodos
   */
  private isPortInUseByOtherNodes(port: number, excludeNodeName: string, nodes: Map<string, BesuNode>): boolean {
    for (const [nodeName, node] of nodes) {
      if (nodeName === excludeNodeName) continue;
      
      const nodeConfig = node.getConfig();
      if (nodeConfig.rpcPort === port || nodeConfig.port === port) {
        return true;
      }
    }
    return false;
  }

  /**
   * Cuenta cuántos nodos de un tipo específico existen
   */
  private getNodeCountByType(nodeType: string, nodes: Map<string, BesuNode>): number {
    let count = 0;
    for (const [, node] of nodes) {
      const nodeConfig = node.getConfig();
      if (nodeConfig.type === nodeType) {
        count++;
      }
    }
    return count;
  }

  /**
   * Actualiza las IPs de los nodos basándose en el nuevo mainIp
   */
  private async updateNodeIpAddresses(mainIp: string): Promise<void> {
    const nodes = this.besuNetwork.getNodes();
    const [baseIp1, baseIp2, baseIp3] = mainIp.split('.');
    const basePrefix = `${baseIp1}.${baseIp2}.${baseIp3}`;
    
    let ipCounter = 10;
    
    for (const [nodeName, node] of nodes) {
      const newIp = `${basePrefix}.${ipCounter}`;
      
      // Actualizar la IP del nodo usando el método updateIp
      node.updateIp(newIp);
      
      console.log(`🔄 Updated ${nodeName} IP to ${newIp}`);
      ipCounter++;
    }
  }

  /**
   * Actualiza las configuraciones de los nodos usando la lógica de BesuNetwork
   */
  private async updateNodeConfigurations(): Promise<void> {
    console.log('📝 Updating node configurations...');
    await updateNodeConfigurations(this.besuNetwork);
  }

  /**
   * Método estático para actualizar nodos por nombre de red
   */
  static async updateNetworkNodesByName(
    networkName: string,
    updates: {
      mainIp?: string;
      nodes?: Array<{
        name: string;
        ip?: string;
        rpcPort?: number;
        p2pPort?: number;
      }>;
      addNodes?: BesuNodeDefinition[];
      removeNodes?: string[];
    },
    options: {
      baseDir?: string;
    } = {}
  ): Promise<void> {
    const baseDir = options.baseDir || "./networks";
    console.log(`🔍 Loading network configuration for: ${networkName}`);

    // Construir la ruta del archivo de configuración
    const networkPath = path.join(baseDir, networkName);
    const configPath = path.join(networkPath, 'network-config.json');

    // Verificar que existe el directorio de la red
    if (!fs.existsSync(networkPath)) {
      throw new Error(`Network '${networkName}' not found. Directory does not exist: ${networkPath}`);
    }

    // Cargar la configuración existente
    let config: BesuNetworkConfig;
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf-8');
      config = JSON.parse(configData);
    } else {
      // Si no existe archivo de configuración, crear configuración básica
      console.log('⚠️  No network-config.json found, creating basic configuration...');
      config = {
        name: networkName,
        chainId: 1337, // Default chainId
        subnet: '172.24.0.0/16', // Default subnet
        consensus: 'clique',
        gasLimit: '0x47E7C4'
      };
    }

    // Crear instancia de la red con la configuración cargada
    const network = new BesuNetwork(config, baseDir);
    
    // Crear el updater y ejecutar la actualización
    const updater = new BesuNetworkUpdater(network);
    
    await updater.updateNetworkNodes(updates);
    
    // Guardar la configuración actualizada
    const updatedConfigData = JSON.stringify(network.getConfig(), null, 2);
    fs.writeFileSync(configPath, updatedConfigData);
    console.log(`💾 Configuration saved to: ${configPath}`);
    
    console.log(`✅ Network ${networkName} nodes updated successfully`);
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS - Funciones de conveniencia para operaciones comunes
// ============================================================================

/**
 * Función de conveniencia para actualizar mainIp de una red
 */
export async function updateMainIp(networkName: string, mainIp: string, baseDir?: string): Promise<void> {
  await BesuNetworkUpdater.updateNetworkNodesByName(
    networkName,
    { mainIp },
    { baseDir }
  );
}

/**
 * Función de conveniencia para actualizar configuración específica de nodos
 */
export async function updateNodeConfigs(
  networkName: string, 
  nodeUpdates: Array<{
    name: string;
    ip?: string;
    rpcPort?: number;
    p2pPort?: number;
  }>, 
  baseDir?: string
): Promise<void> {
  await BesuNetworkUpdater.updateNetworkNodesByName(
    networkName,
    { nodes: nodeUpdates },
    { baseDir }
  );
}

/**
 * Función de conveniencia para añadir nodos a una red
 */
export async function addNodesToNetwork(
  networkName: string,
  newNodes: BesuNodeDefinition[],
  baseDir?: string
): Promise<void> {
  // We need to directly update the config file to add nodes
  const baseDirPath = baseDir || "./networks";
  console.log(`🔍 Loading network configuration for adding nodes to: ${networkName}`);

  // Construct path to network config file
  const networkPath = path.join(baseDirPath, networkName);
  const configPath = path.join(networkPath, 'network-config.json');

  // Verify network directory exists
  if (!fs.existsSync(networkPath)) {
    throw new Error(`Network '${networkName}' not found. Directory does not exist: ${networkPath}`);
  }

  // Load existing config and raw file data to preserve any extra properties
  let configJson: any;
  let config: BesuNetworkConfig;
  
  if (fs.existsSync(configPath)) {
    const configData = fs.readFileSync(configPath, 'utf-8');
    configJson = JSON.parse(configData);
    // Extract standard config properties
    config = {
      name: configJson.name,
      chainId: configJson.chainId,
      subnet: configJson.subnet,
      consensus: configJson.consensus,
      gasLimit: configJson.gasLimit,
      blockTime: configJson.blockTime,
      mainIp: configJson.mainIp,
      signerAccounts: configJson.signerAccounts,
      accounts: configJson.accounts
    };
  } else {
    // If no config file, create basic config
    console.log('⚠️  No network-config.json found, creating basic configuration...');
    config = {
      name: networkName,
      chainId: 1337, // Default chainId
      subnet: '172.24.0.0/16', // Default subnet
      consensus: 'clique',
      gasLimit: '0x47E7C4'
    };
    configJson = { ...config };
  }

  // Create or update nodes array in raw config JSON
  if (!configJson.nodes) {
    configJson.nodes = [];
  }

  // Add new nodes
  for (const newNode of newNodes) {
    // Check if node already exists
    const existingIndex = configJson.nodes.findIndex((n: any) => n.name === newNode.name);
    if (existingIndex >= 0) {
      // Update existing node
      configJson.nodes[existingIndex] = { ...configJson.nodes[existingIndex], ...newNode };
      console.log(`🔄 Updated existing node: ${newNode.name}`);
    } else {
      // Add new node
      configJson.nodes.push(newNode);
      console.log(`➕ Added new node: ${newNode.name}`);
    }
  }

  // Save updated config with all properties
  fs.writeFileSync(configPath, JSON.stringify(configJson, null, 2));
  console.log(`💾 Updated configuration saved to: ${configPath}`);
}

/**
 * Función de conveniencia para eliminar nodos de una red
 */
export async function removeNodesFromNetwork(
  networkName: string,
  nodeNames: string[],
  baseDir?: string
): Promise<void> {
  await BesuNetworkUpdater.updateNetworkNodesByName(
    networkName,
    { removeNodes: nodeNames },
    { baseDir }
  );
}

// ============================================================================
// UTILITY FUNCTIONS - Funciones auxiliares
// ============================================================================

/**
 * Actualiza las IPs de los nodos para una nueva subnet
 */
export function updateNodesForNewSubnet(network: BesuNetwork, newSubnet: string): void {
  const [baseNetwork] = newSubnet.split('/');
  const baseParts = baseNetwork.split('.');
  const basePrefix = `${baseParts[0]}.${baseParts[1]}.${baseParts[2]}`;
  
  let ipCounter = 10;
  const nodes = network.getNodes();
  
  for (const [nodeName, node] of nodes) {
    const currentConfig = node.getConfig();
    const newIp = `${basePrefix}.${ipCounter}`;
    
    // Actualizar la IP del nodo
    node.updateIp(newIp);
    
    console.log(`🔄 Updated ${nodeName} IP to ${newIp}`);
    ipCounter++;
  }
}

/**
 * Actualiza los archivos de configuración TOML de todos los nodos
 */
export async function updateNodeConfigurations(network: BesuNetwork): Promise<void> {
  const bootnodeNodes = network.getNodesByType('bootnode');
  const bootnodeEnodes = bootnodeNodes.map(node => node.getKeys().enode);
  const nodes = network.getNodes();
  const config = network.getConfig();
  const fileService = network.getFileService();
  
  for (const [nodeName, node] of nodes) {
    const nodeConfig = node.getConfig();
    
    // Generar nueva configuración TOML
    let tomlConfig: string;
    if (nodeConfig.type === 'bootnode') {
      tomlConfig = node.generateTomlConfig(config);
    } else {
      tomlConfig = node.generateTomlConfig(config, bootnodeEnodes);
    }
    
    // Guardar nueva configuración
    fileService.createFile(nodeConfig.name, 'config.toml', tomlConfig);
  }
}

/**
 * Obtiene el nodo miner de la red
 */
export function getMinerNode(network: BesuNetwork): BesuNode | null {
  const minerNodes = network.getNodesByType('miner');
  return minerNodes.length > 0 ? minerNodes[0] : null;
}

/**
 * Obtiene el puerto RPC del miner
 */
export function getMinerRpcPort(network: BesuNetwork): number {
  const minerNode = getMinerNode(network);
  if (!minerNode) {
    throw new Error('No miner node found in the network');
  }
  return minerNode.getConfig().rpcPort;
}

/**
 * Valida si una dirección Ethereum es válida
 */
export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Valida si una cantidad en wei es válida
 */
export function isValidWeiAmount(weiAmount: string): boolean {
  try {
    const amount = BigInt(weiAmount);
    return amount > 0n;
  } catch (error) {
    return false;
  }
}

/**
 * Valida si una cantidad en wei es razonable
 */
export function isReasonableWeiAmount(weiAmount: string): boolean {
  try {
    const amount = BigInt(weiAmount);
    const maxReasonable = BigInt("1000000000000000000000000"); // 1,000,000 ETH in wei
    return amount > 0n && amount <= maxReasonable;
  } catch (error) {
    return false;
  }
}

/**
 * Valida si una subnet es válida
 */
export function isValidSubnet(subnet: string): boolean {
  const subnetRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
  if (!subnetRegex.test(subnet)) {
    return false;
  }
  
  const [network, mask] = subnet.split('/');
  const maskNum = parseInt(mask, 10);
  
  if (maskNum < 8 || maskNum > 30) {
    return false;
  }
  
  const parts = network.split('.').map(num => parseInt(num, 10));
  return parts.every(part => part >= 0 && part <= 255);
}

/**
 * Valida si una dirección IP es válida
 */
export function isValidIpAddress(ip: string): boolean {
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip)) {
    return false;
  }
  
  const parts = ip.split('.').map(num => parseInt(num, 10));
  return parts.every(part => part >= 0 && part <= 255);
}

/**
 * Verifica si una IP está en una subnet
 */
export function isIpInSubnet(ip: string, subnet: string): boolean {
  const [subnetNetwork, subnetMask] = subnet.split('/');
  const maskBits = parseInt(subnetMask, 10);
  
  const ipNum = ipToNumber(ip);
  const subnetNum = ipToNumber(subnetNetwork);
  const mask = (0xFFFFFFFF << (32 - maskBits)) >>> 0;
  
  return (ipNum & mask) === (subnetNum & mask);
}

/**
 * Convierte una IP a número
 */
export function ipToNumber(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

/**
 * Actualiza los nodos de una red Besu por nombre
 * Permite agregar, eliminar o actualizar nodos de una red existente
 */
export async function updateNetworkNodesByName(
  networkName: string,
  nodeUpdates: {
    add?: Array<BesuNodeDefinition>,
    update?: Array<{
      name: string,
      updates: Partial<BesuNodeDefinition>
    }>,
    remove?: Array<string>
  },
  options: {
    baseDir?: string;
    startAfterUpdate?: boolean;
  } = {}
): Promise<{
  success: boolean;
  nodesAdded?: string[];
  nodesUpdated?: string[];
  nodesRemoved?: string[];
  errors?: string[];
}> {
  const baseDir = options.baseDir || "./networks";
  console.log(`🔍 Loading network configuration for: ${networkName}`);

  // Construir la ruta del archivo de configuración
  const networkPath = path.join(baseDir, networkName);
  const configPath = path.join(networkPath, 'network-config.json');

  // Verificar que existe el directorio de la red
  if (!fs.existsSync(networkPath)) {
    throw new Error(`Network '${networkName}' not found. Directory does not exist: ${networkPath}`);
  }

  // Cargar la configuración existente
  let config: BesuNetworkConfig;
  let rawConfig: any = {};
  
  if (fs.existsSync(configPath)) {
    const configData = fs.readFileSync(configPath, 'utf-8');
    rawConfig = JSON.parse(configData);
    config = {
      name: rawConfig.name,
      chainId: rawConfig.chainId,
      subnet: rawConfig.subnet,
      consensus: rawConfig.consensus,
      gasLimit: rawConfig.gasLimit,
      blockTime: rawConfig.blockTime,
      mainIp: rawConfig.mainIp,
      signerAccounts: rawConfig.signerAccounts,
      accounts: rawConfig.accounts
    };
  } else {
    // Si no existe archivo de configuración, crear una configuración básica
    console.log(`⚠️  Network configuration file not found: ${configPath}`);
    console.log('Creating basic configuration from network structure...');
    
    // Intentar inferir configuración de la estructura de directorios
    const nodesDir = fs.readdirSync(networkPath)
      .filter(item => {
        const itemPath = path.join(networkPath, item);
        return fs.statSync(itemPath).isDirectory() && 
               !['data', 'logs', 'tmp'].includes(item);
      });
    
    // Crear nodos a partir de los directorios
    const nodeDirs = nodesDir.map(nodeName => {
      const nodePath = path.join(networkPath, nodeName);
      // Determinar tipo de nodo por nombre
      let nodeType = 'node';
      if (nodeName.includes('bootnode')) nodeType = 'bootnode';
      else if (nodeName.includes('miner')) nodeType = 'miner';
      else if (nodeName.includes('rpc')) nodeType = 'rpc';
      
      // Determinar puerto RPC basado en tipo
      let rpcPort = 8545;
      if (nodeType === 'miner') rpcPort = 8546;
      else if (nodeType === 'rpc') rpcPort = 8547;
      
      return {
        name: nodeName,
        type: nodeType,
        ip: `172.24.0.${10 + nodesDir.indexOf(nodeName)}`,
        rpcPort,
        p2pPort: 30303
      };
    });
    
    // Configuración por defecto
    config = {
      name: networkName,
      chainId: 1337,
      subnet: '172.24.0.0/16',
      consensus: 'clique',
      gasLimit: '0x47E7C4'
    };
    
    // Guardar todos los nodos en el archivo de configuración
    rawConfig = { 
      ...config, 
      nodes: nodeDirs 
    };
    
    // Escribir configuración básica para uso futuro
    fs.writeFileSync(configPath, JSON.stringify(rawConfig, null, 2));
    console.log(`💾 Created basic configuration in ${configPath}`);
  }

  // Crear instancia de la red con la configuración cargada
  const network = new BesuNetwork(config, baseDir);
  
  // Resultados para devolver
  const result = {
    success: true,
    nodesAdded: [] as string[],
    nodesUpdated: [] as string[],
    nodesRemoved: [] as string[],
    errors: [] as string[]
  };

  try {
    // Detener la red primero para realizar cambios
    console.log('⏸️  Stopping network for node updates...');
    await network.stop();

    // 1. Agregar nuevos nodos
    if (nodeUpdates.add && nodeUpdates.add.length > 0) {
      console.log(`➕ Adding ${nodeUpdates.add.length} new nodes...`);
      await addNodesToNetwork(networkName, nodeUpdates.add, baseDir);
      result.nodesAdded = nodeUpdates.add.map(node => node.name);
      
      // Reload the network to include the new nodes
      // Instead of updating the internal network object directly, we'll create nodes through the file
      for (const nodeDefinition of nodeUpdates.add) {
        const nodeDirectory = path.join(networkPath, nodeDefinition.name);
        if (!fs.existsSync(nodeDirectory)) {
          fs.mkdirSync(nodeDirectory, { recursive: true });
        }
        
        // Create the node key files
        const cryptoLib = new CryptoLib();
        const { privateKey, publicKey, address } = cryptoLib.generateKeyPair(nodeDefinition.ip || '127.0.0.1');
        
        fs.writeFileSync(path.join(nodeDirectory, 'key.priv'), privateKey);
        fs.writeFileSync(path.join(nodeDirectory, 'key.pub'), publicKey);
        fs.writeFileSync(path.join(nodeDirectory, 'address'), address.substring(2)); // Remove 0x prefix
        
        // Create enode file
        const enodeUrl = `enode://${publicKey.substring(2)}@${nodeDefinition.ip}:30303`;
        fs.writeFileSync(path.join(nodeDirectory, 'enode'), enodeUrl);
        
        console.log(`  ✅ Created node files for: ${nodeDefinition.name}`);
      }
    }

    // 2. Actualizar nodos existentes
    if (nodeUpdates.update && nodeUpdates.update.length > 0) {
      console.log(`🔄 Updating ${nodeUpdates.update.length} existing nodes...`);
      
      for (const update of nodeUpdates.update) {
        const node = network.getNodeByName(update.name);
        if (!node) {
          result.errors.push(`Node ${update.name} not found for update`);
          continue;
        }
        
        // Aplicar actualizaciones al nodo
        try {
          // Actualizar IP si es necesario
          if (update.updates.ip && update.updates.ip !== node.getConfig().ip) {
            node.updateIp(update.updates.ip);
            
            // También actualizar el archivo enode para reflejar la nueva IP
            const nodeDirPath = path.join(networkPath, update.name);
            if (fs.existsSync(nodeDirPath)) {
              const enodeFile = path.join(nodeDirPath, 'enode');
              if (fs.existsSync(enodeFile)) {
                const enodeContent = fs.readFileSync(enodeFile, 'utf-8');
                // Actualizar la IP en la URL del enode
                const updatedEnode = enodeContent.replace(
                  /enode:\/\/([a-f0-9]+)@([0-9.]+):([0-9]+)/,
                  `enode://$1@${update.updates.ip}:$3`
                );
                fs.writeFileSync(enodeFile, updatedEnode);
                console.log(`  ✅ Updated enode file for ${update.name} with new IP: ${update.updates.ip}`);
              }
            }
          }
          
          // Actualizar puertos si es necesario
          if (update.updates.rpcPort && update.updates.rpcPort !== node.getConfig().rpcPort) {
            // No hay método setter directo, actualizar a través del objeto de configuración
            node.getConfig().rpcPort = update.updates.rpcPort;
          }
          
          if (update.updates.p2pPort && update.updates.p2pPort !== 30303) {
            // El p2pPort es fijo en 30303 según la implementación actual
            console.log(`⚠️ Warning: Cannot update p2pPort from 30303 - hardcoded value in the implementation`);
          }
          
          // Otros posibles updates (dependerá de la implementación de BesuNode)
          
          result.nodesUpdated.push(update.name);
        } catch (error) {
          result.errors.push(`Failed to update node ${update.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // Actualizar archivos de configuración para los nodos
      await updateNodeConfigurations(network);
    }

    // 3. Eliminar nodos
    if (nodeUpdates.remove && nodeUpdates.remove.length > 0) {
      console.log(`➖ Removing ${nodeUpdates.remove.length} nodes...`);
      await removeNodesFromNetwork(networkName, nodeUpdates.remove, baseDir);
      result.nodesRemoved = nodeUpdates.remove;
    }

    // Cargar la configuración actual para asegurarnos de preservar los nodos
    const currentConfigPath = path.join(networkPath, 'network-config.json');
    let updatedConfig = network.getConfig();
    
    // Cargar la configuración existente para mantener la información de nodos
    if (fs.existsSync(currentConfigPath)) {
      try {
        const existingConfigStr = fs.readFileSync(currentConfigPath, 'utf-8');
        const existingConfig = JSON.parse(existingConfigStr);
        
        // Si hay un array de nodos en la configuración existente, preservarlo
        if (existingConfig && existingConfig.nodes) {
          // Crear un objeto para guardar toda la configuración
          const fullConfig: any = { ...updatedConfig };
          
          // Añadir o actualizar los nodos según lo necesitemos
          if (!fullConfig.nodes) {
            fullConfig.nodes = [];
          }
          
          // Mantener nodos existentes y actualizar/añadir los nuevos
          const existingNodes = [...existingConfig.nodes];
          
          // Añadir nuevos nodos si se especificaron
          if (nodeUpdates.add && nodeUpdates.add.length > 0) {
            for (const newNode of nodeUpdates.add) {
              const existingIndex = existingNodes.findIndex(n => n.name === newNode.name);
              if (existingIndex >= 0) {
                // Actualizar nodo existente
                existingNodes[existingIndex] = { ...existingNodes[existingIndex], ...newNode };
              } else {
                // Añadir nuevo nodo
                existingNodes.push(newNode);
              }
            }
          }
          
          // Actualizar nodos existentes si se especificaron
          if (nodeUpdates.update && nodeUpdates.update.length > 0) {
            for (const updateInfo of nodeUpdates.update) {
              const existingIndex = existingNodes.findIndex(n => n.name === updateInfo.name);
              if (existingIndex >= 0) {
                // Actualizar nodo existente
                existingNodes[existingIndex] = { 
                  ...existingNodes[existingIndex], 
                  ...updateInfo.updates,
                  // Asegurarse de que se aplican correctamente las actualizaciones
                  ip: updateInfo.updates.ip || existingNodes[existingIndex].ip
                };
              }
            }
          }
          
          // Eliminar nodos si se especificaron
          if (nodeUpdates.remove && nodeUpdates.remove.length > 0) {
            for (const nodeName of nodeUpdates.remove) {
              const index = existingNodes.findIndex(n => n.name === nodeName);
              if (index >= 0) {
                existingNodes.splice(index, 1);
              }
            }
          }
          
          fullConfig.nodes = existingNodes;
          
          // Guardar la configuración actualizada con los nodos
          fs.writeFileSync(configPath, JSON.stringify(fullConfig, null, 2));
          console.log(`💾 Configuration saved to: ${configPath}`);
        } else {
          // No hay nodos en la configuración existente
          const updatedConfigData = JSON.stringify(network.getConfig(), null, 2);
          fs.writeFileSync(configPath, updatedConfigData);
          console.log(`💾 Configuration saved to: ${configPath}`);
        }
      } catch (error) {
        console.error('Error reading/parsing existing config:', error);
        const updatedConfigData = JSON.stringify(network.getConfig(), null, 2);
        fs.writeFileSync(configPath, updatedConfigData);
        console.log(`💾 Configuration saved to: ${configPath}`);
      }
    } else {
      // No existe configuración previa
      const updatedConfigData = JSON.stringify(network.getConfig(), null, 2);
      fs.writeFileSync(configPath, updatedConfigData);
      console.log(`💾 Configuration saved to: ${configPath}`);
    }

    // Iniciar la red si se solicita
    if (options.startAfterUpdate) {
      console.log('▶️  Starting network with updated configuration...');
      await network.start();
    }

    // Retornar el resultado final de la operación
    return {
      success: true,
      nodesAdded: result.nodesAdded,
      nodesUpdated: result.nodesUpdated,
      nodesRemoved: result.nodesRemoved,
      errors: result.errors.length > 0 ? result.errors : []
    };
  } catch (error) {
    console.error('❌ Error updating network nodes:', error);
    return {
      success: false,
      errors: [(error instanceof Error) ? error.message : 'Unknown error']
    };
  }
}
