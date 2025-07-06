import pkg from 'elliptic';
const { ec: EC } = pkg;

import { Buffer } from 'buffer';
import keccak256 from 'keccak256';

export function generateNodeIdentity(ip: string) {
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