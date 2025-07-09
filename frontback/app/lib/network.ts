import fs from 'fs';
import path from 'path';
import { NetworkConfig } from '@/types';

const networksDir = path.join(process.cwd(), 'app', 'networks');

export function getNetworkConfig(networkId: string): NetworkConfig | null {
  // Primero verificar si es la red por defecto de variables de entorno
  if (networkId === 'besu-local-env' && process.env.NEXT_PUBLIC_RPC_URL) {
    return {
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
  }

  // Luego buscar en archivos JSON
  const filePath = path.join(networksDir, `${networkId}.json`);
  try {
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const config: NetworkConfig = JSON.parse(fileContent);
      return config;
    }
    return null;
  } catch (error) {
    console.error(`Error reading or parsing network config for ${networkId}:`, error);
    return null;
  }
} 