import { NextRequest, NextResponse } from 'next/server';
import { NetworkManager } from '@/lib/network-manager';
import { CreateNetworkSchema } from '@/lib/validator';
import { NetworkResponse } from '@/types/api';

const networkManager = NetworkManager.getInstance();

// POST /api/networks - Crear una nueva red
export async function POST(request: NextRequest): Promise<NextResponse<NetworkResponse>> {
  try {
    const body = await request.json();
    
    // Validar input
    const validation = CreateNetworkSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Datos de entrada inválidos',
        data: validation.error.issues
      }, { status: 400 });
    }

    const { networkName, subnet, nodes, dataPath } = validation.data;

    // Crear la red
    const result = await networkManager.createNetwork(networkName, subnet, nodes, dataPath);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      data: { networkName, totalNodes: nodes.length }
    }, { status: 201 });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: `Error interno del servidor: ${(error as Error).message}`
    }, { status: 500 });
  }
}

// GET /api/networks - Listar todas las redes
export async function GET(): Promise<NextResponse<NetworkResponse>> {
  try {
    const result = await networkManager.listNetworks();

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        networks: result.data || [],
        total: result.data?.length || 0
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: `Error interno del servidor: ${(error as Error).message}`
    }, { status: 500 });
  }
}