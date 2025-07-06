"use strict";
/**
 * BesuNetwork Update Functions
 * Author: Javier Ruiz-Canela López
 * Email: jrcanelalopez@gmail.com
 * Date: June 30, 2025
 *
 * This file contains all update-related functions for Hyperledger Besu networks,
 * extracted from the main create-besu-networks.ts file for better organization.
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BesuNetworkUpdater = void 0;
exports.updateNetworkConfig = updateNetworkConfig;
exports.validateAccountUpdates = validateAccountUpdates;
exports.updateNetworkAccounts = updateNetworkAccounts;
exports.validateAccountUpdatesStatic = validateAccountUpdatesStatic;
exports.updateNetworkAccountsByName = updateNetworkAccountsByName;
exports.updateMainIp = updateMainIp;
exports.updateNodeConfigs = updateNodeConfigs;
exports.addNodesToNetwork = addNodesToNetwork;
exports.removeNodesFromNetwork = removeNodesFromNetwork;
exports.updateNodesForNewSubnet = updateNodesForNewSubnet;
exports.updateNodeConfigurations = updateNodeConfigurations;
exports.getMinerNode = getMinerNode;
exports.getMinerRpcPort = getMinerRpcPort;
exports.isValidEthereumAddress = isValidEthereumAddress;
exports.isValidWeiAmount = isValidWeiAmount;
exports.isReasonableWeiAmount = isReasonableWeiAmount;
exports.isValidSubnet = isValidSubnet;
exports.isValidIpAddress = isValidIpAddress;
exports.isIpInSubnet = isIpInSubnet;
exports.ipToNumber = ipToNumber;
exports.updateNetworkNodesByName = updateNetworkNodesByName;
var fs = require("fs");
var path = require("path");
var ethers_1 = require("ethers");
var create_besu_networks_1 = require("./create-besu-networks");
// ============================================================================
// BESU NETWORK UPDATE METHODS - Métodos de actualización para BesuNetwork
// ============================================================================
/**
 * Modifica la configuración de una red Besu existente sin afectar el genesis
 * Solo permite cambios en subnet, gasLimit y blockTime
 */
