// Importe de la biblioteca lib-besu que maneja las redes y nodos de Besu
import { DockerNetwork, KeyValue, typeNode, BesuNode, KeyPair } from './lib-besu/index';

let lastPortUsed = 18545; // Puerto inicial para el bootnode

export async function createBesuNetwork(name: string, chainId: number, subnet: string, bootnodeIP: string, minerAddress: string, 
    listOfNodes: {nodeType: string, ip: string }[], prefundedAccounts: {address: string, amount: string }[] = []) {
  
  // Création des listes à partir de prefundedAccounts
  const prefundedAddresses = prefundedAccounts.map(acc => acc.address);
  const prefundedValues = prefundedAccounts.map(acc => acc.amount);

  const dockerNetwork = await DockerNetwork.create(name, chainId, subnet, [], minerAddress,prefundedAddresses, prefundedValues);
  await dockerNetwork.addBootnode('bootnode', lastPortUsed.toString(), bootnodeIP);
  lastPortUsed += 1; // Incrementar el puerto para el siguiente nodo
  for (const node of listOfNodes) {
    switch (node.nodeType) {
      case 'signer':
        await dockerNetwork.addMiner('miner' + lastPortUsed.toString(), lastPortUsed.toString(), node.ip);
        lastPortUsed += 1; // Incrementar el puerto para el siguiente nodo
        break;
      case 'rpc':
        await dockerNetwork.addRpc('rpc' + lastPortUsed.toString(), lastPortUsed.toString(), node.ip);
        lastPortUsed += 1; // Incrementar el puerto para el siguiente nodo
        break;
      case 'normal':
        await dockerNetwork.addFullNode('node' + lastPortUsed.toString(), lastPortUsed.toString(), node.ip);
        lastPortUsed += 1; // Incrementar el puerto para el siguiente nodo
        break;
    }
  }
  return dockerNetwork;
}

export async function removeBesuNetwork(name: string) {
  return DockerNetwork.removeDockerNetwork(name);
}

export async function getBesuNetwork(name: string) {
  return new DockerNetwork(name);
}

export async function addBesuNode(networkName: string, nodeName: string, nodeType: string, port: string, ip?: string) {
  const network = new DockerNetwork(networkName);
  switch (nodeType) {
    case 'bootnode':
      await network.addBootnode(nodeName, port, ip ?? '');
      break;
    case 'miner':
      await network.addMiner(nodeName, port, ip ?? '');
      break;
    case 'rpc':
      await network.addRpc(nodeName, port, ip ?? '');
      break;
    case 'node':
      await network.addFullNode(nodeName, port, ip ?? '');
      break;
  }
  return network;
}

export async function removeBesuNode(networkName: string, nodeName: string) {
  const network = new DockerNetwork(networkName);
  await network.removeNode(nodeName);
  return network;
}

export async function startBesuNetwork(name: string) {
  const network = new DockerNetwork(name);
  await network.start();
  return network;
}

export async function stopBesuNetwork(name: string) {
  const network = new DockerNetwork(name);
  await network.stop();
  return network;
}

export async function getBesuBalance(networkName: string, address: string) {
  const network = new DockerNetwork(networkName);
  return network.getBalance(address);
}
