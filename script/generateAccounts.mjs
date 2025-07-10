import { ethers } from "ethers";
import fs from "fs";

const mnemonic = process.argv[2];
if (!mnemonic || mnemonic.split(" ").length < 12) {
  console.error("Error: debes proporcionar un mnemonic válido.");
  process.exit(1);
}

const accounts = [];

for (let i = 0; i < 10; i++) {
  // Usar fromPhrase con el path completo
  const path = `m/44'/60'/0'/0/${i}`;
  const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic, path);
  accounts.push(wallet.address);
  console.log(`Dirección ${i}: ${wallet.address}`);
}

fs.writeFileSync("accounts.json", JSON.stringify(accounts, null, 2));
console.log("✅ Direcciones generadas y guardadas en accounts.json");
