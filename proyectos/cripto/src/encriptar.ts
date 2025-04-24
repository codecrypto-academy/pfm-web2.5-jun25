import { createCipheriv, createECDH } from "crypto";
import fs from "fs";
import path from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const args = yargs(hideBin(process.argv))
  .options({
    private_key: {
      type: "string",
      demandOption: true,
      alias: "key",
      description: "private key file name",
    },
    public_key: {
      type: "string",
      demandOption: true,
      alias: "pub",
      description: "public key file name",
    },
    filename: {
      type: "string",
      demandOption: true,
      alias: "f",
      description: "file name to encrypt",
    },
  })
  .parseSync();

const keysDirPath = "./keys/";
if (!fs.existsSync(keysDirPath)) {
  throw new Error(`Directory ${keysDirPath} does not exist`);
}

const { private_key, public_key, filename } = args;

const privateKeyPath = path.join(keysDirPath, private_key);
const publicKeyPath = path.join(keysDirPath, public_key);

const inputDataDirPath = "./input-data/";
if (!fs.existsSync(inputDataDirPath)) {
  throw new Error(`Directory ${inputDataDirPath} does not exist`);
}
const inputDataFilePath = path.join(inputDataDirPath, filename);

console.log(`Encrypting file ${inputDataFilePath} 
  with public key ${publicKeyPath} 
  and private key ${privateKeyPath}
`);

// recrear la clave privada del origen
const origen = createECDH("secp521r1"); // or "secp256k1"
const privateKey = fs.readFileSync(privateKeyPath, { encoding: "utf-8" });
origen.setPrivateKey(privateKey, "hex");


// clave secreta para cifrar el archivo
// la clave privada es la que tengo en mi poder y no se debe compartir con nadie, es la que se usa para firmar el mensaje
// para que el mensaje pueda ser descifrado por el destinatario, se usa la clave publica del destinatario para crear la clave secreta
// el destinatario puede descifrar el mensaje con su clave privada y la clave publica del origen
// esto es así porque la frase secreta que se genera y usa para cifrar/descifrar el mensaje es la misma para ambos casos
const publicKey = fs.readFileSync(publicKeyPath, { encoding: "utf-8" });
const secret = Uint8Array.from(origen.computeSecret(publicKey, "hex", "hex")); // Uint8Array array de 8 bits sin signo

// cifrado simetrico con algotimo AES-256-CBC
const cipher = createCipheriv(
  "aes-256-cbc",
  secret.slice(0, 32),
  secret.slice(0, 16) // initialization vector (IV) 16 bytes
);
const contentToCipher = fs.readFileSync(inputDataFilePath, { encoding: "utf-8" });
console.log(`Content to cipher: ${contentToCipher}`);

// cuando el archivo es grande se recomienda usar binary en lugar de hex
const encryptedContent = `${cipher.update(contentToCipher, "utf-8", "hex")}${cipher.final("hex")}`; // el resultado es un string hexadecimal

const outputDirPath = "./output/";
if (!fs.existsSync(outputDirPath)) {
  fs.mkdirSync(outputDirPath, { recursive: true });
}
console.log(`Encrypted content: ${encryptedContent}`);
const encryptedFilePath = path.join(outputDirPath, filename);
console.log(`Encrypted file path: ${encryptedFilePath}.enc`);

fs.writeFileSync(`${encryptedFilePath}.enc`, encryptedContent, { encoding: "utf-8" });
