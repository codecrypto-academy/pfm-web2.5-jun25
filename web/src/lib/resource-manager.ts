// lib/resource-manager.ts

import { DockerManager } from './docker-manager';
import crypto from 'crypto';

/**
 * Gestor de recursos para asignación dinámica de puertos, nombres, IPs y subredes
 */
export class ResourceManager {
  private dockerManager: DockerManager;
  
  // Rangos de puertos para diferentes servicios
  private readonly PORT_RANGES = {
    RPC: { start: 8545, end: 8600 },      // Puertos RPC: 8545-8600
    WS: { start: 8646, end: 8700 },       // WebSocket: 8646-8700
    P2P: { start: 30303, end: 30400 }     // P2P: 30303-30400
  };

  // Rango de subredes para redes
  private readonly SUBNET_RANGES = {
    start: 20,    // 172.20.0.0/16
    end: 50       // 172.50.0.0/16
  };

  constructor(dockerManager?: DockerManager) {
    this.dockerManager = dockerManager || new DockerManager();
  }

  /**
   * Genera una subred disponible para una nueva red
   */
  async generateAvailableSubnet(): Promise<string> {
    try {
      console.log('🔍 [ResourceManager] Buscando subred disponible...');
      
      // Obtener todas las redes existentes
      const networks = await this.dockerManager.docker.listNetworks();
      const usedSubnets = networks
        .map(net => net.IPAM?.Config?.[0]?.Subnet)
        .filter(Boolean);

      console.log('📋 [ResourceManager] Subredes en uso:', usedSubnets);

      // Buscar en rangos 172.20.x.0/16, 172.21.x.0/16, etc.
      for (let second = this.SUBNET_RANGES.start; second <= this.SUBNET_RANGES.end; second++) {
        const candidateSubnet = `172.${second}.0.0/16`;
        if (!usedSubnets.includes(candidateSubnet)) {
          console.log(`✅ [ResourceManager] Subred disponible encontrada: ${candidateSubnet}`);
          return candidateSubnet;
        }
      }

      throw new Error(`No hay subredes disponibles en el rango 172.${this.SUBNET_RANGES.start}-${this.SUBNET_RANGES.end}.x.x`);
    } catch (error) {
      console.warn('⚠️ [ResourceManager] Error buscando subredes, usando fallback:', error.message);
      
      // Fallback a subred aleatoria
      const randomSecond = Math.floor(Math.random() * 200) + 20; // 20-220
      const fallbackSubnet = `172.${randomSecond}.0.0/16`;
      console.log(`🎲 [ResourceManager] Subred fallback: ${fallbackSubnet}`);
      return fallbackSubnet;
    }
  }

  /**
   * Genera un nombre único para una red
   */
  generateNetworkName(baseName: string): string {
    // Limpiar el nombre base
    const cleanName = baseName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Agregar identificador único
    const uniqueId = crypto.randomBytes(2).toString('hex');
    
    return `${cleanName}-${uniqueId}`;
  }

  /**
   * Encuentra el siguiente puerto disponible en un rango
   */
  async findAvailablePort(type: 'RPC' | 'WS' | 'P2P'): Promise<number> {
    const range = this.PORT_RANGES[type];
    const usedPorts = await this.getUsedPorts();

    for (let port = range.start; port <= range.end; port++) {
      if (!usedPorts.includes(port)) {
        return port;
      }
    }

    throw new Error(`No hay puertos disponibles en el rango ${type}: ${range.start}-${range.end}`);
  }

  /**
   * Obtiene todos los puertos en uso por contenedores Docker
   */
  private async getUsedPorts(): Promise<number[]> {
    try {
      const containers = await this.dockerManager.docker.listContainers({ all: true });
      const usedPorts: number[] = [];

      containers.forEach(container => {
        container.Ports?.forEach(port => {
          if (port.PublicPort) {
            usedPorts.push(port.PublicPort);
          }
          if (port.PrivatePort) {
            usedPorts.push(port.PrivatePort);
          }
        });
      });

      return [...new Set(usedPorts)].sort((a, b) => a - b);
    } catch (error) {
      console.warn('Error obteniendo puertos usados:', error);
      return [];
    }
  }

