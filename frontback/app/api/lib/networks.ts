import fs from 'fs/promises';
import path from 'path';
import { NetworkConfig } from '../../types';

// Cache para evitar lecturas de disco repetitivas
const networkCache = new Map<string, NetworkConfig>();

export async function getNetworkConfig(networkId: string): Promise<NetworkConfig> {
  if (networkCache.has(networkId)) {
    return networkCache.get(networkId)!;
  }

  // Sanitize networkId para evitar path traversal
  const sanitizedId = path.normalize(networkId).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = path.join(process.cwd(), 'networks', `${sanitizedId}.json`);

  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const config: NetworkConfig = JSON.parse(fileContent);

    // Reemplazar el placeholder de la clave privada con la variable de entorno real
    if (config.privateKey === 'process.env.PRIVATE_KEY') {
      config.privateKey = process.env.PRIVATE_KEY || '';
    }
    
    networkCache.set(networkId, config);
    return config;
  } catch (error) {
    console.error(`Failed to load network config for ${networkId}:`, error);
    throw new Error(`Configuration for network '${networkId}' not found.`);
  }
} 