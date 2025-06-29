import { Wallet } from "ethers";
const mnemonic = "test test test test test test test test test test test junk";

for (let i = 0; i < 3; i++) {
    const path = `m/44'/60'/0'/0/${i}`;
    const wallet = Wallet.fromPhrase(mnemonic, path);
    console.log(`Account ${i}: ${wallet.address}`);
}
