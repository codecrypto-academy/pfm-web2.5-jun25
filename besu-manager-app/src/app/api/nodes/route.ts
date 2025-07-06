import { LogLevel, createBesuNodeManager, createDockerService } from 'besu-network-manager';

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Iniciando API /api/nodes');
    const nodeManager = createBesuNodeManager('./temp-nodes', LogLevel.INFO);
    const dockerService = createDockerService(LogLevel.INFO);
    
    console.log('Obteniendo estado de nodos...');
    // Obtener el estado de todos los nodos usando la funcionalidad completa de la librería
    const nodesStatus = await nodeManager.getAllNodesStatus();
    console.log(`Encontrados ${nodesStatus.length} nodos`);
    
    // Formatear los datos para el frontend usando toda la funcionalidad disponible
    const formattedNodes = [];
    
    for (const node of nodesStatus) {
      try {
        console.log(`Procesando nodo: ${node.name}`);
        
        const ports = [];
        if (node.ports?.rpc) {
          ports.push(`${node.ports.rpc}:8545`);
        }
        if (node.ports?.p2p) {
          ports.push(`${node.ports.p2p}:30303`);
        }
        
        // Usar DockerService para obtener información adicional del contenedor
        let containerInfo = null;
        let networkId = 'unknown'; // valor por defecto
        
        try {
          console.log(`Obteniendo info del contenedor: ${node.containerId}`);
          containerInfo = await dockerService.getContainerInfo(node.containerId);
          console.log('Info del contenedor obtenida exitosamente');
          
          // Extraer networkId del nombre del contenedor
          // Patrón esperado: {networkId}-{type}-{name} o besu-{name} (para compatibilidad)
          
          // Primero intentar obtener de la red Docker del contenedor
          if (containerInfo?.NetworkSettings?.Networks) {
            const networks = Object.keys(containerInfo.NetworkSettings.Networks);
            if (networks.length > 0) {
              // Usar la primera red que no sea 'bridge' o 'host'
              const dockerNetworkId = networks.find(net => net !== 'bridge' && net !== 'host') || networks[0];
              if (dockerNetworkId && dockerNetworkId !== 'bridge' && dockerNetworkId !== 'host') {
                networkId = dockerNetworkId;
              }
            }
          }
          
          // Si no se pudo obtener de Docker, extraer del nombre del contenedor
          if (networkId === 'unknown') {
            const nameParts = node.name.split('-');
            if (nameParts.length >= 2) {
              if (nameParts[0] === 'besu') {
                // Patrón: besu-{name} -> usar el segundo segmento
                networkId = nameParts[1];
              } else {
                // Patrón: {networkId}-{type}-{name}
                // Para nombres como 'another-red-bootnode-besu-alex', necesitamos encontrar el tipo
                const typeIndex = nameParts.findIndex(part => ['bootnode', 'signer', 'miner', 'normal'].includes(part));
                if (typeIndex > 0) {
                  // El networkId es todo lo que está antes del tipo
                  networkId = nameParts.slice(0, typeIndex).join('-');
                } else {
                  // Fallback: usar la primera parte
                  networkId = nameParts[0];
                }
              }
            }
          }
        } catch (dockerError) {
          console.warn(`Could not get container info for ${node.name}:`, dockerError?.message || dockerError);
          // Fallback: extraer networkId del nombre sin información de Docker
          const nameParts = node.name.split('-');
          if (nameParts.length >= 2) {
            if (nameParts[0] === 'besu') {
              networkId = nameParts[1];
            } else {
              // Patrón: {networkId}-{type}-{name}
              const typeIndex = nameParts.findIndex(part => ['bootnode', 'signer', 'miner', 'normal'].includes(part));
              if (typeIndex > 0) {
                // El networkId es todo lo que está antes del tipo
                networkId = nameParts.slice(0, typeIndex).join('-');
              } else {
                // Fallback: usar la primera parte
                networkId = nameParts[0];
              }
            }
          }
        }
        
        const formattedNode = {
          id: node.containerId,
          name: node.name,
          status: node.containerStatus,
          ports: ports,
          networkId: networkId,
          blockNumber: node.blockNumber,
          peerCount: node.peerCount,
          enodeUrl: node.enodeUrl,
          ipAddress: node.ipAddress,
          nodeType: node.nodeType,
          isBootnode: node.isBootnode,
          containerInfo: containerInfo // Información adicional del contenedor
        };
        
        formattedNodes.push(formattedNode);
        console.log(`Nodo procesado exitosamente: ${node.name}`);
        
      } catch (nodeError) {
        console.error(`Error procesando nodo ${node.name}:`, nodeError);
        // Continuar con el siguiente nodo en caso de error
      }
    }
    
    console.log(`Retornando ${formattedNodes.length} nodos formateados`);
    return NextResponse.json(formattedNodes);
  } catch (error) {
    console.error('Error al obtener nodos:', error);
    return NextResponse.json(
      { error: 'Error al obtener los nodos Besu', details: error?.message || error },
      { status: 500 }
    );
  }
}