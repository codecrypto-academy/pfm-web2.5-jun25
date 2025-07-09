// /api/networks/[id]/containers/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { DockerManager } from '@/lib/docker-manager';
import { ResourceManager } from '@/lib/resource-manager';

const dockerManager = new DockerManager();
const resourceManager = new ResourceManager(dockerManager);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { minerEnabled, nodeType = 'rpc' } = await request.json();
    
    console.log('🔧 [API] Creando contenedor Besu para red:', params.id);
    console.log('⚙️ [API] Configuración:', { minerEnabled, nodeType });

    // ⚡ PASO 1: Verificar que la red existe
    try {
      await dockerManager.getNetworkInfo(params.id);
      console.log('✅ [API] Red encontrada:', params.id);
    } catch {
      return NextResponse.json(
        { error: `Red ${params.id} no encontrada` },
        { status: 404 }
      );
    }

    // ⚡ PASO 2: Generar configuración dinámica para el nodo
    console.log('🎯 [API] Generando configuración dinámica...');
    const nodeConfig = await resourceManager.generateNodeConfiguration(
      params.id,
      minerEnabled ? 'miner' : nodeType
    );

    console.log('✅ [API] Configuración generada:', nodeConfig);

    // ⚡ PASO 3: Crear configuración del contenedor Besu
    const besuCommand = [
      '--network=dev',
      '--data-path=/var/lib/besu',
      '--rpc-http-enabled=true',
      '--rpc-http-host=0.0.0.0',
      `--rpc-http-port=${nodeConfig.rpcPort}`,
      '--host-allowlist=*',
      '--rpc-http-cors-origins=*',
      '--rpc-http-api=ETH,NET,WEB3,ADMIN,MINER,DEBUG',
      '--p2p-enabled=true',
      `--p2p-port=${nodeConfig.p2pPort}`,
      '--discovery-enabled=false' // Deshabilitamos discovery para redes privadas
    ];

    // Configuración específica para mineros
    if (minerEnabled) {
      console.log('⛏️ [API] Configurando como nodo minero');
      besuCommand.push(
        '--miner-enabled=true',
        '--miner-coinbase=0xfe3b557e8fb62b89f4916b721be55ceb828dbd73'
      );
    }

    console.log('🚀 [API] Comando Besu:', besuCommand);

    // ⚡ PASO 4: Configurar contenedor Docker
    const containerOptions = {
      name: nodeConfig.name,
      Image: 'hyperledger/besu:latest',
      networkName: params.id,
      ip: nodeConfig.ip,
      Cmd: besuCommand,
      ExposedPorts: {
        [`${nodeConfig.rpcPort}/tcp`]: {},
        [`${nodeConfig.wsPort}/tcp`]: {},
        [`${nodeConfig.p2pPort}/tcp`]: {}
      },
      HostConfig: {
        PortBindings: {
          [`${nodeConfig.rpcPort}/tcp`]: [{ HostPort: nodeConfig.rpcPort.toString() }],
          [`${nodeConfig.p2pPort}/tcp`]: [{ HostPort: nodeConfig.p2pPort.toString() }]
        },
        RestartPolicy: {
          Name: 'unless-stopped'
        },
        Memory: 1024 * 1024 * 1024, // 1GB RAM limit
        CpuShares: 1024 // CPU shares
      },
      Env: [
        'BESU_LOGGING=INFO',
        `BESU_NODE_TYPE=${nodeType}`,
        `BESU_NETWORK_ID=${params.id.substring(0, 8)}`
      ],
      Labels: {
        'besu.network.id': params.id,
        'besu.node.type': nodeType,
        'besu.miner.enabled': minerEnabled.toString(),
        'besu.created': new Date().toISOString()
      }
    };

    // ⚡ PASO 5: Crear el contenedor
    console.log('🏗️ [API] Creando contenedor...');
    const containerId = await dockerManager.createContainer(containerOptions);

    // ⚡ PASO 6: Esperar un momento para que el nodo se inicie
    console.log('⏳ [API] Esperando inicio del nodo...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // ⚡ PASO 7: Verificar que el contenedor está corriendo
    try {
      const containerInfo = await dockerManager.getContainerInfo(nodeConfig.name);
      if (containerInfo.state !== 'running') {
        console.warn('⚠️ [API] Contenedor no está corriendo:', containerInfo.state);
      }
    } catch (error) {
      console.warn('⚠️ [API] Error verificando estado del contenedor:', error);
    }

    console.log('✅ [API] Contenedor creado exitosamente');

    // ⚡ PASO 8: Respuesta con toda la información del nodo
    return NextResponse.json({
      success: true,
      node: {
        id: containerId,
        name: nodeConfig.name,
        ip: nodeConfig.ip,
        ports: {
          rpc: nodeConfig.rpcPort,
          ws: nodeConfig.wsPort,
          p2p: nodeConfig.p2pPort
        },
        endpoints: {
          rpc: `http://localhost:${nodeConfig.rpcPort}`,
          ws: `ws://localhost:${nodeConfig.wsPort}`
        },
        type: nodeType,
        minerEnabled,
        networkId: params.id,
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [API] Error creando contenedor:', error);
    
    return NextResponse.json(
      { 
        error: 'Error al crear el contenedor',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// ⚡ GET: Obtener todos los nodos de una red
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const networkInfo = await dockerManager.getNetworkInfo(params.id);
    
    // Enriquecer la información de los contenedores
    const enrichedContainers = await Promise.all(
      networkInfo.containers.map(async (container) => {
        try {
          const containerInfo = await dockerManager.getContainerInfo(container.name);
          const dockerContainer = dockerManager.docker.getContainer(container.id);
          const inspectInfo = await dockerContainer.inspect();
          
          // Extraer información de puertos
          const ports = {
            rpc: null,
            ws: null,
            p2p: null
          };
          
          Object.entries(inspectInfo.NetworkSettings.Ports || {}).forEach(([port, bindings]) => {
            const portNum = parseInt(port.split('/')[0]);
            if (bindings && bindings[0]) {
              const hostPort = parseInt(bindings[0].HostPort);
              if (portNum >= 8545 && portNum <= 8600) ports.rpc = hostPort;
              else if (portNum >= 8646 && portNum <= 8700) ports.ws = hostPort;
              else if (portNum >= 30303 && portNum <= 30400) ports.p2p = hostPort;
            }
          });

          return {
            ...container,
            state: containerInfo.state,
            ports,
            endpoints: {
              rpc: ports.rpc ? `http://localhost:${ports.rpc}` : null,
              ws: ports.ws ? `ws://localhost:${ports.ws}` : null
            },
            labels: inspectInfo.Config.Labels || {},
            createdAt: inspectInfo.Created
          };
        } catch (error) {
          console.warn(`Error enriqueciendo info del contenedor ${container.name}:`, error);
          return container;
        }
      })
    );

    return NextResponse.json({
      success: true,
      network: {
        id: networkInfo.id,
        name: networkInfo.name,
        config: networkInfo.config
      },
      nodes: enrichedContainers
    });
  } catch (error) {
    console.error('❌ [API] Error obteniendo nodos:', error);
    return NextResponse.json(
      { error: 'Error al obtener nodos de la red' },
      { status: 500 }
    );
  }
}

// ⚡ DELETE: Eliminar un nodo específico
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const containerName = searchParams.get('container');
    
    if (!containerName) {
      return NextResponse.json(
        { error: 'Nombre del contenedor requerido (parámetro ?container=)' },
        { status: 400 }
      );
    }

    console.log(`🗑️ [API] Eliminando contenedor: ${containerName}`);
    await dockerManager.removeContainer(containerName, true);
    
    return NextResponse.json({
      success: true,
      message: `Nodo ${containerName} eliminado exitosamente`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [API] Error eliminando contenedor:', error);
    return NextResponse.json(
      { error: 'Error al eliminar el nodo', details: error.message },
      { status: 500 }
    );
  }
}
