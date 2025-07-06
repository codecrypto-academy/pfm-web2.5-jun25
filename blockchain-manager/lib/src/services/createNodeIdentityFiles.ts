
import pkg from 'elliptic';
import fs from "fs";
import { BesuNodeConfig } from '../types';
import { generateNodeIdentity } from './generateNodeIdentity';

const { ec: EC } = pkg;

export function createNodeIdentityFiles(nodeConfig: BesuNodeConfig) {
    const { address, enode, privateKey, publicKey } = generateNodeIdentity(nodeConfig.network.ip);

    const nodeIdentityPath = `${process.cwd()}/${nodeConfig.network.name}`;
    if (!fs.existsSync(`${nodeIdentityPath}/${nodeConfig.name}`)) {
        fs.mkdirSync(`${nodeIdentityPath}/${nodeConfig.name}`, { recursive: true });
    }

    fs.writeFileSync(`${nodeIdentityPath}/${nodeConfig.name}/key.priv`, privateKey);
    fs.writeFileSync(`${nodeIdentityPath}/${nodeConfig.name}/key.pub`, publicKey);
    fs.writeFileSync(`${nodeIdentityPath}/${nodeConfig.name}/address`, address);
    fs.writeFileSync(`${nodeIdentityPath}/${nodeConfig.name}/enode`, enode);

    return {
        privateKeyFile: `${nodeIdentityPath}/${nodeConfig.name}/key.priv`,
        publicKeyFile: `${nodeIdentityPath}/${nodeConfig.name}/key.pub`,
        addressFile: `${nodeIdentityPath}/${nodeConfig.name}/address`,
        enodeFile: `${nodeIdentityPath}/${nodeConfig.name}/enode`,
    }
}