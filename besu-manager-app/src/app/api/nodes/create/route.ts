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
    let bootnodes: string[] = [];
    
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
        blockPeriod: 5,
        validatorAddresses: createdNode.validatorAddress ? [
          createdNode.validatorAddress // Usar la dirección del nodo actual
        ] : []
      };
      
      // Generar el archivo genesis usando la librería
      await genesisGenerator.generateGenesisFile(genesisPath, genesisOptions);
    } else {
      // Si el archivo génesis ya existe, leer las direcciones de validadores existentes
      try {
        const existingGenesis = JSON.parse(await nodeFs.readFile(genesisPath));
        
        // Extraer direcciones existentes del extraData
        const extraData = existingGenesis.extraData;
        const prefix = extraData.substring(0, 66); // 0x + 64 zeros
        const suffix = extraData.substring(extraData.length - 130); // 130 zeros
        const existingValidators = extraData.substring(66, extraData.length - 130);
        
        // Convertir direcciones existentes a array
        const validatorAddresses = [];
        for (let i = 0; i < existingValidators.length; i += 40) {
          if (i + 40 <= existingValidators.length) {
            validatorAddresses.push('0x' + existingValidators.substring(i, i + 40));
          }
        }
        
        // Para nodos SIGNER, agregar su dirección al extraData si no existe
        if (besuNodeType === BesuNodeType.SIGNER && createdNode.validatorAddress) {
          const newAddress = createdNode.validatorAddress.toLowerCase();
          if (!validatorAddresses.some(addr => addr.toLowerCase() === newAddress)) {
            validatorAddresses.push(createdNode.validatorAddress);
            
            // Regenerar el extraData
            const validators = validatorAddresses
              .map(addr => addr.toLowerCase().substring(2))
              .join('');
            existingGenesis.extraData = prefix + validators + suffix;
            
            // Guardar el archivo actualizado
            await nodeFs.writeFile(genesisPath, JSON.stringify(existingGenesis, null, 2));
            logger.info(`Archivo génesis actualizado con nueva dirección: ${createdNode.validatorAddress}`);
          }
        }
        
        // Para nodos MINER, asignar una dirección de validador existente como miner-coinbase
        if (besuNodeType === BesuNodeType.MINER && validatorAddresses.length > 0) {
          // Usar la primera dirección de validador disponible como miner-coinbase
          createdNode.validatorAddress = validatorAddresses[0];
          logger.info(`Nodo MINER configurado con miner-coinbase: ${createdNode.validatorAddress}`);
        }
      } catch (error) {
        logger.warn('Error procesando archivo génesis:', error);
      }
    }
    
    // Generar archivo de configuración TOML usando ConfigGenerator
    const networkConfig = {
      chainId: parseInt(networkId.slice(-4), 16) || 1337,
      name: networkName,
      consensusProtocol: 'clique' as const,
      blockPeriod: 5,
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
          // Crear un nodeManager temporal para obtener el estado del bootnode
          const tempNodeManager = createBesuNodeManager('./temp-nodes');
          // Extraer el nombre del nodo del contenedor (formato: {network}-{type}-besu-{name})
          const nodeName = selectedBootnode.split('-besu-')[1];
          const selectedNodeStatus = await tempNodeManager.getNodeStatus(nodeName);
          
          if (selectedNodeStatus && selectedNodeStatus.enodeUrl && selectedNodeStatus.enodeUrl !== 'P2P network initializing...') {
            // Usar el enode tal como viene del nodo, ya incluye la IP correcta
            bootnodeEnode = selectedNodeStatus.enodeUrl;
            console.log(`Usando bootnode específico: ${bootnodeEnode}`);
          } else {
            console.warn(`No se pudo obtener enode del bootnode ${selectedBootnode}, usando placeholder`);
          }
        } catch (error) {
          console.warn(`Error obteniendo enode del bootnode ${selectedBootnode}:`, error);
        }
      }
      
      await configGenerator.generateNodeConfig(createdNode, networkConfig, bootnodeEnode);
      
      // Agregar el bootnode al array de bootnodes para el comando Docker
      if (bootnodeEnode !== "enode://placeholder@127.0.0.1:30303") {
        bootnodes = [bootnodeEnode];
      }
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