  /**
   * Genera un nombre único para contenedor basado en el patrón del proyecto
   */
  generateContainerName(networkId: string, nodeType: 'miner' | 'rpc' | 'bootnode' = 'rpc'): string {
    // Tomar los primeros 8 caracteres del networkId para hacer el nombre más legible
    const networkPrefix = networkId.substring(0, 8);
    
    // Generar un identificador único corto
    const uniqueId = crypto.randomBytes(3).toString('hex');
    
    // Crear nombre siguiendo el patrón: <tipo><red><id>
    const typePrefix = nodeType === 'miner' ? 'm' : nodeType === 'bootnode' ? 'b' : 'n';
    
    return `${typePrefix}-${networkPrefix}-${uniqueId}`;
  }

  /**
   * Genera una IP disponible dentro de una subred
   */
  async generateAvailableIP(networkId: string, subnet: string = '172.21.0.0/16'): Promise<string> {
    try {
      // Obtener información de la red para ver IPs usadas
      const networkInfo = await this.dockerManager.getNetworkInfo(networkId);
      const usedIPs = networkInfo.containers.map(c => c.ip).filter(Boolean);

      // Extraer la base de la subred (ej: 172.21.0 de 172.21.0.0/16)
      const [baseIP] = subnet.split('/');
      const ipParts = baseIP.split('.');
      const baseOctets = ipParts.slice(0, 3).join('.');

      // Buscar la primera IP disponible empezando desde .10 (evitar .1 que suele ser gateway)
      for (let lastOctet = 10; lastOctet <= 254; lastOctet++) {
        const candidateIP = `${baseOctets}.${lastOctet}`;
        if (!usedIPs.includes(candidateIP)) {
          return candidateIP;
        }
      }

      throw new Error(`No hay IPs disponibles en la subred ${subnet}`);
    } catch (error) {
      // Si hay error obteniendo la red, generar IP aleatoria en el rango
      const ipParts = subnet.split('/')[0].split('.');
      const baseOctets = ipParts.slice(0, 3).join('.');
      const randomOctet = Math.floor(Math.random() * 240) + 10; // 10-250
      return `${baseOctets}.${randomOctet}`;
    }
  }

  /**
   * Verifica si un nombre de contenedor está disponible
   */
  async isContainerNameAvailable(name: string): Promise<boolean> {
    try {
      await this.dockerManager.getContainerInfo(name);
      return false; // Si no lanza error, el contenedor existe
    } catch {
      return true; // Si lanza error, el contenedor no existe
    }
  }

  /**
   * Verifica si un nombre de red está disponible
   */
  async isNetworkNameAvailable(name: string): Promise<boolean> {
    try {
      const networks = await this.dockerManager.docker.listNetworks();
      return !networks.some(net => net.Name === name);
    } catch {
      return true;
    }
  }

  /**
   * Genera configuración completa para una nueva red
   */
  async generateNetworkConfiguration(baseName: string): Promise<{
    name: string;
    subnet: string;
  }> {
    // Generar nombre único
    let name = this.generateNetworkName(baseName);
    
    // Verificar que el nombre esté disponible, si no, generar otro
    let attempts = 0;
    while (!(await this.isNetworkNameAvailable(name)) && attempts < 10) {
      name = this.generateNetworkName(baseName);
      attempts++;
    }

    if (attempts >= 10) {
      throw new Error('No se pudo generar un nombre único para la red después de 10 intentos');
    }

    // Generar subred disponible
    const subnet = await this.generateAvailableSubnet();

    return {
      name,
      subnet
    };
  }

