import { ethers } from "ethers";
import fs from "fs";

async function main() {
  const [rpcUrl, minerPrivateKey, mnemonic] = process.argv.slice(2);
  if (!rpcUrl || !minerPrivateKey || !mnemonic) {
    console.error("Uso: node transfer.js <RPC_URL> <MINER_PRIVATE_KEY> <MNEMONIC>");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  // Conectar la wallet del nodo minero usando su clave privada
  const minerWallet = new ethers.Wallet(minerPrivateKey, provider);
  const chainId = (await provider.getNetwork()).chainId;

  console.log("Usando cadena:", chainId);
  console.log("Billetera del minero:", minerWallet.address);

  const initialBalance = await provider.getBalance(minerWallet.address);
  console.log(`Balance inicial del minero: ${ethers.formatEther(initialBalance)} ETH`);

  // Leer las direcciones desde accounts.json
  let targetAddresses = [];
  try {
    const accountsData = fs.readFileSync("accounts.json", "utf8");
    targetAddresses = JSON.parse(accountsData);
    console.log(`\nLeyendo ${targetAddresses.length} direcciones objetivo desde accounts.json`);
  } catch (error) {
    console.error("Error leyendo accounts.json:", error.message);
    process.exit(1);
  }

  // Crear wallets derivadas del mnemónico para poder hacer transferencias entre ellas
  const derivedWallets = [];
  
  for (let i = 0; i < targetAddresses.length; i++) {
    // Usar el mismo método que generateAccounts.mjs
    const path = `m/44'/60'/0'/0/${i}`;
    const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic, path);
    const connectedWallet = wallet.connect(provider);
    derivedWallets.push(connectedWallet);
  }

  console.log("\n=== TRANSFERENCIAS DESDE EL MINERO ===");
  // Transferencias desde el minero a las direcciones derivadas
  for (let i = 0; i < targetAddresses.length; i++) {
    try {
      const targetAddress = targetAddresses[i];
      
      console.log(`\nEnviando a dirección #${i}: ${targetAddress}`);

      // Verificar que no estamos enviando a la misma dirección
      if (targetAddress === minerWallet.address) {
        console.log(`⚠️ Saltando dirección ${i} - es la misma que el minero`);
        continue;
      }

      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice ?? ethers.parseUnits("1", "gwei");

      const tx = await minerWallet.sendTransaction({
        to: targetAddress,
        value: ethers.parseEther("20"),
        gasLimit: 21000,
        gasPrice
      });

      console.log(`Enviando 20 ETH a ${targetAddress}`);
      console.log("Transacción enviada. TxHash:", tx.hash);

      const receipt = await tx.wait();
      console.log(`Confirmada en bloque ${receipt.blockNumber}`);
      console.log(`Gas usado: ${receipt.gasUsed.toString()}`);

      const targetBalance = await provider.getBalance(targetAddress);
      console.log(`Nuevo balance del objetivo: ${ethers.formatEther(targetBalance)} ETH`);
    } catch (err) {
      console.error(`⚠️ Error en la transferencia ${i}:`, err.message || err);
    }
  }

  console.log("\n=== TRANSFERENCIAS ENTRE DIRECCIONES GENERADAS ===");
  
  // Hacer 5 transferencias aleatorias entre las direcciones generadas
  const transfers = [
    { from: 0, to: 2, amount: "12.5" },
    { from: 1, to: 4, amount: "15.3" },
    { from: 3, to: 7, amount: "11.8" },
    { from: 5, to: 9, amount: "13.2" },
    { from: 6, to: 1, amount: "14.7" }
  ];

  for (let i = 0; i < transfers.length; i++) {
    try {
      const transfer = transfers[i];
      const senderWallet = derivedWallets[transfer.from];
      const senderAddress = senderWallet.address;
      const receiverAddress = targetAddresses[transfer.to];
      
      console.log(`\nTransferencia ${i + 1}: Wallet ${transfer.from} → Wallet ${transfer.to}`);
      console.log(`Emisor: ${senderAddress}`);
      console.log(`Destinatario: ${receiverAddress}`);

      // Verificar que la wallet tiene fondos para enviar
      const senderBalance = await provider.getBalance(senderAddress);
      const amountToSend = ethers.parseEther(transfer.amount);
      
      if (senderBalance < amountToSend) {
        console.log(`⚠️ Wallet ${transfer.from} no tiene suficientes fondos para enviar ${transfer.amount} ETH`);
        continue;
      }

      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice ?? ethers.parseUnits("1", "gwei");
      const gasLimit = 21000;
      const gasCost = gasPrice * BigInt(gasLimit);

      // Verificar que tiene suficientes fondos para gas + envío
      if (senderBalance < (amountToSend + gasCost)) {
        console.log(`⚠️ Wallet ${transfer.from} no tiene suficientes fondos para gas + envío`);
        continue;
      }

      const tx = await senderWallet.sendTransaction({
        to: receiverAddress,
        value: amountToSend,
        gasLimit,
        gasPrice
      });

      console.log(`Enviando ${transfer.amount} ETH a ${receiverAddress}`);
      console.log("Transacción enviada. TxHash:", tx.hash);

      const receipt = await tx.wait();
      console.log(`Confirmada en bloque ${receipt.blockNumber}`);
      console.log(`Gas usado: ${receipt.gasUsed.toString()}`);

      const receiverBalance = await provider.getBalance(receiverAddress);
      console.log(`Nuevo balance del receptor: ${ethers.formatEther(receiverBalance)} ETH`);
      
      const senderBalanceAfter = await provider.getBalance(senderAddress);
      console.log(`Nuevo balance del emisor: ${ethers.formatEther(senderBalanceAfter)} ETH`);
    } catch (err) {
      console.error(`⚠️ Error en la transferencia entre direcciones ${i}:`, err.message || err);
    }
  }

  const finalBalance = await provider.getBalance(minerWallet.address);
  console.log(`\nBalance final del minero: ${ethers.formatEther(finalBalance)} ETH`);
  console.log("✅ Transferencias completadas.");
}

main().catch(console.error);