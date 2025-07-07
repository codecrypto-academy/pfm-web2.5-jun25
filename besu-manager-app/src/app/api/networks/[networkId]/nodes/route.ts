import { LogLevel, createBesuNodeManager, createDockerNetworkManager } from 'besu-network-manager';

import { NextResponse } from 'next/server';

/**
 * Extract node name from container name
 * Supports formats: besu-{name} and {network}-{type}-{name}
 */
function extractNodeNameFromContainer(containerName: string): string {
  const cleanName = containerName.startsWith('/') ? containerName.substring(1) : containerName;
  
  // For new naming convention: {network}-{type}-{name}
  const parts = cleanName.split('-');
  if (parts.length >= 3 && ['bootnode', 'signer', 'miner', 'normal'].includes(parts[1])) {
    // Extract the name part (everything after {network}-{type}-)
    return parts.slice(2).join('-');
  }
  
  // For besu naming convention: besu-{name}
  if (cleanName.startsWith('besu-')) {
    return cleanName.replace('besu-', '');
  }
  
  return cleanName;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ networkId: string }> }
) {
  try {
    const { networkId } = await params;
    
    if (!networkId) {
      return NextResponse.json(
        { error: 'ID de red requerido' },
        { status: 400 }
      );
    }

    const networkManager = createDockerNetworkManager(LogLevel.INFO);
    const nodeManager = createBesuNodeManager('./temp-nodes', LogLevel.INFO);
    
    // Obtener contenedores de la red específica
    const networkContainers = await networkManager.getNetworkContainers(networkId);
    
    // Obtener información detallada de cada nodo usando BesuNodeManager
    const detailedNodes = [];
    
    for (const container of networkContainers) {
      // Extraer el nombre del nodo del nombre del contenedor usando la misma lógica que BesuNodeManager
      const nodeName = extractNodeNameFromContainer(container.name);
      
      try {
        const nodeStatus = await nodeManager.getNodeStatus(nodeName);
        if (nodeStatus) {
          const ports = [];
          if (nodeStatus.ports?.rpc) {
            ports.push(`${nodeStatus.ports.rpc}:8545`);
          }
          if (nodeStatus.ports?.p2p) {
            ports.push(`${nodeStatus.ports.p2p}:30303`);
          }
          
          // Determinar si es bootnode basándose en el nombre del contenedor o nodeType
          const isBootnode = container.name.includes('-bootnode-') || container.name.includes('bootnode');
          
          detailedNodes.push({
            id: nodeStatus.containerId,
            name: nodeStatus.name,
            status: nodeStatus.containerStatus,
            ports: ports,
            networkId: networkId,
            blockNumber: nodeStatus.blockNumber,
            peerCount: nodeStatus.peerCount,
            enodeUrl: nodeStatus.enodeUrl,
            ipAddress: nodeStatus.ipAddress,
            nodeType: nodeStatus.nodeType,
            isBootnode: isBootnode
          });
        }
      } catch (error) {
        console.error(`Error obteniendo estado del nodo ${nodeName}:`, error);
        // Agregar información básica del contenedor si falla la obtención detallada
        const isBootnode = container.name.includes('-bootnode-') || container.name.includes('bootnode');
        
        detailedNodes.push({
          id: container.id,
          name: container.name,
          status: container.state,
          ports: [],
          networkId: networkId,
          blockNumber: null,
          peerCount: null,
          enodeUrl: null,
          ipAddress: container.ipAddress,
          nodeType: null,
          isBootnode: isBootnode
        });
      }
    }
    
    return NextResponse.json(detailedNodes);
  } catch (error) {
    console.error('Error al obtener nodos de la red:', error);
    return NextResponse.json(
      { error: 'Error al obtener los nodos de la red' },
      { status: 500 }
    );
  }
}