  /**
   * Genera configuración completa para un nuevo nodo
   */
  async generateNodeConfiguration(
    networkId: string, 
    nodeType: 'miner' | 'rpc' | 'bootnode' = 'rpc',
    subnet?: string
  ): Promise<{
    name: string;
    ip: string;
    rpcPort: number;
    wsPort: number;
    p2pPort: number;
  }> {
    // Generar nombre único
    let name = this.generateContainerName(networkId, nodeType);
    
    // Verificar que el nombre esté disponible, si no, generar otro
    let attempts = 0;
    while (!(await this.isContainerNameAvailable(name)) && attempts < 10) {
      name = this.generateContainerName(networkId, nodeType);
      attempts++;
    }

    if (attempts >= 10) {
      throw new Error('No se pudo generar un nombre único después de 10 intentos');
    }

    // Generar puertos disponibles
    const [rpcPort, wsPort, p2pPort] = await Promise.all([
      this.findAvailablePort('RPC'),
      this.findAvailablePort('WS'),
      this.findAvailablePort('P2P')
    ]);

    // Generar IP disponible
    const ip = await this.generateAvailableIP(networkId, subnet);

    return {
      name,
      ip,
      rpcPort,
      wsPort,
      p2pPort
    };
  }

  /**
   * Obtiene estadísticas de uso de recursos
   */
  async getResourceStats(): Promise<{
    usedPorts: number[];
    availablePortRanges: {
      RPC: { used: number; available: number; range: string };
      WS: { used: number; available: number; range: string };
      P2P: { used: number; available: number; range: string };
    };
    usedSubnets: string[];
    availableSubnets: number;
    totalContainers: number;
    besuContainers: number;
    totalNetworks: number;
    besuNetworks: number;
  }> {
    const usedPorts = await this.getUsedPorts();
    const containers = await this.dockerManager.docker.listContainers({ all: true });
    const networks = await this.dockerManager.docker.listNetworks();
    
    const besuContainers = containers.filter(c => 
      c.Image.includes('besu') || c.Names?.some(name => name.includes('besu'))
    );

    const besuNetworks = networks.filter(n => 
      n.Labels?.['created-by'] === 'besu-manager' || 
      n.Name.includes('besu')
    );

    const usedSubnets = networks
      .map(net => net.IPAM?.Config?.[0]?.Subnet)
      .filter(Boolean);

    const getPortStats = (type: 'RPC' | 'WS' | 'P2P') => {
      const range = this.PORT_RANGES[type];
      const usedInRange = usedPorts.filter(p => p >= range.start && p <= range.end).length;
      const totalInRange = range.end - range.start + 1;
      
      return {
        used: usedInRange,
        available: totalInRange - usedInRange,
        range: `${range.start}-${range.end}`
      };
    };

    const totalSubnetsAvailable = this.SUBNET_RANGES.end - this.SUBNET_RANGES.start + 1;
    const usedSubnetsInRange = usedSubnets.filter(subnet => {
      const match = subnet.match(/^172\.(\d+)\.0\.0\/16$/);
      if (match) {
        const second = parseInt(match[1]);
        return second >= this.SUBNET_RANGES.start && second <= this.SUBNET_RANGES.end;
      }
      return false;
    }).length;

    return {
      usedPorts,
      availablePortRanges: {
        RPC: getPortStats('RPC'),
        WS: getPortStats('WS'),
        P2P: getPortStats('P2P')
      },
      usedSubnets,
      availableSubnets: totalSubnetsAvailable - usedSubnetsInRange,
      totalContainers: containers.length,
      besuContainers: besuContainers.length,
      totalNetworks: networks.length,
      besuNetworks: besuNetworks.length
    };
  }

  /**
   * Limpia recursos huérfanos (contenedores parados de Besu)
   */
  async cleanupOrphanedResources(): Promise<{
    removedContainers: string[];
    freedPorts: number[];
  }> {
    const containers = await this.dockerManager.docker.listContainers({ 
      all: true,
      filters: { status: ['exited', 'dead'] }
    });

    const besuContainers = containers.filter(c => 
      c.Image.includes('besu') || c.Names?.some(name => name.includes('besu'))
    );

    const removedContainers: string[] = [];
    const freedPorts: number[] = [];

    for (const container of besuContainers) {
      try {
        // Recoger puertos antes de eliminar
        container.Ports?.forEach(port => {
          if (port.PublicPort) freedPorts.push(port.PublicPort);
        });

        await this.dockerManager.removeContainer(container.Id, true);
        removedContainers.push(container.Names?.[0] || container.Id);
      } catch (error) {
        console.warn(`Error eliminando contenedor ${container.Id}:`, error);
      }
    }

    return {
      removedContainers,
      freedPorts: [...new Set(freedPorts)]
    };
  }
}