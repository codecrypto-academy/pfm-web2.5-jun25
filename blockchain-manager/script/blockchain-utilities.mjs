import pkg from 'elliptic';
const { ec: EC } = pkg;
import { ethers, Mnemonic } from 'ethers';

import { Buffer } from 'buffer';
import keccak256 from 'keccak256';
import fs from 'fs';

const CHAIN_ID = 20190606;

async function callApi(url, method, params) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            jsonrpc: '2.0',
            method: method,
            params: params,
            id: 1
        })
    });
    const json = await response.json();
    return json;
}

function createKeys(ip) {
    // curva eth, btc
    const ec = new EC('secp256k1');
    // generate a key pair
    const keyPair = ec.genKeyPair();
    const privateKey = keyPair.getPrivate('hex')
    const publicKey = keyPair.getPublic('hex')
    // remove 2 characters, compute  hash with keccak257 (no sha3)
    const pubKeyBuffer = keccak256(Buffer.from(publicKey.slice(2), 'hex'));
    // get last 20 bytes or  last 40 chars.
    const address = pubKeyBuffer.toString("hex").slice(-40)
    // get enode
    const enode = `enode://${publicKey.slice(2)}@${ip}:30303`

    return {
        privateKey,
        publicKey,
        address,
        enode
    }
}

async function getBalance(url = "http://localhost:8545", address) {
    const data = await callApi(url, "eth_getBalance", [address, "latest"]);
    return BigInt(data.result);
}

async function getBlockNumber(url = "http://localhost:8545") {
    const data = await callApi(url, "eth_blockNumber", []);
    return BigInt(data.result);
}

async function transferFrom(url = "http://localhost:8545", fromPrivate, to, amount) {
    // Create a wallet from the private key
    const wallet = new ethers.Wallet(fromPrivate);
    // Connect wallet to the JSON-RPC provider
    const provider = new ethers.JsonRpcProvider(url, {
        chainId: CHAIN_ID, // Updated to match our network
        name: "private"
    });
    const connectedWallet = wallet.connect(provider);
    // Create and send the transaction
    const tx = await connectedWallet.sendTransaction({
        to: to,
        value: ethers.parseEther(amount.toString())
    });

    // Wait for transaction to be mined
    const receipt = await tx.wait();

    return receipt;
}

async function getNextworkInfo(url) {
    const version = await callApi(url, "net_version", [])
    const peerCount = await callApi(url, "net_peerCount", [])
    return {
        version,
        peerCount
    };
}

// Function to derive wallet from mnemonic
function deriveWalletFromMnemonic(mnemonicPhrase, index = 0) {
    const path = `m/44'/60'/0'/0/${index}`;
    const mnemonic = Mnemonic.fromPhrase(mnemonicPhrase);
    return ethers.HDNodeWallet.fromMnemonic(mnemonic, path);
}

// Function to transfer funds to multiple accounts
async function transferToMultipleAccounts(url, sourceIndex, targetIndices, amountPerAccount) {
    const mnemonic = "test test test test test test test test test test test junk";

    // Get source wallet
    const sourceWallet = deriveWalletFromMnemonic(mnemonic, sourceIndex);
    console.log(`Source account (${sourceIndex}): ${sourceWallet.address}`);

    // Check source balance
    const sourceBalance = await getBalance(url, sourceWallet.address);
    const requiredAmount = BigInt(targetIndices.length) * ethers.parseEther(amountPerAccount.toString());

    console.log(`Source balance: ${ethers.formatEther(sourceBalance)} ETH`);
    console.log(`Required amount: ${ethers.formatEther(requiredAmount)} ETH`);

    if (sourceBalance < requiredAmount) {
        throw new Error(`Insufficient funds. Need ${ethers.formatEther(requiredAmount)} ETH, but have ${ethers.formatEther(sourceBalance)} ETH`);
    }

    // Transfer to each target account
    for (const targetIndex of targetIndices) {
        const targetWallet = deriveWalletFromMnemonic(mnemonic, targetIndex);
        console.log(`\n🔄 Transferring ${amountPerAccount} ETH to account ${targetIndex}: ${targetWallet.address}`);

        try {
            const receipt = await transferFrom(url, sourceWallet.privateKey, targetWallet.address, amountPerAccount);
            console.log(`✅ Transfer completed. Transaction hash: ${receipt.hash}`);
        } catch (error) {
            console.error(`❌ Transfer failed: ${error.message}`);
        }
    }

    // Verify final balances
    console.log("\n🔍 Verifying final balances:");
    for (const targetIndex of targetIndices) {
        const targetWallet = deriveWalletFromMnemonic(mnemonic, targetIndex);
        const balance = await getBalance(url, targetWallet.address);
        console.log(`Account ${targetIndex}: ${ethers.formatEther(balance)} ETH`);
    }
}

