import pkg from "elliptic";
const { ec: EC } = pkg;
import { ethers } from "ethers";
import { Buffer } from "buffer";
import keccak256 from "keccak256";
import fs from "fs";

/** * Realiza una llamada a la API JSON-RPC.
 * @param {string} url - URL del nodo JSON-RPC.
 * @param {string} method - Método a llamar (ej. "eth_getBalance").
 * @param {Array} params - Parámetros del método.
 * @returns {Promise<Object>} - Respuesta de la API.
 * @throws {Error} - Si la llamada falla.
 * */
async function callApi(url, method, params) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method,
      params,
      id: 1,
    }),
  });
  return await response.json();
}

/** Crea un par de claves y devuelve la clave privada, pública, dirección y enode.
 * @param {string} ip - Dirección IP del nodo.
 * @returns {Object} - Objeto con las claves generadas.
 * @property {string} privateKey - Clave privada en formato hexadecimal.
 * @property {string} publicKey - Clave pública en formato hexadecimal.
 * @property {string} address - Dirección de la cuenta en formato hexadecimal.
 * @property {string} enode - Enode del nodo.
 *
 */
function createKeys(ip) {
  const ec = new EC("secp256k1");
  const keyPair = ec.genKeyPair();
  const privateKey = keyPair.getPrivate("hex");
  const publicKey = keyPair.getPublic("hex");
  const pubKeyBuffer = keccak256(Buffer.from(publicKey.slice(2), "hex"));
  const address = pubKeyBuffer.toString("hex").slice(-40);
  const enode = `enode://${publicKey.slice(2)}@${ip}:30303`;
  return { privateKey, publicKey, address, enode };
}

/** Obtiene el balance de una dirección.
 * @param {string} url - URL del nodo JSON-RPC.
 * @param {string} address - Dirección de la cuenta.
 * @returns {Promise<bigint>} - Balance de la cuenta en wei.
 */
async function getBalance(url, address) {
  const data = await callApi(url, "eth_getBalance", [address, "latest"]);
  return BigInt(data.result);
}

/** Obtiene el número de bloque actual.
 * @param {string} url - URL del nodo JSON-RPC.
 * @param {string} fromPrivate - Clave privada del remitente.
 * @param {string} to - Dirección del destinatario.
 * @param {number} amount - Cantidad a transferir en ether.
 * @param {number} retries - Número de reintentos en caso de fallo.
 * @returns {Promise<number>} - Número del bloque actual.
 */
