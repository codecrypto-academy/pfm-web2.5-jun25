import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { NetworkConfig } from '../../types';

export async function GET() {
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

    // Si las variables de entorno para una red por defecto existen, la creamos
    if (process.env.NEXT_PUBLIC_RPC_URL) {
        const defaultNetwork: NetworkConfig = {
            id: 'besu-local-env',
            name: 'Besu (local, env)',
            rpcUrl: process.env.NEXT_PUBLIC_RPC_URL,
            privateKey: process.env.PRIVATE_KEY || '',
            chainId: 1337,
            theme: {
                primary: 'blue-dark',
                secondary: 'blue-light',
            }
        };
        
        // La añadimos al principio de la lista
        configs.unshift(defaultNetwork);
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