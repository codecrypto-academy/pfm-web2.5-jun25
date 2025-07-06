import {
  BesuNodeType,
  createBesuNodeManager,
  createConfigGenerator,
  createDockerNetworkManager,
  createFileSystem,
  createGenesisGenerator,
  createLogger
} from 'besu-network-manager';

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { networkId, nodeName: besuNodeName, nodeType = 'normal', isBootnode = false, selectedBootnode } = await request.json();
    
    if (!networkId || !besuNodeName) {
      return NextResponse.json(
        { error: 'ID de red y nombre del nodo son requeridos' },
        { status: 400 }
      );
    }
    
    // Validar nombre del nodo
    /* if (!/^[a-zA-Z0-9_\-]+$/.test(besuNodeName)) {
      return NextResponse.json(
        { error: 'El nombre del nodo solo puede contener letras, números, guiones y guiones bajos' },
        { status: 400 }
      );
    } */
    
    const networkManager = createDockerNetworkManager();
    
    // Verificar que la red existe
    const networks = await networkManager.getNetworks();
    const network = networks.find(net => net.Name === networkId);
    
    if (!network) {
      return NextResponse.json(
        { error: 'Red no encontrada' },
        { status: 404 }
      );
    }
    
    // Mapear tipos de nodo de la UI a BesuNodeType
    // Si es bootnode, siempre debe ser SIGNER (validador)
    let besuNodeType: BesuNodeType;
    if (isBootnode) {
      besuNodeType = BesuNodeType.SIGNER;
    } else {
      switch (nodeType) {
        case 'signer':
          besuNodeType = BesuNodeType.SIGNER;
          break;
        case 'miner':
          besuNodeType = BesuNodeType.MINER;
          break;
        case 'normal':
        default:
          besuNodeType = BesuNodeType.NORMAL;
          break;
      }
    }
    
    // Generar puertos externos únicos para evitar conflictos
    // Los puertos internos del contenedor siempre serán 8545 (RPC) y 30303 (P2P)
    const baseExternalRpcPort = 9000;
    const baseExternalP2pPort = 31000;
    const portOffset = Math.floor(Math.random() * 1000) + 1; // Offset aleatorio entre 1-1000
    
    // Crear configuración del nodo usando NodeCreationConfig
    // Los puertos aquí representan los puertos externos del host que se mapearán a los puertos estándar internos
    // Construir el nombre completo del contenedor
    const containerName = `${networkId}-${isBootnode ? 'bootnode' : nodeType}-besu-${besuNodeName}`;
    
    const nodeCreationConfig = {
      name: `besu-${besuNodeName}`,
      nodeType: besuNodeType,
      rpcPort: baseExternalRpcPort + portOffset,
      p2pPort: baseExternalP2pPort + portOffset
    };
    
    // Crear instancia de BesuNodeManager usando el nombre del contenedor como directorio
    const nodeManager = createBesuNodeManager(`./temp-nodes/${containerName}`);
    
    // Crear el nodo (genera configuración y claves)
    const createdNode = await nodeManager.createNode(nodeCreationConfig);
    
    // Marcar el nodo como bootnode si se especificó
    if (isBootnode) {
      createdNode.isBootnode = true;
    }
    
    // Iniciar el contenedor Docker del nodo
    // Usar un archivo genesis específico para esta red
    const networkName = network.Name || networkId;
    const path = require('path');
    const genesisPath = path.resolve(`./temp-nodes/genesis-${networkName}.json`);
    const bootnodes: string[] = [];
    
    // Crear archivo genesis específico para esta red usando GenesisGenerator
    const logger = createLogger();
    const nodeFs = createFileSystem();
    const genesisGenerator = createGenesisGenerator();
    const configGenerator = createConfigGenerator();
    
    // Verificar si el archivo genesis ya existe
    
    if (!(await nodeFs.exists(genesisPath))) {
      // Generar chainId único basado en el networkId
      const chainId = parseInt(networkId.slice(-4), 16) || 1337;
      
      // Configurar opciones para el genesis
      const genesisOptions = {
        chainId: chainId,
        consensusProtocol: 'clique' as const,
        blockPeriod: 15,
        validatorAddresses: [
          '0xfe3b557e8fb62b89f4916b721be55ceb828dbd73',
          '0x627306090abaB3A6e1400e9345bC60c78a8BEf57'
        ]
      };
      
      // Generar el archivo genesis usando la librería
      await genesisGenerator.generateGenesisFile(genesisPath, genesisOptions);
    }
    
    // Generar archivo de configuración TOML usando ConfigGenerator
    const networkConfig = {
      chainId: parseInt(networkId.slice(-4), 16) || 1337,
      name: networkName,
      consensusProtocol: 'clique' as const,
      blockPeriod: 15,
      nodeCount: 1,
      baseRpcPort: 8545,
      baseP2pPort: 30303,
      dataDir: './temp-nodes'
    };
    
    // Generar configuración específica según el tipo de nodo
    if (isBootnode) {
      await configGenerator.generateBootnodeConfig(createdNode, networkConfig);
    } else {
      // Para nodos regulares, obtener el enode del bootnode seleccionado
      let bootnodeEnode = "enode://placeholder@127.0.0.1:30303";
      
      if (selectedBootnode) {
        try {
          // Intentar obtener el enode del bootnode seleccionado
          // Construir el directorio del bootnode seleccionado
          const selectedBootnodeDir = `./temp-nodes/${selectedBootnode}`;
          const selectedNodeManager = createBesuNodeManager(selectedBootnodeDir);
          // Extraer el nombre del nodo del contenedor (formato: {network}-{type}-besu-{name})
          const nodeName = selectedBootnode.split('-besu-')[1];
          const selectedNodeStatus = await selectedNodeManager.getNodeStatus(nodeName);
          
          if (selectedNodeStatus && selectedNodeStatus.enodeUrl) {
            const enodeSplit1 = selectedNodeStatus.enodeUrl.split("@")
            const enodeSplit2 = enodeSplit1[1].split(":")
            enodeSplit2[0] = selectedNodeStatus.ipAddress as string
            bootnodeEnode = `${enodeSplit1[0]}@${enodeSplit2[0]}:${enodeSplit2[1]}`

            console.log(`Usando bootnode específico: ${bootnodeEnode}`);
          } else {
            console.warn(`No se pudo obtener enode del bootnode ${selectedBootnode}, usando placeholder`);
          }
        } catch (error) {
          console.warn(`Error obteniendo enode del bootnode ${selectedBootnode}:`, error);
        }
      }
      
      await configGenerator.generateNodeConfig(createdNode, networkConfig, bootnodeEnode);
    }
    
    await nodeManager.startNode(createdNode, network.Name || networkId, genesisPath, bootnodes);
    
    return NextResponse.json({
      success: true,
      nodeId: createdNode.name,
      message: `Nodo '${besuNodeName}' creado e iniciado exitosamente en la red '${network.Name}'`
    });
    
  } catch (error: any) {
    console.error('Error creando nodo:', error);
    
    if (error.message?.includes('port is already allocated')) {
      return NextResponse.json(
        { error: 'El puerto especificado ya está en uso' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}