async function transferFrom(url, fromPrivate, to, amount, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const provider = new ethers.JsonRpcProvider(url);

      // Wait for provider connection
      await provider.getBlockNumber();

      // Create wallet
      const wallet = new ethers.Wallet(fromPrivate, provider);

      // Get current nonce
      const nonce = await provider.getTransactionCount(
        wallet.address,
        "pending"
      );
      console.log(`Using nonce ${nonce} for transaction to ${to}`);

      // Calculate gas price with increasing multiplier for retries
      const multiplier = 10 + i * 0.2; // Increase by 20% each retry
      const gasPrice = ethers.parseUnits((50 * multiplier).toFixed(0), "gwei");

      console.log(
        `Using gas price ${ethers.formatUnits(
          gasPrice,
          "gwei"
        )} gwei (retry ${i})`
      );

      // Create transaction with explicit parameters
      const tx = await wallet.sendTransaction({
        to: to,
        value: ethers.parseEther(amount.toString()),
        gasLimit: 21000,
        nonce: nonce,
        gasPrice: gasPrice,
        type: 0, // Legacy transaction type
      });

      console.log(`Transaction sent: ${tx.hash}`);
      return { hash: tx.hash, transactionHash: tx.hash };
    } catch (error) {
      console.error(`Transfer attempt ${i + 1} failed:`, error.message);

      // Check for specific error types
      if (error.message.includes("Replacement transaction underpriced")) {
        console.log("Increasing gas price for replacement transaction...");
      }

      if (i === retries - 1) throw error;

      console.log(`Retry ${i + 1}/${retries}: Waiting before next attempt...`);
      // Longer wait between retries
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

/** * Obtiene información de la red, como la versión y el número de pares.
 * @param {string} url - URL del nodo JSON-RPC.
 * @returns {Promise<{version: string, peerCount: string}>}
 */
async function getNetworkInfo(url) {
  const version = await callApi(url, "net_version", []);
  const peerCount = await callApi(url, "net_peerCount", []);
  return { version, peerCount };
}

/**
 * Deriva las primeras N cuentas de un mnemonic.
 * @param {string} mnemonic
 * @param {number} count
 * @returns {Array<{address: string, privateKey: string}>}
 */
/**
 * Deriva las primeras N cuentas de un mnemonic.
 * @param {string} mnemonic
 * @param {number} count
 * @returns {Array<{address: string, privateKey: string}>}
 */
function deriveAccountsFromMnemonic(mnemonic, count = 10) {
  const accounts = [];
  // This is the standard derivation path for Ethereum
  const basePath = "m/44'/60'/0'/0";

  for (let i = 0; i < count; i++) {
    // Create a completely new wallet for each account
    const hdNode = ethers.HDNodeWallet.fromMnemonic(
      ethers.Mnemonic.fromPhrase(mnemonic),
      `${basePath}/${i}`
    );

    accounts.push({
      address: hdNode.address,
      privateKey: hdNode.privateKey,
    });
  }
  return accounts;
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "create-keys": {
      const ip = args[1];
      if (!ip) {
        console.error("IP address required for create-keys");
        process.exit(1);
      }
      const keys = createKeys(ip);
      fs.writeFileSync("./key.priv", keys.privateKey);
      fs.writeFileSync("./key.pub", keys.publicKey);
      fs.writeFileSync("./address", keys.address);
      fs.writeFileSync("./enode", keys.enode);
      console.log("Keys created successfully");
      break;
    }
    case "network-info": {
      const url = args[1] || "http://localhost:8888";
      const info = await getNetworkInfo(url);
      console.log("Network Info:", info);
      break;
    }
    case "balance": {
      const balanceAddress = args[1];
      if (!balanceAddress) {
        console.error("Usage: balance <address>");
        process.exit(1);
      }
      try {
        const balance = await getBalance(
          "http://localhost:8888",
          balanceAddress
        );
        console.log("Balance:", ethers.formatEther(balance), "ETH");
      } catch (error) {
        console.error("Error getting balance:", error);
        process.exit(1);
      }
      break;
    }
    case "transfer": {
      const fromPrivateKey = args[1];
      const toAddress = args[2];
      const amount = args[3];
      if (!fromPrivateKey || !toAddress || !amount) {
        console.error("Usage: transfer <fromPrivate> <to> <amount>");
        process.exit(1);
      }
      try {
        const tx = await transferFrom(
          "http://localhost:8888",
          fromPrivateKey,
          toAddress,
          amount
        );
        console.log("Transaction sent:", tx);
      } catch (error) {
        console.error("Error sending transaction:", error);
        process.exit(1);
      }
      break;
    }
    case "fund-mnemonic": {
      // Usage: fund-mnemonic <fromPrivate> <mnemonic> <amountPerAccount> [rpcUrl]
      const fromPrivate = args[1];
      const mnemonic = args[2];
      const amount = args[3];
      const rpcUrl = args[4] || "http://localhost:8888";

      if (!fromPrivate || !mnemonic || !amount) {
        console.error(
          "Usage: fund-mnemonic <fromPrivate> <mnemonic> <amountPerAccount> [rpcUrl]"
        );
        process.exit(1);
      }

      // Check if node is ready
      console.log("Verificando conexión con el nodo...");
      try {
        const response = await fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_blockNumber",
            params: [],
            id: 1,
          }),
        });

        if (!response.ok) {
          console.error(
            "El nodo no está respondiendo correctamente. Esperando 10 segundos adicionales..."
          );
          await new Promise((resolve) => setTimeout(resolve, 10000));
        } else {
          console.log("Nodo listo para recibir transacciones.");
        }
      } catch (e) {
        console.error("Error conectando con el nodo:", e.message);
        console.log("Esperando 10 segundos adicionales...");
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }

      const accounts = deriveAccountsFromMnemonic(mnemonic, 10);
      console.log("Cuentas derivadas del mnemonic:");
      accounts.forEach((acc, i) => {
        console.log(`${i + 1}: ${acc.address}`);
      });

      // Transfers with more reliable error handling
      for (const acc of accounts) {
        let success = false;
        for (let attempt = 1; attempt <= 3 && !success; attempt++) {
          try {
            console.log(
              `Intentando transferir ${amount} ETH a ${acc.address} (intento ${attempt}/3)...`
            );
            const tx = await transferFrom(
              rpcUrl,
              fromPrivate,
              acc.address,
              amount,
              5
            );
            console.log(
              `✓ Enviado ${amount} ETH a ${acc.address}: ${
                tx.hash || tx.transactionHash
              }`
            );
            success = true;
          } catch (e) {
            console.error(
              `Error enviando a ${acc.address} (intento ${attempt}/3):`,
              e.message
            );
            if (attempt < 3)
              await new Promise((resolve) => setTimeout(resolve, 5000));
          }

          await new Promise((resolve) => setTimeout(resolve, 6000));
          try {
            const balance = await getBalance(rpcUrl, acc.address);
            console.log(
              `Balance de ${acc.address}: ${ethers.formatEther(balance)} ETH`
            );
          } catch (e) {
            console.error(
              `No se pudo obtener el balance de ${acc.address}:`,
              e.message
            );
          }
        }
      }
      break;
    }
    default:
      console.log(`
Available commands:
    create-keys <ip>     - Create node keys for given IP address
    network-info [url]   - Get network information (defaults to http://localhost:8888)
    balance <address>    - Get balance of an address
    transfer <fromPrivate> <to> <amount> - Transfer funds
            `);
  }
}

if (import.meta.url === new URL(import.meta.url).href) {
  main().catch(console.error);
}
