import { createECDH } from 'crypto';
import fs from 'fs';
import path from 'path';
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const args = yargs(hideBin(process.argv)).options({
  key_name: {
    type: "string",
    demandOption: true,
    alias: "k",
    description: "key file name",
  }
}).parseSync();


const dirPath = "./keys/";
if (!fs.existsSync(dirPath)) {
  fs.mkdirSync(dirPath, { recursive: true });
}

console.log(`Generating ECDH key pair...`);

const keyPair = createECDH("secp521r1"); // or "secp256k1"

// generate a new key pair
keyPair.generateKeys();

const filePath = path.join(dirPath, args.key_name);

// alternative to "hex" -> "base64"
const publicKey = keyPair.getPublicKey().toString("hex");  
const privateKey = keyPair.getPrivateKey().toString("hex");

fs.writeFileSync(`${filePath}.pub`, publicKey, { encoding: "utf-8" });
console.log(`Public Key: ${publicKey} stored in ${filePath}.pub`);
fs.writeFileSync(`${filePath}.key`, privateKey, { encoding: "utf-8" });
console.log(`Private Key: ${privateKey} stored in ${filePath}.key`);

// To encrypt/decrypt data, use the public/private keys
// encrypt data with public key using my private key