import pkg from "elliptic"; // Librería para curvas elípticas
const { ec: EC } = pkg;

import { Buffer } from "buffer";
import keccak256 from "keccak256"; // Para generar address Ethereum
import fs from "fs";
import path from "path";

// Genera un par de llaves EC y su dirección
function generateKeyPair() {
  const ec = new EC("secp256k1");
  const keyPair = ec.genKeyPair();
  const privateKey = keyPair.getPrivate("hex");
  const publicKey = keyPair.getPublic("hex");
  const address = keccak256(Buffer.from(publicKey.slice(2), "hex"))
    .toString("hex")
    .slice(-40);
  return { privateKey, publicKey, address };
}

// Igual que arriba, pero agrega enode
function generateKeyPairWithEnode(ip, port) {
  const { privateKey, publicKey, address } = generateKeyPair();
  const enode = `enode://${publicKey.slice(2)}@${ip}:${port}`;
  return { privateKey, publicKey, address, enode };
}

// Guarda llaves en archivos
function saveToDir(data, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, "key"), data.privateKey);
  fs.writeFileSync(path.join(targetDir, "pub"), data.publicKey);
  fs.writeFileSync(path.join(targetDir, "address"), data.address);
  if (data.enode) fs.writeFileSync(path.join(targetDir, "enode"), data.enode);
}

// CLI
async function main() {
  const [cmd, ipOrDir, port, dir] = process.argv.slice(2);
  if (cmd === "createKeys") {
    if (!ipOrDir) return console.error("Uso: createKeys <DIRECTORIO>");
    const keys = generateKeyPair();
    saveToDir(keys, ipOrDir);
  } else if (cmd === "createKeysAndEnode") {
    if (!ipOrDir || !port || !dir) return console.error("Uso: createKeysAndEnode <IP> <PORT> <DIR>");
    const keys = generateKeyPairWithEnode(ipOrDir, port);
    saveToDir(keys, dir);
  } else {
    console.error("Comando no válido.");
  }
}
main();
