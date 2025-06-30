// Importe de la biblioteca lib-besu que maneja las redes y nodos de Besu
import { DockerNetwork, KeyValue, typeNode, BesuNode, KeyPair } from './lib-besu/index';

const bootnodePort = '18545'; // Puerto inicial para el bootnode

export async function createBesuNetwork(
  name: string,
  chainId: number,
  subnet: string,
  bootnodeIP: string,
  minerAddress: string,
  listOfNodes: { nodeType: string; ip: string; name: string; port: number }[],
  prefundedAccounts: { address: string; amount: string }[] = []
) {
  try {
    const prefundedAddresses = prefundedAccounts.map(acc => acc.address);
    const prefundedValues = prefundedAccounts.map(acc => acc.amount);
    const dockerNetwork = await DockerNetwork.create(name, chainId, subnet, [], minerAddress, prefundedAddresses, prefundedValues);
    await dockerNetwork.addBootnode('bootnode', bootnodePort, bootnodeIP);
    for (const node of listOfNodes) {
      switch (node.nodeType) {
        case 'miner':
          await dockerNetwork.addMiner(node.name, node.port.toString(), node.ip);
          break;
        case 'rpc':
          await dockerNetwork.addRpc(node.name, node.port.toString(), node.ip);
          break;
        case 'node':
          await dockerNetwork.addFullNode(node.name, node.port.toString(), node.ip);
          break;
      }
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: (error instanceof Error ? error.message : String(error)) };
  }
}

export async function removeBesuNetwork(name: string) {
  try {
    await DockerNetwork.removeDockerNetwork(name);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error instanceof Error ? error.message : String(error)) };
  }
}

export async function getBesuNetwork(name: string) {
  try {
    return { name };
  } catch (error) {
    return { success: false, error: (error instanceof Error ? error.message : String(error)) };
  }
}

export async function addBesuNode(networkName: string, nodeName: string, nodeType: string, port: string, ip?: string) {
  try {
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
    return { success: true };
  } catch (error) {
    return { success: false, error: (error instanceof Error ? error.message : String(error)) };
  }
}

export async function removeBesuNode(networkName: string, nodeName: string) {
  try {
    const network = new DockerNetwork(networkName);
    await network.removeNode(nodeName);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error instanceof Error ? error.message : String(error)) };
  }
}

export async function startBesuNetwork(name: string) {
  try {
    const network = new DockerNetwork(name);
    await network.start();
    return { success: true };
  } catch (error) {
    return { success: false, error: (error instanceof Error ? error.message : String(error)) };
  }
}

export async function stopBesuNetwork(name: string) {
  try {
    const network = new DockerNetwork(name);
    await network.stop();
    return { success: true };
  } catch (error) {
    return { success: false, error: (error instanceof Error ? error.message : String(error)) };
  }
}

export async function getBesuBalance(networkName: string, address: string) {
  try {
    const network = new DockerNetwork(networkName);
    return await network.getBalance(address);
  } catch (error) {
    return { success: false, error: (error instanceof Error ? error.message : String(error)) };
  }
}