function updateNetworkConfig(network, updates) {
    return __awaiter(this, void 0, void 0, function () {
        var needsRestart, needsSubnetUpdate, errors, config, gasLimit, errorMessages, dockerManager, networkPath, configPath;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    needsRestart = false;
                    needsSubnetUpdate = false;
                    errors = [];
                    config = network.getConfig();
                    // Actualizar subnet si se proporciona
                    if (updates.subnet && updates.subnet !== config.subnet) {
                        // Usar las mismas validaciones que en validateNetworkBasicConfig
                        if (!isValidSubnet(updates.subnet)) {
                            errors.push({
                                field: 'subnet',
                                type: 'format',
                                message: 'Invalid subnet format. Expected format: xxx.xxx.xxx.xxx/xx (e.g., 172.24.0.0/16)'
                            });
                        }
                        else if (!(0, create_besu_networks_1.isSubnetAvailable)(updates.subnet)) {
                            errors.push({
                                field: 'subnet',
                                type: 'duplicate',
                                message: "Subnet ".concat(updates.subnet, " is already in use by another Docker network")
                            });
                        }
                        if (errors.length === 0) {
                            console.log("\uD83D\uDD04 Updating subnet from ".concat(config.subnet, " to ").concat(updates.subnet));
                            config.subnet = updates.subnet;
                            needsSubnetUpdate = true;
                            needsRestart = true;
                        }
                    }
                    // Actualizar gasLimit si se proporciona
                    if (updates.gasLimit && updates.gasLimit !== config.gasLimit) {
                        gasLimit = parseInt(updates.gasLimit, 16);
                        if (isNaN(gasLimit) || gasLimit < 4712388 || gasLimit > 100000000) {
                            errors.push({
                                field: 'gasLimit',
                                type: 'range',
                                message: 'Gas limit must be between 4,712,388 (0x47E7C4) and 100,000,000 (0x5F5E100)'
                            });
                        }
                        if (errors.length === 0) {
                            console.log("\uD83D\uDD04 Updating gas limit from ".concat(config.gasLimit, " to ").concat(updates.gasLimit));
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
                            console.log("\uD83D\uDD04 Updating block time from ".concat(config.blockTime || 'default', " to ").concat(updates.blockTime));
                            config.blockTime = updates.blockTime;
                            needsRestart = true;
                        }
                    }
                    // Si hay errores de validación, lanzar excepción con todos los errores
                    if (errors.length > 0) {
                        errorMessages = errors.map(function (error) {
                            return "".concat(error.field, ": ").concat(error.message);
                        }).join('\n');
                        throw new Error("Network configuration update validation failed:\n".concat(errorMessages));
                    }
                    if (!needsRestart) return [3 /*break*/, 3];
                    console.log('⏸️  Stopping network for configuration update...');
                    return [4 /*yield*/, network.stop()];
                case 1:
                    _b.sent();
                    // Si cambió la subnet, recrear la red Docker
                    if (needsSubnetUpdate) {
                        console.log('🔧 Recreating Docker network with new subnet...');
                        dockerManager = network.dockerManager;
                        dockerManager.removeNetwork();
                        // Actualizar IPs de los nodos para la nueva subnet
                        updateNodesForNewSubnet(network, updates.subnet);
                        // Crear nueva red Docker
                        dockerManager.createNetwork(updates.subnet, {
                            network: config.name,
                            type: "besu",
                        });
                    }
                    // Regenerar archivos de configuración TOML con los nuevos parámetros
                    console.log('📝 Updating node configuration files...');
                    return [4 /*yield*/, updateNodeConfigurations(network)];
                case 2:
                    _b.sent();
                    networkPath = path.join(((_a = network.fileService) === null || _a === void 0 ? void 0 : _a.basePath) || './networks', config.name);
                    configPath = path.join(networkPath, 'network-config.json');
                    try {
                        // Asegurar que el directorio existe
                        if (!fs.existsSync(path.dirname(configPath))) {
                            fs.mkdirSync(path.dirname(configPath), { recursive: true });
                        }
                        // Escribir el archivo de configuración
                        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                        console.log("\uD83D\uDCBE Configuration saved to: ".concat(configPath));
                    }
                    catch (error) {
                        console.error("\u26A0\uFE0F Error saving network configuration: ".concat(error instanceof Error ? error.message : 'Unknown error'));
                    }
                    console.log('✅ Network configuration updated successfully');
                    console.log('💡 Use start() to restart the network with new configuration');
                    return [3 /*break*/, 4];
                case 3:
                    console.log('ℹ️  No changes detected in configuration');
                    _b.label = 4;
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Valida las actualizaciones de cuentas antes de aplicarlas
 */
function validateAccountUpdates(network, accounts) {
    var errors = [];
    var usedAddresses = new Set();
    if (!accounts || accounts.length === 0) {
        errors.push({
            field: 'accounts',
            type: 'required',
            message: 'At least one account must be provided'
        });
        return errors;
    }
    accounts.forEach(function (account, index) {
        if (!isValidEthereumAddress(account.address)) {
            errors.push({
                field: "accounts[".concat(index, "].address"),
                type: 'format',
                message: "Account ".concat(index, " address must be a valid Ethereum address (0x...)")
            });
        }
        else {
            var lowerAddress = account.address.toLowerCase();
            if (usedAddresses.has(lowerAddress)) {
                errors.push({
                    field: "accounts[".concat(index, "].address"),
                    type: 'duplicate',
                    message: "Account ".concat(index, " address is duplicated")
                });
            }
            else {
                usedAddresses.add(lowerAddress);
            }
        }
        if (!isValidWeiAmount(account.weiAmount)) {
            errors.push({
                field: "accounts[".concat(index, "].weiAmount"),
                type: 'format',
                message: "Account ".concat(index, " wei amount must be a valid positive number")
            });
        }
        else if (!isReasonableWeiAmount(account.weiAmount)) {
            errors.push({
                field: "accounts[".concat(index, "].weiAmount"),
                type: 'range',
                message: "Account ".concat(index, " wei amount should be between 1 wei and 10^24 wei (1,000,000 ETH max)")
            });
        }
    });
    return errors;
}
/**
 * Actualiza las cuentas de una red Besu existente sin modificar el genesis
 * Permite añadir nuevas cuentas o actualizar balances existentes en una red activa
 */
function updateNetworkAccounts(network_1, accounts_1) {
    return __awaiter(this, arguments, void 0, function (network, accounts, options) {
        var config, performTransfers, confirmTransactions, result, validationErrors, errorMessages, minerWallet, provider, minerNode, url, fileService, rawPrivateKey, minerPrivateKey, error_1, performTransfer, allTransfersSuccessful, updatedAccounts, _i, accounts_2, account, transferResult, _loop_1, _a, updatedAccounts_1, newAccount, successfulTransfers, totalTransfers, failedTransfers, _b, failedTransfers_1, transfer;
        var _this = this;
        var _c, _d;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    config = network.getConfig();
                    console.log("\uD83D\uDCDD Updating network accounts for: ".concat(config.name));
                    performTransfers = (_c = options.performTransfers) !== null && _c !== void 0 ? _c : false;
                    confirmTransactions = (_d = options.confirmTransactions) !== null && _d !== void 0 ? _d : true;
                    result = {
                        success: true,
                        configUpdated: false,
                        transfersExecuted: []
                    };
                    validationErrors = validateAccountUpdates(network, accounts);
                    if (validationErrors.length > 0) {
                        errorMessages = validationErrors.map(function (error) { return "".concat(error.field, ": ").concat(error.message); }).join('\n');
                        throw new Error("Validation failed:\n".concat(errorMessages));
                    }
                    minerWallet = null;
                    provider = null;
                    if (!performTransfers) return [3 /*break*/, 4];
                    console.log("\uD83D\uDCB0 Preparing to perform actual transfers from miner...");
                    minerNode = getMinerNode(network);
                    if (!minerNode) {
                        throw new Error('No miner node found in the network. Cannot perform transfers.');
                    }
                    url = options.rpcUrl || "http://localhost:".concat(getMinerRpcPort(network) + 10000);
                    provider = new ethers_1.ethers.JsonRpcProvider(url);
                    fileService = network.getFileService();
                    rawPrivateKey = fileService.readFile(minerNode.getConfig().name, "key.priv");
                    minerPrivateKey = rawPrivateKey.startsWith('0x') ? rawPrivateKey : "0x".concat(rawPrivateKey);
                    minerWallet = new ethers_1.ethers.Wallet(minerPrivateKey, provider);
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, provider.getBlockNumber()];
                case 2:
                    _e.sent();
                    console.log("\u2705 Connected to miner RPC at ".concat(url));
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _e.sent();
                    throw new Error("Cannot connect to miner RPC at ".concat(url, ". Make sure the network is running."));
                case 4:
                    performTransfer = function (address, weiAmount) { return __awaiter(_this, void 0, void 0, function () {
                        var currentBalance, targetBalance, transferAmount, minerBalance, gasEstimate, totalRequired, error, transaction, txResponse, receipt, error_2, errorMessage;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    if (!performTransfers || !minerWallet || !provider) {
                                        return [2 /*return*/, { success: true }]; // Sin transferencias, solo actualización de config
                                    }
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 7, , 8]);
                                    return [4 /*yield*/, provider.getBalance(address)];
                                case 2:
                                    currentBalance = _a.sent();
                                    targetBalance = BigInt(weiAmount);
                                    console.log("   \uD83D\uDCCA Current balance for ".concat(address, ": ").concat(ethers_1.ethers.formatEther(currentBalance), " ETH"));
                                    console.log("   \uD83C\uDFAF Target balance: ".concat(ethers_1.ethers.formatEther(targetBalance), " ETH"));
                                    if (currentBalance >= targetBalance) {
                                        console.log("   \u23ED\uFE0F  Account already has sufficient balance, skipping transfer");
                                        return [2 /*return*/, { success: true }];
                                    }
                                    transferAmount = targetBalance - currentBalance;
                                    console.log("   \uD83D\uDCB8 Transfer amount needed: ".concat(ethers_1.ethers.formatEther(transferAmount), " ETH"));
                                    return [4 /*yield*/, provider.getBalance(minerWallet.address)];
                                case 3:
                                    minerBalance = _a.sent();
                                    gasEstimate = BigInt(21000) * ethers_1.ethers.parseUnits('20', 'gwei');
                                    totalRequired = transferAmount + gasEstimate;
                                    if (minerBalance < totalRequired) {
                                        error = "Insufficient miner balance. Required: ".concat(ethers_1.ethers.formatEther(totalRequired), " ETH, Available: ").concat(ethers_1.ethers.formatEther(minerBalance), " ETH");
                                        console.log("   \u274C ".concat(error));
                                        return [2 /*return*/, { success: false, error: error }];
                                    }
                                    // Realizar la transferencia
                                    console.log("   \uD83D\uDCE4 Sending ".concat(ethers_1.ethers.formatEther(transferAmount), " ETH to ").concat(address, "..."));
                                    transaction = {
                                        to: address,
                                        value: transferAmount,
                                        gasLimit: 21000,
                                        gasPrice: ethers_1.ethers.parseUnits('20', 'gwei')
                                    };
                                    return [4 /*yield*/, minerWallet.sendTransaction(transaction)];
                                case 4:
                                    txResponse = _a.sent();
                                    console.log("   \u2705 Transaction sent: ".concat(txResponse.hash));
                                    if (!confirmTransactions) return [3 /*break*/, 6];
                                    console.log("   \u23F3 Waiting for transaction confirmation...");
                                    return [4 /*yield*/, txResponse.wait()];
                                case 5:
                                    receipt = _a.sent();
                                    console.log("   \u2705 Transaction confirmed in block ".concat(receipt === null || receipt === void 0 ? void 0 : receipt.blockNumber));
                                    _a.label = 6;
                                case 6: return [2 /*return*/, {
                                        success: true,
                                        transactionHash: txResponse.hash
                                    }];
                                case 7:
                                    error_2 = _a.sent();
                                    errorMessage = error_2 instanceof Error ? error_2.message : 'Unknown error';
                                    console.log("   \u274C Transfer failed: ".concat(errorMessage));
                                    return [2 /*return*/, {
                                            success: false,
                                            error: errorMessage
                                        }];
                                case 8: return [2 /*return*/];
                            }
                        });
                    }); };
                    // Procesar todas las cuentas
                    console.log("\uD83D\uDD04 Processing ".concat(accounts.length, " accounts..."));
                    allTransfersSuccessful = true;
                    updatedAccounts = [];
                    _i = 0, accounts_2 = accounts;
                    _e.label = 5;
                case 5:
                    if (!(_i < accounts_2.length)) return [3 /*break*/, 8];
                    account = accounts_2[_i];
                    console.log("   \uD83D\uDCDD Processing account: ".concat(account.address));
                    return [4 /*yield*/, performTransfer(account.address, account.weiAmount)];
                case 6:
                    transferResult = _e.sent();
                    result.transfersExecuted.push(__assign({ address: account.address, amount: ethers_1.ethers.formatEther(account.weiAmount) }, transferResult));
                    if (transferResult.success) {
                        updatedAccounts.push(account);
                        console.log("   \u2705 Account processed: ".concat(account.address, " (").concat(ethers_1.ethers.formatEther(account.weiAmount), " ETH)"));
                    }
                    else {
                        allTransfersSuccessful = false;
                        console.log("   \u274C Failed to process account: ".concat(account.address));
                    }
                    _e.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 5];
                case 8:
                    // Actualizar configuración solo si todas las transferencias fueron exitosas
                    if (allTransfersSuccessful) {
                        // Actualizar o añadir cuentas a la configuración existente
                        if (!config.accounts) {
                            config.accounts = [];
                        }
                        _loop_1 = function (newAccount) {
                            var existingIndex = config.accounts.findIndex(function (existing) { return existing.address.toLowerCase() === newAccount.address.toLowerCase(); });
                            if (existingIndex >= 0) {
                                // Update existing account
                                config.accounts[existingIndex] = newAccount;
                            }
                            else {
                                // Add new account
                                config.accounts.push(newAccount);
                            }
                        };
                        // Merge accounts - update existing or add new ones
                        for (_a = 0, updatedAccounts_1 = updatedAccounts; _a < updatedAccounts_1.length; _a++) {
                            newAccount = updatedAccounts_1[_a];
                            _loop_1(newAccount);
                        }
                        result.configUpdated = true;
                        console.log("   \u2705 All accounts updated successfully");
                    }
                    else {
                        result.success = false;
                        console.log("   \u274C Some account transfers failed, configuration not updated");
                    }
                    // Resumen final
                    if (result.success) {
                        console.log('✅ Network accounts updated successfully');
                        if (performTransfers) {
                            successfulTransfers = result.transfersExecuted.filter(function (t) { return t.success; }).length;
                            totalTransfers = result.transfersExecuted.length;
                            console.log("\uD83D\uDCB8 Transfers completed: ".concat(successfulTransfers, "/").concat(totalTransfers, " successful"));
                        }
                        if (result.configUpdated) {
                            console.log('📝 Network configuration updated with new account balances');
                        }
                    }
                    else {
                        console.log('❌ Network accounts update completed with errors');
                        failedTransfers = result.transfersExecuted.filter(function (t) { return !t.success; });
                        for (_b = 0, failedTransfers_1 = failedTransfers; _b < failedTransfers_1.length; _b++) {
                            transfer = failedTransfers_1[_b];
                            console.log("   \u274C Failed transfer to ".concat(transfer.address, ": ").concat(transfer.error));
                        }
                    }
                    if (!performTransfers) {
                        console.log('💡 Note: Only configuration updated. Use performTransfers=true to execute actual transfers.');
                    }
                    return [2 /*return*/, result];
            }
        });
    });
}
/**
 * Versión estática para validar actualizaciones de cuentas
 */
