import { NextResponse } from 'next/server';
import { createBesuNodeManager, DockerNetworkManager, BesuNodeType, GenesisGenerator, ConfigGenerator, Logger, FileSystem } from 'besu-network-manager';

export async function POST(request: Request) {
  try {
    const { networkId, nodeName: besuNodeName, nodeType = 'normal' } = await request.json();
    
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
    
    const networkManager = new DockerNetworkManager();
    
    // Verificar que la red existe
    const networks = await networkManager.getNetworks();
    const network = networks.find(net => net.Id === networkId);
    
    if (!network) {
      return NextResponse.json(
        { error: 'Red no encontrada' },
        { status: 404 }
      );
    }
    
    // Mapear tipos de nodo de la UI a BesuNodeType
    let besuNodeType: BesuNodeType;
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
    
    // Generar puertos únicos para evitar conflictos
    const baseRpcPort = 8545;
    const baseP2pPort = 30303;
    const portOffset = Math.floor(Math.random() * 1000) + 1; // Offset aleatorio entre 1-1000
    
    // Crear configuración del nodo usando NodeCreationConfig
    const nodeCreationConfig = {
      name: besuNodeName,
      nodeType: besuNodeType,
      rpcPort: baseRpcPort + portOffset,
      p2pPort: baseP2pPort + portOffset
    };
    
    // Crear instancia de BesuNodeManager usando la función factory
    const nodeManager = createBesuNodeManager('./temp-nodes');
    
    // Crear el nodo (genera configuración y claves)
    const createdNode = await nodeManager.createNode(nodeCreationConfig);
    
    // Iniciar el contenedor Docker del nodo
    // Usar un archivo genesis específico para esta red
    const networkName = network.Name || networkId;
    const path = require('path');
    const genesisPath = path.resolve(`./temp-nodes/genesis-${networkName}.json`);
    const bootnodes: string[] = [];
    
    // Crear archivo genesis específico para esta red usando GenesisGenerator
    const logger = new Logger({ level: 'INFO' });
    const fs = new FileSystem();
    const genesisGenerator = new GenesisGenerator(logger, fs);
    const configGenerator = new ConfigGenerator(logger, fs);
    
    // Verificar si el archivo genesis ya existe
    const nodeFs = require('fs');
    
    if (!nodeFs.existsSync(genesisPath)) {
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
      name: networkName
    };
    
    // Generar configuración específica según el tipo de nodo
    if (createdNode.nodeType === BesuNodeType.BOOTNODE) {
      await configGenerator.generateBootnodeConfig(createdNode, networkConfig);
    } else {
      // Para nodos regulares, necesitamos el enode del bootnode
      // Por ahora usamos un bootnode por defecto, pero esto debería obtenerse dinámicamente
      const bootnodeEnode = "enode://placeholder@127.0.0.1:30303";
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