// Function to show account information
async function showAccounts(startIndex = 0, endIndex = 10, rpc = "http://localhost:8545") {
    const mnemonic = "test test test test test test test test test test test junk";

    console.log("🏦 Account Information for MetaMask Import");
    console.log(`Mnemonic: ${mnemonic}`);
    console.log("Derivation Path: m/44'/60'/0'/0/0");
    console.log("");

    for (let i = startIndex; i <= endIndex; i++) {
        const wallet = deriveWalletFromMnemonic(mnemonic, i);
        const balance = await getBalance(rpc, wallet.address);

        console.log(`➡️ Account ${i}:`);
        console.log(`🧾 Address:     ${wallet.address}`);
        console.log(`🔑 Private Key: ${wallet.privateKey}`);
        console.log(`💲 Balance:     ${ethers.formatEther(balance)} ETH`);
        console.log("");
    }

    console.log("📱 MetaMask Import Instructions:");
    console.log("1. Open MetaMask");
    console.log("2. Click on the account icon (top right)");
    console.log("3. Select 'Import Account'");
    console.log("4. Choose 'Private Key'");
    console.log("5. Paste the private key from any account above");
    console.log("6. Click 'Import'");
    console.log("");
    console.log("🌐 Network Configuration:");
    console.log("- Network Name: Besu Khloe Network");
    console.log(`- RPC URL: ${rpc}`);
    console.log(`- Chain ID: ${CHAIN_ID}`);
    console.log("- Currency Symbol: KHLOE");
}

// Command line handling
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
        case 'create-keys':
            const ip = args[1];
            if (!ip) {
                console.error('IP address required for create-keys');
                process.exit(1);
            }
            const keys = createKeys(ip);
            fs.writeFileSync("./key.priv", keys.privateKey);
            fs.writeFileSync("./key.pub", keys.publicKey);
            fs.writeFileSync("./address", keys.address);
            fs.writeFileSync("./enode", keys.enode);
            console.log('Keys created successfully');
            break;

        case 'network-info':
            const url = args[1] || 'http://localhost:8545';
            const info = await getNextworkInfo(url);
            console.log('Network Info:', info);
            break;

        case 'network-status':
            const statusUrl = args[1] || 'http://localhost:8545';
            try {
                const networkInfo = await getNextworkInfo(statusUrl);
                console.log('Network Status:', networkInfo);

                // Check if nodes are connected
                const peerCount = parseInt(networkInfo.peerCount.result, 16);
                console.log(`Connected peers: ${peerCount}`);

                if (peerCount > 0) {
                    console.log('✅ Network is healthy');
                } else {
                    console.log('⚠️  No peers connected');
                }
            } catch (error) {
                console.error('Error checking network status:', error);
                process.exit(1);
            }
            break;

        case 'balance':
            const balanceAddress = args[1];

            if (!balanceAddress) {
                console.error('Usage: balance <address>');
                process.exit(1);
            }
            try {
                const nodeRpc = args[2] || 'http://localhost:8545';
                const balance = await getBalance(nodeRpc, balanceAddress);
                console.log('Balance:', ethers.formatEther(balance), 'ETH');
            } catch (error) {
                console.error('Error getting balance:', error);
                process.exit(1);
            }
            break;

        case 'block-number':
            const nodeRpc = args[1];
            if (!nodeRpc) {
                console.error('Usage: block-number <rpc>');
                process.exit(1);
            }
            try {
                const blockNumber = await getBlockNumber(nodeRpc);
                console.log(`Block number for ${nodeRpc}:`, blockNumber);
            } catch (error) {
                console.error('Error getting block number:', error);
                process.exit(1);
            }
            break;

        case 'create-address':
            const mnemonic = "test test test test test test test test test test test junk";

            const HDNodeWallet = deriveWalletFromMnemonic(mnemonic, 0);
            console.log(HDNodeWallet.address);
            break;

        case 'transfer':
            const fromPrivateKey = args[1];
            const toAddress = args[2];
            const amount = args[3];

            if (!toAddress || !amount || !fromPrivateKey) {
                console.error('Usage: transfer <fromPrivate> <to> <amount>');
                process.exit(1);
            }
            try {
                const rpc = args[4] || 'http://localhost:8545';
                const tx = await transferFrom(rpc, fromPrivateKey, toAddress, amount);
                console.log('Transaction sent:', tx);
            } catch (error) {
                console.error('Error sending transaction:', error);
                process.exit(1);
            }
            break;

        case 'transfer-funds':
            const sourceIndex = parseInt(args[1]) || 0;
            const targetStart = parseInt(args[2]) || 1;
            const targetEnd = parseInt(args[3]) || 10;
            const amountPerAccount = parseFloat(args[4]) || 1;

            const targetIndices = [];
            for (let i = targetStart; i <= targetEnd; i++) {
                targetIndices.push(i);
            }

            try {
                const rpc = args[4] || 'http://localhost:8545';
                await transferToMultipleAccounts(rpc, sourceIndex, targetIndices, amountPerAccount);
                console.log("\n🎉 Fund transfer completed successfully!");
            } catch (error) {
                console.error('Error transferring funds:', error.message);
                process.exit(1);
            }
            break;

        case 'show-accounts':
            const startIndex = parseInt(args[1]) || 0;
            const endIndex = parseInt(args[2]) || 10;
            const rpc = args[3] || 'http://localhost:8545';
            await showAccounts(startIndex, endIndex, rpc);
            break;

        default:
            console.log(`
Available commands:
    create-keys <ip>                    - Create node keys for given IP address
    network-info [url]                  - Get network information (default network to http://localhost:8545)
    network-status [url]                - Check network health and peer connections (default network to http://localhost:8545)
    balance <address> [url]                  - Get balance for address (default network to http://localhost:8545)
    transfer <fromPrivate> <to> <amount> [url] - Transfer funds from one account to another (default network to http://localhost:8545)
    transfer-funds [source] [start] [end] [amount] [url] - Transfer funds to multiple accounts  (default network to http://localhost:8545)
    show-accounts [start] [end] [url]        - Show account information for MetaMask import network accounts (default network to http://localhost:8545)
            `);
    }
}

// Run if called directly
if (import.meta.url === new URL(import.meta.url).href) {
    main().catch(console.error);
}
