import pkg from 'elliptic';
const { ec: EC } = pkg;
import { ethers } from 'ethers';
import fetch from 'node-fetch';

import { Buffer } from 'buffer';
import keccak256 from 'keccak256';
import fs from 'fs';

async function callApi(url, method, params) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 })
    });
    const json = await response.json();
    return json;
}

function createKeysAndEnode(ip, port) {
  // Crear llaves
  // Crear curva elíptica sep256k1 (la que usa Ethereum y por lo tanto también la que usa Besu por que Besu se construye sobre Ethereum)
  const ec = new EC("secp256k1");
  // Crear pares de llaves
  const keyPair = ec.genKeyPair();
  // Obtener llave privada
  const privateKey = keyPair.getPrivate("hex");
  // Obtener llave pública
  const publicKey = keyPair.getPublic("hex");

  // Otener address
  const publicKeyBuffer = keccak256(Buffer.from(publicKey.slice(2), "hex"));
  // Obtener los últimos 20 bytes
  // 40 caracteres hexadecimales son equibalentes a 20 bytes
  // Cuando utilizamos slice con un start negativo se comienza a contar de derecha a izquierda y el finl default es el último caracter de la cadena
  const address = publicKeyBuffer.toString("hex").slice(-40);

  // Contruimos el enode
  const enode = `enode://${publicKey.slice(2)}@${ip}:${port}`;

  return {
    privateKey,
    publicKey,
    address,
    enode,
  }
}

function createKeys() {
   // Crear llaves
    // Crear curva elíptica sep256k1 (la que usa Ethereum y por lo tanto también la que usa Besu por que Besu se construye sobre Ethereum)
    const ec = new EC("secp256k1");
    // Crear pares de llaves
    const keyPair = ec.genKeyPair();
    // Obtener llave privada
    const privateKey = keyPair.getPrivate("hex");
    // Obtener llave pública
    const publicKey = keyPair.getPublic("hex");
  
    // Otener address
    const publicKeyBuffer = keccak256(Buffer.from(publicKey.slice(2), "hex"));
    // Obtener los últimos 20 bytes
    // 40 caracteres hexadecimales son equibalentes a 20 bytes
    // Cuando utilizamos slice con un start negativo se comienza a contar de derecha a izquierda y el finl default es el último caracter de la cadena
    const address = publicKeyBuffer.toString("hex").slice(-40);
  
    return {
      privateKey,
      publicKey,
      address,
    }
}

async function getBalance(url, address) {
    const data = await callApi(url, "eth_getBalance", [address, "latest"]);
    return BigInt(data.result);
}

async function transferFrom(url, fromPrivate, to, amount) {
    const wallet = new ethers.Wallet(fromPrivate);
    const provider = new ethers.JsonRpcProvider(url, { chainId: 246700, name: "private" });
    const connectedWallet = wallet.connect(provider);
    const tx = await connectedWallet.sendTransaction({
        to,
        value: ethers.parseEther(amount.toString())
    });
    const receipt = await tx.wait();
    return receipt;
}

async function getNetworkInfo(url) {
    const version = await callApi(url, "net_version", []);
    const peerCount = await callApi(url, "net_peerCount", []);
    return { version, peerCount };
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
        case 'createKeysAndEnode':
                    let enodeIP = args[1];
                    let enodePort = args[2];
                    var directory = args[3];
        
                    if (!enodeIP) {
                        console.error("IP is required for creating the enode");
                        process.exit(1);
                    } else if (!directory) {
                        console.error("Directory is required for saving the keys and enode");
                        process.exit(1);
                    } else if (!enodePort) {
                        console.error("Port is required for creating the enode");
                        process.exit(1);
                    }
                    var keys = createKeysAndEnode(enodeIP, enodePort);
                    fs.writeFileSync(`${directory}/key`, keys.privateKey);
                    fs.writeFileSync(`${directory}/pub`, keys.publicKey);
                    fs.writeFileSync(`${directory}/address`, keys.address);
                    fs.writeFileSync(`${directory}/enode`, keys.enode);
                    console.log("Keys and enode created successfully");
                    break;
                case 'createKeys':
                    var directory = args[1];
                    if (!directory) {
                        console.error("Directory is required for saving the keys and enode");
                        process.exit(1);
                    }
                    var keys = createKeys();
                    fs.writeFileSync(`${directory}/key`, keys.privateKey);
                    fs.writeFileSync(`${directory}/pub`, keys.publicKey);
                    fs.writeFileSync(`${directory}/address`, keys.address);
                    console.log("Keys created successfully");
                    break;
        case 'balance':
            const addr = args[1];
            const url1 = args[2] || 'http://localhost:1002';
            if (!addr) {
                console.error('Usage: balance <address>');
                process.exit(1);
            }
            try {
                const balance = await getBalance(url1, addr);
                console.log('Balance:', ethers.formatEther(balance), 'ETH');
            } catch (error) {
                console.error('Error getting balance:', error);
            }
            break;
        case 'transfer':
            const fromKey = args[1];
            const toAddr = args[2];
            const amt = args[3];
            const url2 = args[4] || 'http://localhost:1002';
            if (!fromKey || !toAddr || !amt) {
                console.error('Usage: transfer <fromPrivKey> <toAddress> <amount> [url]');
                process.exit(1);
            }
            try {
                const result = await transferFrom(url2, fromKey, toAddr, amt);
                console.log('Transaction sent:', result);
            } catch (err) {
                console.error('Error sending transaction:', err);
            }
            break;
        case 'network-info':
            const url = args[1] || 'http://localhost:8545';
            const info = await getNetworkInfo(url);
            console.log('Network Info:', info);
            break;
        default:
            console.log(`
Available commands:
  create-keys <ip>
  balance <address> [url]
  transfer <fromPrivKey> <toAddress> <amount> [url]
  network-info [url]
`);
    }
}

if (import.meta.url === new URL(import.meta.url).href) {
    main().catch(console.error);
}