function validateAccountUpdatesStatic(accounts) {
    var errors = [];
    var usedAddresses = new Set();
    // Función auxiliar para validar dirección Ethereum
    var isValidEthereumAddress = function (address) {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    };
    // Función auxiliar para validar cantidad wei
    var isValidWeiAmount = function (weiAmount) {
        try {
            var amount = BigInt(weiAmount);
            return amount > 0n;
        }
        catch (error) {
            return false;
        }
    };
    // Función auxiliar para validar cantidad wei razonable
    var isReasonableWeiAmount = function (weiAmount) {
        try {
            var amount = BigInt(weiAmount);
            var maxReasonable = BigInt("1000000000000000000000000"); // 1,000,000 ETH in wei (10^6 * 10^18)
            return amount > 0n && amount <= maxReasonable;
        }
        catch (error) {
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
    accounts.forEach(function (account, index) {
        if (!isValidEthereumAddress(account.address)) {
            errors.push({
                field: "accounts[".concat(index, "].address"),
                type: 'format',
                message: "Account ".concat(index, " address must be a valid Ethereum address (0x...)")
            });
        }
        else {
            var lowerAddress = account.address.toLowerCase();
            if (usedAddresses.has(lowerAddress)) {
                errors.push({
                    field: "accounts[".concat(index, "].address"),
                    type: 'duplicate',
                    message: "Account ".concat(index, " address is duplicated")
                });
            }
            else {
                usedAddresses.add(lowerAddress);
            }
        }
        if (!isValidWeiAmount(account.weiAmount)) {
            errors.push({
                field: "accounts[".concat(index, "].weiAmount"),
                type: 'format',
                message: "Account ".concat(index, " wei amount must be a valid positive number")
            });
        }
        else if (!isReasonableWeiAmount(account.weiAmount)) {
            errors.push({
                field: "accounts[".concat(index, "].weiAmount"),
                type: 'range',
                message: "Account ".concat(index, " wei amount should be between 1 wei and 10^24 wei (1,000,000 ETH max)")
            });
        }
    });
    return errors;
}
/**
 * Método estático para actualizar las cuentas de una red existente por nombre
 */
function updateNetworkAccountsByName(networkName_1, accounts_1) {
    return __awaiter(this, arguments, void 0, function (networkName, accounts, options) {
        var baseDir, validationErrors, errorMessages, networkPath, configPath, config, configData, network, result, updatedConfigData;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    baseDir = options.baseDir || "./networks";
                    console.log("\uD83D\uDD0D Loading network configuration for: ".concat(networkName));
                    validationErrors = validateAccountUpdatesStatic(accounts);
                    if (validationErrors.length > 0) {
                        errorMessages = validationErrors.map(function (error) { return "".concat(error.field, ": ").concat(error.message); }).join('\n');
                        throw new Error("Validation failed:\n".concat(errorMessages));
                    }
                    networkPath = path.join(baseDir, networkName);
                    configPath = path.join(networkPath, 'network-config.json');
                    // Verificar que existe el directorio de la red
                    if (!fs.existsSync(networkPath)) {
                        throw new Error("Network '".concat(networkName, "' not found. Directory does not exist: ").concat(networkPath));
                    }
                    if (fs.existsSync(configPath)) {
                        configData = fs.readFileSync(configPath, 'utf-8');
                        config = JSON.parse(configData);
                    }
                    else {
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
                    network = new create_besu_networks_1.BesuNetwork(config, baseDir);
                    return [4 /*yield*/, updateNetworkAccounts(network, accounts, {
                            performTransfers: options.performTransfers,
                            rpcUrl: options.rpcUrl,
                            confirmTransactions: options.confirmTransactions
                        })];
                case 1:
                    result = _a.sent();
                    // Guardar la configuración actualizada solo si fue exitosa
                    if (result.configUpdated) {
                        updatedConfigData = JSON.stringify(network.getConfig(), null, 2);
                        fs.writeFileSync(configPath, updatedConfigData);
                        console.log("\uD83D\uDCBE Configuration saved to: ".concat(configPath));
                    }
                    return [2 /*return*/, result];
            }
        });
    });
}
// ============================================================================
// NETWORK NODES UPDATER - Funciones para actualizar nodos existentes
// ============================================================================
var BesuNetworkUpdater = /** @class */ (function () {
    function BesuNetworkUpdater(besuNetwork) {
        this.besuNetwork = besuNetwork;
    }
    /**
     * Actualiza los nodos de una red Besu existente
     * Permite cambiar mainIp, configuraciones específicas de nodos, añadir y eliminar nodos
     */
    BesuNetworkUpdater.prototype.updateNetworkNodes = function (updates) {
        return __awaiter(this, void 0, void 0, function () {
            var needsRestart, errors, config, nodes, _i, _a, nodeUpdate, node, currentNodeConfig, nodeChanged, currentP2pPort, _b, _c, nodeName, node, nodeConfig, existingIps, existingRpcEndpoints, existingP2pEndpoints, existingNames, _d, nodes_1, _e, nodeName, node, nodeConfig, i, newNode, p2pPort, nameRegex, rpcEndpoint, p2pEndpoint, validNodeTypes, errorMessages, _f, _g, nodeName, fileService, _h, _j, newNodeDef, nodeConfig, fileService, node;
            return __generator(this, function (_k) {
                switch (_k.label) {
                    case 0:
                        needsRestart = false;
                        errors = [];
                        config = this.besuNetwork.getConfig();
                        nodes = this.besuNetwork.getNodes();
                        console.log("\uD83D\uDD27 Updating network nodes for: ".concat(config.name));
                        // Validar mainIp si se proporciona
                        if (updates.mainIp && updates.mainIp !== config.mainIp) {
                            if (!isValidIpAddress(updates.mainIp)) {
                                errors.push({
                                    field: 'mainIp',
                                    type: 'format',
                                    message: 'Main IP must be a valid IP address'
                                });
                            }
                            else {
                                console.log("\uD83D\uDCCD Changing main IP from ".concat(config.mainIp || 'not set', " to ").concat(updates.mainIp));
                                config.mainIp = updates.mainIp;
                                needsRestart = true;
                            }
                        }
                        // Validar y aplicar actualizaciones específicas de nodos
                        if (updates.nodes && updates.nodes.length > 0) {
                            console.log("\uD83D\uDD27 Processing ".concat(updates.nodes.length, " node-specific updates..."));
                            for (_i = 0, _a = updates.nodes; _i < _a.length; _i++) {
                                nodeUpdate = _a[_i];
                                node = nodes.get(nodeUpdate.name);
                                if (!node) {
                                    errors.push({
                                        field: "nodes[".concat(nodeUpdate.name, "]"),
                                        type: 'invalid',
                                        message: "Node '".concat(nodeUpdate.name, "' not found in network")
                                    });
                                    continue;
                                }
                                currentNodeConfig = node.getConfig();
                                nodeChanged = false;
                                // Validar y actualizar IP específica del nodo
                                if (nodeUpdate.ip && nodeUpdate.ip !== currentNodeConfig.ip) {
                                    if (!isValidIpAddress(nodeUpdate.ip)) {
                                        errors.push({
                                            field: "nodes[".concat(nodeUpdate.name, "].ip"),
                                            type: 'format',
                                            message: "Invalid IP address for node '".concat(nodeUpdate.name, "': ").concat(nodeUpdate.ip)
                                        });
                                    }
                                    else {
                                        console.log("  \uD83D\uDCCD Node ".concat(nodeUpdate.name, ": IP ").concat(currentNodeConfig.ip, " \u2192 ").concat(nodeUpdate.ip));
                                        node.updateIp(nodeUpdate.ip);
                                        nodeChanged = true;
                                    }
                                }
                                // Validar y actualizar RPC Port
                                if (nodeUpdate.rpcPort && nodeUpdate.rpcPort !== currentNodeConfig.rpcPort) {
                                    if (!this.isValidPort(nodeUpdate.rpcPort)) {
                                        errors.push({
                                            field: "nodes[".concat(nodeUpdate.name, "].rpcPort"),
                                            type: 'range',
                                            message: "Invalid RPC port for node '".concat(nodeUpdate.name, "': ").concat(nodeUpdate.rpcPort, ". Must be between 1024 and 65535")
                                        });
                                    }
                                    else if (this.isPortInUseByOtherNodes(nodeUpdate.rpcPort, nodeUpdate.name, nodes)) {
                                        errors.push({
                                            field: "nodes[".concat(nodeUpdate.name, "].rpcPort"),
                                            type: 'duplicate',
                                            message: "RPC port ".concat(nodeUpdate.rpcPort, " is already in use by another node")
                                        });
                                    }
                                    else {
                                        console.log("  \uD83D\uDD0C Node ".concat(nodeUpdate.name, ": RPC Port ").concat(currentNodeConfig.rpcPort, " \u2192 ").concat(nodeUpdate.rpcPort));
                                        node.updateRpcPort(nodeUpdate.rpcPort);
                                        nodeChanged = true;
                                    }
                                }
                                // Validar y actualizar P2P Port
                                if (nodeUpdate.p2pPort && nodeUpdate.p2pPort !== (currentNodeConfig.port || 30303)) {
                                    if (!this.isValidPort(nodeUpdate.p2pPort)) {
                                        errors.push({
                                            field: "nodes[".concat(nodeUpdate.name, "].p2pPort"),
                                            type: 'range',
                                            message: "Invalid P2P port for node '".concat(nodeUpdate.name, "': ").concat(nodeUpdate.p2pPort, ". Must be between 1024 and 65535")
                                        });
                                    }
                                    else if (this.isPortInUseByOtherNodes(nodeUpdate.p2pPort, nodeUpdate.name, nodes)) {
                                        errors.push({
                                            field: "nodes[".concat(nodeUpdate.name, "].p2pPort"),
                                            type: 'duplicate',
                                            message: "P2P port ".concat(nodeUpdate.p2pPort, " is already in use by another node")
                                        });
                                    }
                                    else {
                                        currentP2pPort = currentNodeConfig.port || 30303;
                                        console.log("  \uD83D\uDD17 Node ".concat(nodeUpdate.name, ": P2P Port ").concat(currentP2pPort, " \u2192 ").concat(nodeUpdate.p2pPort));
                                        node.updateP2pPort(nodeUpdate.p2pPort);
                                        nodeChanged = true;
                                    }
                                }
                                if (nodeChanged) {
                                    needsRestart = true;
                                    console.log("  \u2705 Node ".concat(nodeUpdate.name, " configuration updated"));
                                }
                                else {
                                    console.log("  \u2139\uFE0F  Node ".concat(nodeUpdate.name, ": No changes detected"));
                                }
                            }
                        }
                        // Validar y procesar nodos a eliminar
                        if (updates.removeNodes && updates.removeNodes.length > 0) {
                            console.log("\uD83D\uDDD1\uFE0F  Processing ".concat(updates.removeNodes.length, " nodes for removal..."));
                            for (_b = 0, _c = updates.removeNodes; _b < _c.length; _b++) {
                                nodeName = _c[_b];
                                node = nodes.get(nodeName);
                                if (!node) {
                                    errors.push({
                                        field: "removeNodes[".concat(nodeName, "]"),
                                        type: 'invalid',
                                        message: "Node '".concat(nodeName, "' not found in network")
                                    });
                                    continue;
                                }
                                nodeConfig = node.getConfig();
                                if (nodeConfig.type === 'bootnode' && this.getNodeCountByType('bootnode', nodes) <= 1) {
                                    errors.push({
                                        field: "removeNodes[".concat(nodeName, "]"),
                                        type: 'invalid',
                                        message: "Cannot remove '".concat(nodeName, "': At least one bootnode is required in the network")
                                    });
                                }
                                else if (nodeConfig.type === 'miner' && this.getNodeCountByType('miner', nodes) <= 1) {
                                    errors.push({
                                        field: "removeNodes[".concat(nodeName, "]"),
                                        type: 'invalid',
                                        message: "Cannot remove '".concat(nodeName, "': At least one miner is required in the network")
                                    });
                                }
                                else {
                                    console.log("  \uD83D\uDDD1\uFE0F  Node ".concat(nodeName, " (").concat(nodeConfig.type, ") marked for removal"));
                                    needsRestart = true;
                                }
                            }
                        }
                        // Validar y procesar nodos a añadir usando las mismas validaciones que createNetwork
                        if (updates.addNodes && updates.addNodes.length > 0) {
                            console.log("\u2795 Processing ".concat(updates.addNodes.length, " nodes for addition..."));
                            existingIps = new Set();
                            existingRpcEndpoints = new Set();
                            existingP2pEndpoints = new Set();
                            existingNames = new Set();
                            // Poblar con nodos existentes (excluyendo los que van a ser eliminados)
                            for (_d = 0, nodes_1 = nodes; _d < nodes_1.length; _d++) {
                                _e = nodes_1[_d], nodeName = _e[0], node = _e[1];
                                if (updates.removeNodes && updates.removeNodes.includes(nodeName))
                                    continue;
                                nodeConfig = node.getConfig();
                                existingIps.add(nodeConfig.ip);
                                existingRpcEndpoints.add("".concat(nodeConfig.ip, ":").concat(nodeConfig.rpcPort));
                                existingP2pEndpoints.add("".concat(nodeConfig.ip, ":").concat(nodeConfig.port));
                                existingNames.add(nodeName);
                            }
                            // Validar cada nodo a añadir
                            for (i = 0; i < updates.addNodes.length; i++) {
                                newNode = updates.addNodes[i];
                                p2pPort = newNode.p2pPort || 30303;
                                // Validar nombre del nodo
                                if (!newNode.name || newNode.name.trim().length === 0) {
                                    errors.push({
                                        field: "addNodes[".concat(i, "].name"),
                                        type: 'required',
                                        message: "New node ".concat(i, " name is required")
                                    });
                                }
                                else {
                                    nameRegex = /^[a-zA-Z0-9_-]+$/;
                                    if (!nameRegex.test(newNode.name)) {
                                        errors.push({
                                            field: "addNodes[".concat(i, "].name"),
                                            type: 'format',
                                            message: "New node ".concat(i, " name can only contain letters, numbers, hyphens and underscores")
                                        });
                                    }
                                    if (existingNames.has(newNode.name)) {
                                        errors.push({
                                            field: "addNodes[".concat(i, "].name"),
                                            type: 'duplicate',
                                            message: "Node name '".concat(newNode.name, "' already exists in the network")
                                        });
                                    }
                                    else {
                                        existingNames.add(newNode.name);
                                    }
                                }
                                // Validar IP del nodo
                                if (!isValidIpAddress(newNode.ip)) {
                                    errors.push({
                                        field: "addNodes[".concat(i, "].ip"),
                                        type: 'format',
                                        message: "New node ".concat(i, " IP address format is invalid")
                                    });
                                }
                                else {
                                    if (existingIps.has(newNode.ip)) {
                                        errors.push({
                                            field: "addNodes[".concat(i, "].ip"),
                                            type: 'duplicate',
                                            message: "IP address '".concat(newNode.ip, "' is already in use by another node")
                                        });
                                    }
                                    else {
                                        existingIps.add(newNode.ip);
                                    }
                                    // Validar que la IP está en la subnet
                                    if (!isIpInSubnet(newNode.ip, config.subnet)) {
                                        errors.push({
                                            field: "addNodes[".concat(i, "].ip"),
                                            type: 'invalid',
                                            message: "New node ".concat(i, " IP '").concat(newNode.ip, "' is not in the configured subnet '").concat(config.subnet, "'")
                                        });
                                    }
                                }
                                // Validar puerto RPC
                                if (!this.isValidPort(newNode.rpcPort)) {
                                    errors.push({
                                        field: "addNodes[".concat(i, "].rpcPort"),
                                        type: 'range',
                                        message: "New node ".concat(i, " RPC port must be between 1024 and 65535")
                                    });
                                }
                                else {
                                    rpcEndpoint = "".concat(newNode.ip, ":").concat(newNode.rpcPort);
                                    if (existingRpcEndpoints.has(rpcEndpoint)) {
                                        errors.push({
                                            field: "addNodes[".concat(i, "].rpcPort"),
                                            type: 'duplicate',
                                            message: "RPC endpoint ".concat(rpcEndpoint, " is already in use")
                                        });
                                    }
                                    else {
                                        existingRpcEndpoints.add(rpcEndpoint);
                                    }
                                }
                                // Validar puerto P2P
                                if (!this.isValidPort(p2pPort)) {
                                    errors.push({
                                        field: "addNodes[".concat(i, "].p2pPort"),
                                        type: 'range',
                                        message: "New node ".concat(i, " P2P port must be between 1024 and 65535")
                                    });
                                }
                                else {
                                    p2pEndpoint = "".concat(newNode.ip, ":").concat(p2pPort);
                                    if (existingP2pEndpoints.has(p2pEndpoint)) {
                                        errors.push({
                                            field: "addNodes[".concat(i, "].p2pPort"),
                                            type: 'duplicate',
                                            message: "P2P endpoint ".concat(p2pEndpoint, " is already in use")
                                        });
                                    }
                                    else {
                                        existingP2pEndpoints.add(p2pEndpoint);
                                    }
                                    // Verificar que P2P y RPC no conflicten en el mismo nodo
                                    if (p2pPort === newNode.rpcPort) {
                                        errors.push({
                                            field: "addNodes[".concat(i, "].p2pPort"),
                                            type: 'invalid',
                                            message: "New node ".concat(i, " P2P port cannot be the same as RPC port")
                                        });
                                    }
                                }
                                validNodeTypes = ['bootnode', 'miner', 'rpc', 'node'];
                                if (!validNodeTypes.includes(newNode.type)) {
                                    errors.push({
                                        field: "addNodes[".concat(i, "].type"),
                                        type: 'invalid',
                                        message: "New node ".concat(i, " type '").concat(newNode.type, "' is invalid. Valid types: ").concat(validNodeTypes.join(', '))
                                    });
                                }
                                else {
                                    console.log("  \u2795 Node ".concat(newNode.name, " (").concat(newNode.type, ") validated for addition"));
                                    needsRestart = true;
                                }
                            }
                        }
                        // Si hay errores de validación, lanzar excepción
                        if (errors.length > 0) {
                            errorMessages = errors.map(function (error) {
                                return "".concat(error.field, ": ").concat(error.message);
                            }).join('\n');
                            throw new Error("Network nodes update validation failed:\n".concat(errorMessages));
                        }
                        // Si no hay cambios, informar y salir
                        if (!needsRestart) {
                            console.log('ℹ️  No changes detected in node configuration');
                            return [2 /*return*/];
                        }
                        // Si hay cambios que requieren reinicio
                        console.log('⏸️  Stopping network for node configuration update...');
                        return [4 /*yield*/, this.besuNetwork.stop()];
                    case 1:
                        _k.sent();
                        // Procesar eliminaciones de nodos
                        if (updates.removeNodes && updates.removeNodes.length > 0) {
                            console.log('🗑️  Removing nodes...');
                            for (_f = 0, _g = updates.removeNodes; _f < _g.length; _f++) {
                                nodeName = _g[_f];
                                if (nodes.has(nodeName)) {
                                    fileService = this.besuNetwork.getFileService();
                                    fileService.removeFolder(nodeName);
                                    // Eliminar del mapa de nodos
                                    nodes.delete(nodeName);
                                    console.log("  \u2705 Node ".concat(nodeName, " removed successfully"));
                                }
                            }
                        }
                        // Procesar adiciones de nodos
                        if (updates.addNodes && updates.addNodes.length > 0) {
                            console.log('➕ Adding new nodes...');
                            for (_h = 0, _j = updates.addNodes; _h < _j.length; _h++) {
                                newNodeDef = _j[_h];
                                nodeConfig = {
                                    name: newNodeDef.name,
                                    ip: newNodeDef.ip,
                                    port: newNodeDef.p2pPort || 30303,
                                    rpcPort: newNodeDef.rpcPort,
                                    type: newNodeDef.type
                                };
                                fileService = this.besuNetwork.getFileService();
                                node = new create_besu_networks_1.BesuNode(nodeConfig, fileService);
                                nodes.set(newNodeDef.name, node);
                                console.log("  \u2705 Added ".concat(newNodeDef.type, " node: ").concat(newNodeDef.name, " (").concat(newNodeDef.ip, ":").concat(newNodeDef.rpcPort, ")"));
                            }
                        }
                        if (!updates.mainIp) return [3 /*break*/, 3];
                        console.log('📝 Updating node IP addresses...');
                        return [4 /*yield*/, this.updateNodeIpAddresses(updates.mainIp)];
                    case 2:
                        _k.sent();
                        _k.label = 3;
                    case 3:
                        // Actualizar archivos de configuración TOML con los nuevos parámetros
                        console.log('📝 Updating node configuration files...');
                        return [4 /*yield*/, this.updateNodeConfigurations()];
                    case 4:
                        _k.sent();
                        console.log('✅ Network nodes updated successfully');
                        console.log('💡 Use start() to restart the network with new configuration');
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Valida si un puerto es válido (rango 1024-65535)
     */
    BesuNetworkUpdater.prototype.isValidPort = function (port) {
        return Number.isInteger(port) && port >= 1024 && port <= 65535;
    };
    /**
     * Verifica si un puerto está siendo usado por otros nodos
     */
    BesuNetworkUpdater.prototype.isPortInUseByOtherNodes = function (port, excludeNodeName, nodes) {
        for (var _i = 0, nodes_2 = nodes; _i < nodes_2.length; _i++) {
            var _a = nodes_2[_i], nodeName = _a[0], node = _a[1];
            if (nodeName === excludeNodeName)
                continue;
            var nodeConfig = node.getConfig();
            if (nodeConfig.rpcPort === port || nodeConfig.port === port) {
                return true;
            }
        }
        return false;
    };
    /**
     * Cuenta cuántos nodos de un tipo específico existen
     */
    BesuNetworkUpdater.prototype.getNodeCountByType = function (nodeType, nodes) {
        var count = 0;
        for (var _i = 0, nodes_3 = nodes; _i < nodes_3.length; _i++) {
            var _a = nodes_3[_i], node = _a[1];
            var nodeConfig = node.getConfig();
            if (nodeConfig.type === nodeType) {
                count++;
            }
        }
        return count;
    };
    /**
     * Actualiza las IPs de los nodos basándose en el nuevo mainIp
     */
    BesuNetworkUpdater.prototype.updateNodeIpAddresses = function (mainIp) {
        return __awaiter(this, void 0, void 0, function () {
            var nodes, _a, baseIp1, baseIp2, baseIp3, basePrefix, ipCounter, _i, nodes_4, _b, nodeName, node, newIp;
            return __generator(this, function (_c) {
                nodes = this.besuNetwork.getNodes();
                _a = mainIp.split('.'), baseIp1 = _a[0], baseIp2 = _a[1], baseIp3 = _a[2];
                basePrefix = "".concat(baseIp1, ".").concat(baseIp2, ".").concat(baseIp3);
                ipCounter = 10;
                for (_i = 0, nodes_4 = nodes; _i < nodes_4.length; _i++) {
                    _b = nodes_4[_i], nodeName = _b[0], node = _b[1];
                    newIp = "".concat(basePrefix, ".").concat(ipCounter);
                    // Actualizar la IP del nodo usando el método updateIp
                    node.updateIp(newIp);
                    console.log("\uD83D\uDD04 Updated ".concat(nodeName, " IP to ").concat(newIp));
                    ipCounter++;
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Actualiza las configuraciones de los nodos usando la lógica de BesuNetwork
     */
    BesuNetworkUpdater.prototype.updateNodeConfigurations = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('📝 Updating node configurations...');
                        return [4 /*yield*/, updateNodeConfigurations(this.besuNetwork)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Método estático para actualizar nodos por nombre de red
     */
    BesuNetworkUpdater.updateNetworkNodesByName = function (networkName_1, updates_1) {
        return __awaiter(this, arguments, void 0, function (networkName, updates, options) {
            var baseDir, networkPath, configPath, config, configData, network, updater, updatedConfigData;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        baseDir = options.baseDir || "./networks";
                        console.log("\uD83D\uDD0D Loading network configuration for: ".concat(networkName));
                        networkPath = path.join(baseDir, networkName);
                        configPath = path.join(networkPath, 'network-config.json');
                        // Verificar que existe el directorio de la red
                        if (!fs.existsSync(networkPath)) {
                            throw new Error("Network '".concat(networkName, "' not found. Directory does not exist: ").concat(networkPath));
                        }
                        if (fs.existsSync(configPath)) {
                            configData = fs.readFileSync(configPath, 'utf-8');
                            config = JSON.parse(configData);
                        }
                        else {
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
                        network = new create_besu_networks_1.BesuNetwork(config, baseDir);
                        updater = new BesuNetworkUpdater(network);
                        return [4 /*yield*/, updater.updateNetworkNodes(updates)];
                    case 1:
                        _a.sent();
                        updatedConfigData = JSON.stringify(network.getConfig(), null, 2);
                        fs.writeFileSync(configPath, updatedConfigData);
                        console.log("\uD83D\uDCBE Configuration saved to: ".concat(configPath));
                        console.log("\u2705 Network ".concat(networkName, " nodes updated successfully"));
                        return [2 /*return*/];
                }
            });
        });
    };
    return BesuNetworkUpdater;
}());
exports.BesuNetworkUpdater = BesuNetworkUpdater;
// ============================================================================
// CONVENIENCE FUNCTIONS - Funciones de conveniencia para operaciones comunes
// ============================================================================
/**
 * Función de conveniencia para actualizar mainIp de una red
 */
function updateMainIp(networkName, mainIp, baseDir) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, BesuNetworkUpdater.updateNetworkNodesByName(networkName, { mainIp: mainIp }, { baseDir: baseDir })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Función de conveniencia para actualizar configuración específica de nodos
 */
function updateNodeConfigs(networkName, nodeUpdates, baseDir) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, BesuNetworkUpdater.updateNetworkNodesByName(networkName, { nodes: nodeUpdates }, { baseDir: baseDir })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Función de conveniencia para añadir nodos a una red
 */
function addNodesToNetwork(networkName, newNodes, baseDir) {
    return __awaiter(this, void 0, void 0, function () {
        var baseDirPath, networkPath, configPath, configJson, config, configData, _loop_2, _i, newNodes_1, newNode;
        return __generator(this, function (_a) {
            baseDirPath = baseDir || "./networks";
            console.log("\uD83D\uDD0D Loading network configuration for adding nodes to: ".concat(networkName));
            networkPath = path.join(baseDirPath, networkName);
            configPath = path.join(networkPath, 'network-config.json');
            // Verify network directory exists
            if (!fs.existsSync(networkPath)) {
                throw new Error("Network '".concat(networkName, "' not found. Directory does not exist: ").concat(networkPath));
            }
            if (fs.existsSync(configPath)) {
                configData = fs.readFileSync(configPath, 'utf-8');
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
            }
            else {
                // If no config file, create basic config
                console.log('⚠️  No network-config.json found, creating basic configuration...');
                config = {
                    name: networkName,
                    chainId: 1337, // Default chainId
                    subnet: '172.24.0.0/16', // Default subnet
                    consensus: 'clique',
                    gasLimit: '0x47E7C4'
                };
                configJson = __assign({}, config);
            }
            // Create or update nodes array in raw config JSON
            if (!configJson.nodes) {
                configJson.nodes = [];
            }
            _loop_2 = function (newNode) {
                // Check if node already exists
                var existingIndex = configJson.nodes.findIndex(function (n) { return n.name === newNode.name; });
                if (existingIndex >= 0) {
                    // Update existing node
                    configJson.nodes[existingIndex] = __assign(__assign({}, configJson.nodes[existingIndex]), newNode);
                    console.log("\uD83D\uDD04 Updated existing node: ".concat(newNode.name));
                }
                else {
                    // Add new node
                    configJson.nodes.push(newNode);
                    console.log("\u2795 Added new node: ".concat(newNode.name));
                }
            };
            // Add new nodes
            for (_i = 0, newNodes_1 = newNodes; _i < newNodes_1.length; _i++) {
                newNode = newNodes_1[_i];
                _loop_2(newNode);
            }
            // Save updated config with all properties
            fs.writeFileSync(configPath, JSON.stringify(configJson, null, 2));
            console.log("\uD83D\uDCBE Updated configuration saved to: ".concat(configPath));
            return [2 /*return*/];
        });
    });
}
/**
 * Función de conveniencia para eliminar nodos de una red
 */
function removeNodesFromNetwork(networkName, nodeNames, baseDir) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, BesuNetworkUpdater.updateNetworkNodesByName(networkName, { removeNodes: nodeNames }, { baseDir: baseDir })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// ============================================================================
// UTILITY FUNCTIONS - Funciones auxiliares
// ============================================================================
/**
 * Actualiza las IPs de los nodos para una nueva subnet
 */
function updateNodesForNewSubnet(network, newSubnet) {
    var baseNetwork = newSubnet.split('/')[0];
    var baseParts = baseNetwork.split('.');
    var basePrefix = "".concat(baseParts[0], ".").concat(baseParts[1], ".").concat(baseParts[2]);
    var ipCounter = 10;
    var nodes = network.getNodes();
    for (var _i = 0, nodes_5 = nodes; _i < nodes_5.length; _i++) {
        var _a = nodes_5[_i], nodeName = _a[0], node = _a[1];
        var currentConfig = node.getConfig();
        var newIp = "".concat(basePrefix, ".").concat(ipCounter);
        // Actualizar la IP del nodo
        node.updateIp(newIp);
        console.log("\uD83D\uDD04 Updated ".concat(nodeName, " IP to ").concat(newIp));
        ipCounter++;
    }
}
/**
 * Actualiza los archivos de configuración TOML de todos los nodos
 */
function updateNodeConfigurations(network) {
    return __awaiter(this, void 0, void 0, function () {
        var bootnodeNodes, bootnodeEnodes, nodes, config, fileService, _i, nodes_6, _a, nodeName, node, nodeConfig, tomlConfig;
        return __generator(this, function (_b) {
            bootnodeNodes = network.getNodesByType('bootnode');
            bootnodeEnodes = bootnodeNodes.map(function (node) { return node.getKeys().enode; });
            nodes = network.getNodes();
            config = network.getConfig();
            fileService = network.getFileService();
            for (_i = 0, nodes_6 = nodes; _i < nodes_6.length; _i++) {
                _a = nodes_6[_i], nodeName = _a[0], node = _a[1];
                nodeConfig = node.getConfig();
                tomlConfig = void 0;
                if (nodeConfig.type === 'bootnode') {
                    tomlConfig = node.generateTomlConfig(config);
                }
                else {
                    tomlConfig = node.generateTomlConfig(config, bootnodeEnodes);
                }
                // Guardar nueva configuración
                fileService.createFile(nodeConfig.name, 'config.toml', tomlConfig);
            }
            return [2 /*return*/];
        });
    });
}
/**
 * Obtiene el nodo miner de la red
 */
function getMinerNode(network) {
    var minerNodes = network.getNodesByType('miner');
    return minerNodes.length > 0 ? minerNodes[0] : null;
}
/**
 * Obtiene el puerto RPC del miner
 */
function getMinerRpcPort(network) {
    var minerNode = getMinerNode(network);
    if (!minerNode) {
        throw new Error('No miner node found in the network');
    }
    return minerNode.getConfig().rpcPort;
}
/**
 * Valida si una dirección Ethereum es válida
 */
function isValidEthereumAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}
/**
 * Valida si una cantidad en wei es válida
 */
function isValidWeiAmount(weiAmount) {
    try {
        var amount = BigInt(weiAmount);
        return amount > 0n;
    }
    catch (error) {
        return false;
    }
}
/**
 * Valida si una cantidad en wei es razonable
 */
function isReasonableWeiAmount(weiAmount) {
    try {
        var amount = BigInt(weiAmount);
        var maxReasonable = BigInt("1000000000000000000000000"); // 1,000,000 ETH in wei
        return amount > 0n && amount <= maxReasonable;
    }
    catch (error) {
        return false;
    }
}
/**
 * Valida si una subnet es válida
 */
function isValidSubnet(subnet) {
    var subnetRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    if (!subnetRegex.test(subnet)) {
        return false;
    }
    var _a = subnet.split('/'), network = _a[0], mask = _a[1];
    var maskNum = parseInt(mask, 10);
    if (maskNum < 8 || maskNum > 30) {
        return false;
    }
    var parts = network.split('.').map(function (num) { return parseInt(num, 10); });
    return parts.every(function (part) { return part >= 0 && part <= 255; });
}
/**
 * Valida si una dirección IP es válida
 */
function isValidIpAddress(ip) {
    var ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
        return false;
    }
    var parts = ip.split('.').map(function (num) { return parseInt(num, 10); });
    return parts.every(function (part) { return part >= 0 && part <= 255; });
}
/**
 * Verifica si una IP está en una subnet
 */
function isIpInSubnet(ip, subnet) {
    var _a = subnet.split('/'), subnetNetwork = _a[0], subnetMask = _a[1];
    var maskBits = parseInt(subnetMask, 10);
    var ipNum = ipToNumber(ip);
    var subnetNum = ipToNumber(subnetNetwork);
    var mask = (0xFFFFFFFF << (32 - maskBits)) >>> 0;
    return (ipNum & mask) === (subnetNum & mask);
}
/**
 * Convierte una IP a número
 */
function ipToNumber(ip) {
    return ip.split('.').reduce(function (acc, octet) { return (acc << 8) + parseInt(octet, 10); }, 0) >>> 0;
}
/**
 * Actualiza los nodos de una red Besu por nombre
 * Permite agregar, eliminar o actualizar nodos de una red existente
 */
function updateNetworkNodesByName(networkName_1, nodeUpdates_1) {
    return __awaiter(this, arguments, void 0, function (networkName, nodeUpdates, options) {
        var baseDir, networkPath, configPath, config, rawConfig, configData, nodesDir_1, nodeDirs, network, result, _i, _a, nodeDefinition, nodeDirectory, cryptoLib, _b, privateKey, publicKey, address, enodeUrl, _c, _d, update, node, nodeDirPath, enodeFile, enodeContent, updatedEnode, currentConfigPath, updatedConfig, existingConfigStr, existingConfig, fullConfig, existingNodes, _loop_3, _e, _f, newNode, _loop_4, _g, _h, updateInfo, _loop_5, _j, _k, nodeName, updatedConfigData, updatedConfigData, updatedConfigData, error_3;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_l) {
            switch (_l.label) {
                case 0:
                    baseDir = options.baseDir || "./networks";
                    console.log("\uD83D\uDD0D Loading network configuration for: ".concat(networkName));
                    networkPath = path.join(baseDir, networkName);
                    configPath = path.join(networkPath, 'network-config.json');
                    // Verificar que existe el directorio de la red
                    if (!fs.existsSync(networkPath)) {
                        throw new Error("Network '".concat(networkName, "' not found. Directory does not exist: ").concat(networkPath));
                    }
                    rawConfig = {};
                    if (fs.existsSync(configPath)) {
                        configData = fs.readFileSync(configPath, 'utf-8');
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
                    }
                    else {
                        // Si no existe archivo de configuración, crear una configuración básica
                        console.log("\u26A0\uFE0F  Network configuration file not found: ".concat(configPath));
                        console.log('Creating basic configuration from network structure...');
                        nodesDir_1 = fs.readdirSync(networkPath)
                            .filter(function (item) {
                            var itemPath = path.join(networkPath, item);
                            return fs.statSync(itemPath).isDirectory() &&
                                !['data', 'logs', 'tmp'].includes(item);
                        });
                        nodeDirs = nodesDir_1.map(function (nodeName) {
                            var nodePath = path.join(networkPath, nodeName);
                            // Determinar tipo de nodo por nombre
                            var nodeType = 'node';
                            if (nodeName.includes('bootnode'))
                                nodeType = 'bootnode';
                            else if (nodeName.includes('miner'))
                                nodeType = 'miner';
                            else if (nodeName.includes('rpc'))
                                nodeType = 'rpc';
                            // Determinar puerto RPC basado en tipo
                            var rpcPort = 8545;
                            if (nodeType === 'miner')
                                rpcPort = 8546;
                            else if (nodeType === 'rpc')
                                rpcPort = 8547;
                            return {
                                name: nodeName,
                                type: nodeType,
                                ip: "172.24.0.".concat(10 + nodesDir_1.indexOf(nodeName)),
                                rpcPort: rpcPort,
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
                        rawConfig = __assign(__assign({}, config), { nodes: nodeDirs });
                        // Escribir configuración básica para uso futuro
                        fs.writeFileSync(configPath, JSON.stringify(rawConfig, null, 2));
                        console.log("\uD83D\uDCBE Created basic configuration in ".concat(configPath));
                    }
                    network = new create_besu_networks_1.BesuNetwork(config, baseDir);
                    result = {
                        success: true,
                        nodesAdded: [],
                        nodesUpdated: [],
                        nodesRemoved: [],
                        errors: []
                    };
                    _l.label = 1;
                case 1:
                    _l.trys.push([1, 11, , 12]);
                    // Detener la red primero para realizar cambios
                    console.log('⏸️  Stopping network for node updates...');
                    return [4 /*yield*/, network.stop()];
                case 2:
                    _l.sent();
                    if (!(nodeUpdates.add && nodeUpdates.add.length > 0)) return [3 /*break*/, 4];
                    console.log("\u2795 Adding ".concat(nodeUpdates.add.length, " new nodes..."));
                    return [4 /*yield*/, addNodesToNetwork(networkName, nodeUpdates.add, baseDir)];
                case 3:
                    _l.sent();
                    result.nodesAdded = nodeUpdates.add.map(function (node) { return node.name; });
                    // Reload the network to include the new nodes
                    // Instead of updating the internal network object directly, we'll create nodes through the file
                    for (_i = 0, _a = nodeUpdates.add; _i < _a.length; _i++) {
                        nodeDefinition = _a[_i];
                        nodeDirectory = path.join(networkPath, nodeDefinition.name);
                        if (!fs.existsSync(nodeDirectory)) {
                            fs.mkdirSync(nodeDirectory, { recursive: true });
                        }
                        cryptoLib = new create_besu_networks_1.CryptoLib();
                        _b = cryptoLib.generateKeyPair(nodeDefinition.ip || '127.0.0.1'), privateKey = _b.privateKey, publicKey = _b.publicKey, address = _b.address;
                        fs.writeFileSync(path.join(nodeDirectory, 'key.priv'), privateKey);
                        fs.writeFileSync(path.join(nodeDirectory, 'key.pub'), publicKey);
                        fs.writeFileSync(path.join(nodeDirectory, 'address'), address.substring(2)); // Remove 0x prefix
                        enodeUrl = "enode://".concat(publicKey.substring(2), "@").concat(nodeDefinition.ip, ":30303");
                        fs.writeFileSync(path.join(nodeDirectory, 'enode'), enodeUrl);
                        console.log("  \u2705 Created node files for: ".concat(nodeDefinition.name));
                    }
                    _l.label = 4;
                case 4:
                    if (!(nodeUpdates.update && nodeUpdates.update.length > 0)) return [3 /*break*/, 6];
                    console.log("\uD83D\uDD04 Updating ".concat(nodeUpdates.update.length, " existing nodes..."));
                    for (_c = 0, _d = nodeUpdates.update; _c < _d.length; _c++) {
                        update = _d[_c];
                        node = network.getNodeByName(update.name);
                        if (!node) {
                            result.errors.push("Node ".concat(update.name, " not found for update"));
                            continue;
                        }
                        // Aplicar actualizaciones al nodo
                        try {
                            // Actualizar IP si es necesario
                            if (update.updates.ip && update.updates.ip !== node.getConfig().ip) {
                                node.updateIp(update.updates.ip);
                                nodeDirPath = path.join(networkPath, update.name);
                                if (fs.existsSync(nodeDirPath)) {
                                    enodeFile = path.join(nodeDirPath, 'enode');
                                    if (fs.existsSync(enodeFile)) {
                                        enodeContent = fs.readFileSync(enodeFile, 'utf-8');
                                        updatedEnode = enodeContent.replace(/enode:\/\/([a-f0-9]+)@([0-9.]+):([0-9]+)/, "enode://$1@".concat(update.updates.ip, ":$3"));
                                        fs.writeFileSync(enodeFile, updatedEnode);
                                        console.log("  \u2705 Updated enode file for ".concat(update.name, " with new IP: ").concat(update.updates.ip));
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
                                console.log("\u26A0\uFE0F Warning: Cannot update p2pPort from 30303 - hardcoded value in the implementation");
                            }
                            // Otros posibles updates (dependerá de la implementación de BesuNode)
                            result.nodesUpdated.push(update.name);
                        }
                        catch (error) {
                            result.errors.push("Failed to update node ".concat(update.name, ": ").concat(error instanceof Error ? error.message : 'Unknown error'));
                        }
                    }
                    // Actualizar archivos de configuración para los nodos
                    return [4 /*yield*/, updateNodeConfigurations(network)];
                case 5:
                    // Actualizar archivos de configuración para los nodos
                    _l.sent();
                    _l.label = 6;
                case 6:
                    if (!(nodeUpdates.remove && nodeUpdates.remove.length > 0)) return [3 /*break*/, 8];
                    console.log("\u2796 Removing ".concat(nodeUpdates.remove.length, " nodes..."));
                    return [4 /*yield*/, removeNodesFromNetwork(networkName, nodeUpdates.remove, baseDir)];
                case 7:
                    _l.sent();
                    result.nodesRemoved = nodeUpdates.remove;
                    _l.label = 8;
                case 8:
                    currentConfigPath = path.join(networkPath, 'network-config.json');
                    updatedConfig = network.getConfig();
                    // Cargar la configuración existente para mantener la información de nodos
                    if (fs.existsSync(currentConfigPath)) {
                        try {
                            existingConfigStr = fs.readFileSync(currentConfigPath, 'utf-8');
                            existingConfig = JSON.parse(existingConfigStr);
                            // Si hay un array de nodos en la configuración existente, preservarlo
                            if (existingConfig && existingConfig.nodes) {
                                fullConfig = __assign({}, updatedConfig);
                                // Añadir o actualizar los nodos según lo necesitemos
                                if (!fullConfig.nodes) {
                                    fullConfig.nodes = [];
                                }
                                existingNodes = __spreadArray([], existingConfig.nodes, true);
                                // Añadir nuevos nodos si se especificaron
                                if (nodeUpdates.add && nodeUpdates.add.length > 0) {
                                    _loop_3 = function (newNode) {
                                        var existingIndex = existingNodes.findIndex(function (n) { return n.name === newNode.name; });
                                        if (existingIndex >= 0) {
                                            // Actualizar nodo existente
                                            existingNodes[existingIndex] = __assign(__assign({}, existingNodes[existingIndex]), newNode);
                                        }
                                        else {
                                            // Añadir nuevo nodo
                                            existingNodes.push(newNode);
                                        }
                                    };
                                    for (_e = 0, _f = nodeUpdates.add; _e < _f.length; _e++) {
                                        newNode = _f[_e];
                                        _loop_3(newNode);
                                    }
                                }
                                // Actualizar nodos existentes si se especificaron
                                if (nodeUpdates.update && nodeUpdates.update.length > 0) {
                                    _loop_4 = function (updateInfo) {
                                        var existingIndex = existingNodes.findIndex(function (n) { return n.name === updateInfo.name; });
                                        if (existingIndex >= 0) {
                                            // Actualizar nodo existente
                                            existingNodes[existingIndex] = __assign(__assign(__assign({}, existingNodes[existingIndex]), updateInfo.updates), { 
                                                // Asegurarse de que se aplican correctamente las actualizaciones
                                                ip: updateInfo.updates.ip || existingNodes[existingIndex].ip });
                                        }
                                    };
                                    for (_g = 0, _h = nodeUpdates.update; _g < _h.length; _g++) {
                                        updateInfo = _h[_g];
                                        _loop_4(updateInfo);
                                    }
                                }
                                // Eliminar nodos si se especificaron
                                if (nodeUpdates.remove && nodeUpdates.remove.length > 0) {
                                    _loop_5 = function (nodeName) {
                                        var index = existingNodes.findIndex(function (n) { return n.name === nodeName; });
                                        if (index >= 0) {
                                            existingNodes.splice(index, 1);
                                        }
                                    };
                                    for (_j = 0, _k = nodeUpdates.remove; _j < _k.length; _j++) {
                                        nodeName = _k[_j];
                                        _loop_5(nodeName);
                                    }
                                }
                                fullConfig.nodes = existingNodes;
                                // Guardar la configuración actualizada con los nodos
                                fs.writeFileSync(configPath, JSON.stringify(fullConfig, null, 2));
                                console.log("\uD83D\uDCBE Configuration saved to: ".concat(configPath));
                            }
                            else {
                                updatedConfigData = JSON.stringify(network.getConfig(), null, 2);
                                fs.writeFileSync(configPath, updatedConfigData);
                                console.log("\uD83D\uDCBE Configuration saved to: ".concat(configPath));
                            }
                        }
                        catch (error) {
                            console.error('Error reading/parsing existing config:', error);
                            updatedConfigData = JSON.stringify(network.getConfig(), null, 2);
                            fs.writeFileSync(configPath, updatedConfigData);
                            console.log("\uD83D\uDCBE Configuration saved to: ".concat(configPath));
                        }
                    }
                    else {
                        updatedConfigData = JSON.stringify(network.getConfig(), null, 2);
                        fs.writeFileSync(configPath, updatedConfigData);
                        console.log("\uD83D\uDCBE Configuration saved to: ".concat(configPath));
                    }
                    if (!options.startAfterUpdate) return [3 /*break*/, 10];
                    console.log('▶️  Starting network with updated configuration...');
                    return [4 /*yield*/, network.start()];
                case 9:
                    _l.sent();
                    _l.label = 10;
                case 10: 
                // Retornar el resultado final de la operación
                return [2 /*return*/, {
                        success: true,
                        nodesAdded: result.nodesAdded,
                        nodesUpdated: result.nodesUpdated,
                        nodesRemoved: result.nodesRemoved,
                        errors: result.errors.length > 0 ? result.errors : []
                    }];
                case 11:
                    error_3 = _l.sent();
                    console.error('❌ Error updating network nodes:', error_3);
                    return [2 /*return*/, {
                            success: false,
                            errors: [(error_3 instanceof Error) ? error_3.message : 'Unknown error']
                        }];
                case 12: return [2 /*return*/];
            }
        });
    });
}
