// This script generates a public/private key pair and an enode URL for a bootnode in a private Ethereum network.
// --> The script will create the following files in the target directory:
// --> key.pub: public key in hex format
// --> key.priv: private key in hex format
// --> address: address in hex format
// --> enode: enode URL in the format enode://<public_key_without_prefix>@<ip>:30303
const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");

const { ec } = require("elliptic");
const fs = require("fs");

// get the command line arguments
const args = yargs(hideBin(process.argv))
  .option("bootnode_dir", {
    alias: "dir",
    type: "string",
    description: "Directory where the files will be created",
    demandOption: true,
  })
  .option("bootnode_ip", {
    alias: "ip",
    type: "string",
    description: "Bootnode IP address",
    demandOption: true,
  })
  .parseSync();

const { bootnode_dir: rootPath, bootnode_ip: ip} = args;

// generate the key pair using the secp256k1 curve
const ecObj = new ec("secp256k1");
const key = ecObj.genKeyPair();

// generate the public key in hex format
const pubKey = key.getPublic("hex");
fs.writeFileSync(`${rootPath}/key.pub`, pubKey);
console.log(`Public key: ${rootPath}/key.pub`);


// generate the private key in hex format
const privKey = key.getPrivate("hex");
fs.writeFileSync(`${rootPath}/key.priv`, privKey);
console.log(`Private key: ${rootPath}/key.priv`);

// generate the address from the public key
// --> In Ethereum, the '04' prefix is used to indicate that the public key is uncompressed
// --> To generate the wallet address,
//      --> this prefix '04' should be removed
//      --> should use the Keccak-256 hash algorithm

const pubKeyWithoutPrefix = pubKey.slice(2); // remove '04' prefix

const keccak256 = require("keccak256");
const address = keccak256(Buffer.from(pubKeyWithoutPrefix, "hex"))
  .toString("hex")
  .slice(-40);
fs.writeFileSync(`${rootPath}/address`, address);
console.log(`Address: ${rootPath}/address`);

// create enode URL from the public key and IP address
const enode = `enode://${pubKeyWithoutPrefix}@${ip}:30303`;
fs.writeFileSync(`${rootPath}/enode`, enode);
console.log(`enode: ${rootPath}/enode`);
