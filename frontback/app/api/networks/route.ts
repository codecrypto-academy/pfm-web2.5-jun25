import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { NetworkConfig } from '../../types';
import { getAllNetworks, getNetwork } from '../../../lib/networkManager';
import { initializeDefaultNetwork, getDefaultNetworkInfo } from '../../../lib/initializeDefaultNetwork';

export async function GET() {
    // Inicializar la red por defecto desde el .env
    await initializeDefaultNetwork();
    
    const networksDir = path.join(process.cwd(), 'app', 'networks');
    let configs: NetworkConfig[] = [];

    // Cargar configuraciones desde archivos JSON
    try {
        const files = fs.readdirSync(networksDir);
        configs = files
            .filter(file => file.endsWith('.json'))
            .map(file => {
                const filePath = path.join(networksDir, file);
                const fileContent = fs.readFileSync(filePath, 'utf-8');
                return JSON.parse(fileContent);
            });
    } catch (error) {
        console.warn('Could not read network configurations from files:', error);
        // No es un error fatal, podemos continuar sin redes preconfiguradas
    }

    // Agregar la red por defecto si está disponible
    if (process.env.RPC_URL) {
        const defaultNetworkInfo = getDefaultNetworkInfo();
        // Crear la configuración de red compatible con el tipo NetworkConfig
        const defaultNetwork: NetworkConfig = {
            id: defaultNetworkInfo.id,
            name: defaultNetworkInfo.name,
            rpcUrl: defaultNetworkInfo.rpcUrl,
            chainId: defaultNetworkInfo.chainId,
            privateKey: process.env.PRIVATE_KEY || '',
            theme: {
                primary: 'blue-dark',
                secondary: 'blue-light'
            }
        };
        
        // La añadimos al principio de la lista
        configs.unshift(defaultNetwork);
    }

    // También agregar el env fallback si existe
    if (process.env.NEXT_PUBLIC_RPC_URL) {
        const envNetwork: NetworkConfig = {
            id: 'besu-local-env',
            name: 'Besu (local, env)',
            rpcUrl: process.env.NEXT_PUBLIC_RPC_URL,
            chainId: 1337,
            privateKey: '',
            theme: {
                primary: 'blue-dark',
                secondary: 'blue-light'
            }
        };
        
        configs.push(envNetwork);
    }

    return NextResponse.json(configs);
}

export async function POST(request: Request) {
    try {
        const { id, name, rpcUrl, chainId } = await request.json();
        
        if (!id || !name || !rpcUrl || !chainId) {
            return NextResponse.json({ error: 'id, name, rpcUrl, and chainId are required' }, { status: 400 });
        }

        const newNetwork: NetworkConfig = {
            id,
            name,
            rpcUrl,
            chainId: parseInt(chainId, 10),
            privateKey: '', // Las redes añadidas manualmente no tienen private key
            theme: {
                primary: 'blue-dark',
                secondary: 'blue-light',
            }
        };

        const networksDir = path.join(process.cwd(), 'app', 'networks');
        
        // Crear directorio si no existe
        if (!fs.existsSync(networksDir)) {
            fs.mkdirSync(networksDir, { recursive: true });
        }

        const filePath = path.join(networksDir, `${id}.json`);
        
        // Verificar si ya existe
        if (fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'Network with this ID already exists' }, { status: 409 });
        }

        // Guardar la nueva red
        fs.writeFileSync(filePath, JSON.stringify(newNetwork, null, 2));

        return NextResponse.json(newNetwork, { status: 201 });
    } catch (error) {
        console.error('Error creating network:', error);
        return NextResponse.json({ error: 'Failed to create network' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        
        if (!id) {
            return NextResponse.json({ error: 'Network ID is required' }, { status: 400 });
        }

        // No permitir borrar la red por defecto del entorno
        if (id === 'besu-local-env') {
            return NextResponse.json({ error: 'Cannot delete default environment network' }, { status: 403 });
        }

        const networksDir = path.join(process.cwd(), 'app', 'networks');
        const filePath = path.join(networksDir, `${id}.json`);
        
        // Verificar si el archivo existe
        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'Network not found' }, { status: 404 });
        }

        // Borrar el archivo
        fs.unlinkSync(filePath);

        return NextResponse.json({ message: 'Network deleted successfully' }, { status: 200 });
    } catch (error) {
        console.error('Error deleting network:', error);
        return NextResponse.json({ error: 'Failed to delete network' }, { status: 500 });
    }
} 