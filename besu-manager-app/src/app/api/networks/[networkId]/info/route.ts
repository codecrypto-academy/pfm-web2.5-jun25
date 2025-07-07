import { createDockerNetworkManager, createFileSystem, LogLevel } from 'besu-network-manager';
import { NextResponse } from 'next/server';

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
    const fs = createFileSystem();
    
    // Obtener información de la red Docker
    const networks = await networkManager.getNetworks();
    const network = networks.find((n: unknown) => 
      typeof n === 'object' && n !== null && 'Name' in n && 
      (n as Record<string, unknown>).Name === networkId
    );
    
    if (!network) {
      return NextResponse.json(
        { error: 'Red no encontrada' },
        { status: 404 }
      );
    }

    // Generar chainId usando la misma lógica que el backend
    const chainId = parseInt(networkId.slice(-4), 16) || 1337;
    
    // Intentar leer el archivo genesis para obtener información adicional
    const genesisPath = `./temp-nodes/genesis-${networkId}.json`;
    let genesisInfo = null;
    
    try {
      if (await fs.exists(genesisPath)) {
        const genesisContent = await fs.readFile(genesisPath);
        const genesis = JSON.parse(genesisContent);
        genesisInfo = {
          chainId: genesis.config?.chainId || chainId,
          consensusProtocol: genesis.config?.clique ? 'clique' : 'unknown',
          blockPeriod: genesis.config?.clique?.period || 5
        };
      }
    } catch (error) {
      console.warn('Error leyendo archivo genesis:', error);
    }

    return NextResponse.json({
      id: network.Id,
      name: network.Name,
      driver: network.Driver,
      scope: network.Scope,
      chainId: genesisInfo?.chainId || chainId,
      consensusProtocol: genesisInfo?.consensusProtocol || 'clique',
      blockPeriod: genesisInfo?.blockPeriod || 5,
      genesisExists: genesisInfo !== null
    });
    
  } catch (error) {
    console.error('Error obteniendo información de la red:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}