import * as path from 'path';
import { FileSystem } from '../utils/FileSystem';
import { Logger } from '../utils/Logger';
import { DockerService } from './DockerService';

/**
 * Información de IP asignada a un nodo
 */
interface NodeIpInfo {
  nodeName: string;
  networkName: string;
  ipAddress: string;
  assignedAt: string;
}

/**
 * Servicio para gestionar IPs estáticas de nodos
 */
export class IpManager {
  private fs: FileSystem;
  private logger: Logger;
  private docker: DockerService;
  private dataDir: string;
  private ipMappingsFile: string;

  constructor(fs: FileSystem, logger: Logger, docker: DockerService, dataDir: string) {
    this.fs = fs;
    this.logger = logger;
    this.docker = docker;
    this.dataDir = dataDir;
    this.ipMappingsFile = path.join(dataDir, 'ip-mappings.json');
  }

  /**
   * Obtiene o asigna una IP estática para un nodo
   * @param nodeName Nombre del nodo
   * @param networkName Nombre de la red
   * @returns IP asignada al nodo
   */
  public async getOrAssignStaticIp(nodeName: string, networkName: string): Promise<string> {
    // Verificar si el nodo ya tiene una IP asignada
    const existingIp = await this.getExistingIp(nodeName, networkName);
    if (existingIp) {
      this.logger.info(`Node ${nodeName} already has IP: ${existingIp}`);
      return existingIp;
    }

    // Asignar nueva IP
    const newIp = await this.assignNewIp(nodeName, networkName);
    this.logger.info(`Assigned new IP ${newIp} to node ${nodeName} in network ${networkName}`);
    return newIp;
  }

  /**
   * Obtiene la IP existente de un nodo si ya tiene una asignada
   */
  private async getExistingIp(nodeName: string, networkName: string): Promise<string | null> {
    try {
      if (!await this.fs.exists(this.ipMappingsFile)) {
        return null;
      }

      const content = await this.fs.readFile(this.ipMappingsFile, 'utf-8');
      const mappings: NodeIpInfo[] = JSON.parse(content);
      
      const nodeMapping = mappings.find(m => m.nodeName === nodeName && m.networkName === networkName);
      return nodeMapping ? nodeMapping.ipAddress : null;
    } catch (error) {
      this.logger.error(`Error reading IP mappings: ${error}`);
      return null;
    }
  }

  /**
   * Obtiene la información de subred de una red Docker
   */
  private async getNetworkSubnetInfo(networkName: string): Promise<{ baseIp: string; secondOctet: number } | null> {
    try {
      const networkId = await this.docker.getNetworkId(networkName);
      if (!networkId) {
        return null;
      }

      const networkDetails = await this.docker.inspectNetwork(networkId);
      if (networkDetails && networkDetails.IPAM && networkDetails.IPAM.Config && networkDetails.IPAM.Config.length > 0) {
        const subnet = networkDetails.IPAM.Config[0].Subnet;
        // Extraer el segundo octeto de la subred (ej: 10.120.0.0/16 -> 120)
        const match = subnet.match(/^10\.(\d+)\.0\.0\/16$/);
        if (match) {
          const secondOctet = parseInt(match[1]);
          return {
            baseIp: `10.${secondOctet}.0.`,
            secondOctet
          };
        }
      }
      return null;
    } catch (error) {
      this.logger.error(`Error getting network subnet info: ${error}`);
      return null;
    }
  }

  /**
   * Asigna una nueva IP al nodo
   */
  private async assignNewIp(nodeName: string, networkName: string): Promise<string> {
    const usedIps = await this.getUsedIps(networkName);
    const newIp = await this.generateAvailableIp(usedIps, networkName);
    
    await this.saveIpMapping({
      nodeName,
      networkName,
      ipAddress: newIp,
      assignedAt: new Date().toISOString()
    });

    return newIp;
  }

  /**
   * Obtiene todas las IPs ya utilizadas en una red
   */
  private async getUsedIps(networkName: string): Promise<string[]> {
    const usedIps = new Set<string>();

    try {
      // Obtener IPs de los mapeos guardados
      if (await this.fs.exists(this.ipMappingsFile)) {
        const content = await this.fs.readFile(this.ipMappingsFile, 'utf-8');
        const mappings: NodeIpInfo[] = JSON.parse(content);
        
        mappings
          .filter(m => m.networkName === networkName)
          .forEach(m => usedIps.add(m.ipAddress));
      }

      // Obtener IPs realmente en uso en Docker
      try {
        const networkId = await this.docker.getNetworkId(networkName);
        if (networkId) {
          const networkDetails = await this.docker.inspectNetwork(networkId);
          if (networkDetails && networkDetails.Containers) {
            Object.values(networkDetails.Containers).forEach((container: any) => {
              if (container.IPv4Address) {
                // Extraer solo la IP sin la máscara de subred
                const ip = container.IPv4Address.split('/')[0];
                usedIps.add(ip);
              }
            });
          }
        }
      } catch (dockerError) {
        this.logger.warn(`Could not inspect Docker network ${networkName}: ${dockerError}`);
      }

      return Array.from(usedIps);
    } catch (error) {
      this.logger.error(`Error reading used IPs: ${error}`);
      return [];
    }
  }

  /**
   * Genera una IP disponible en el rango de la red específica
   */
  private async generateAvailableIp(usedIps: string[], networkName: string): Promise<string> {
    // Obtener información de la subred de la red
    const subnetInfo = await this.getNetworkSubnetInfo(networkName);
    
    if (!subnetInfo) {
      // Fallback al rango por defecto si no se puede obtener la información
      this.logger.warn(`Could not get subnet info for network ${networkName}, using default range`);
      const baseIp = '10.120.0.';
      
      for (let i = 10; i <= 254; i++) {
        const candidateIp = `${baseIp}${i}`;
        if (!usedIps.includes(candidateIp)) {
          return candidateIp;
        }
      }
      throw new Error('No available IP addresses in the default range');
    }

    // Usar el rango específico de la red
    const { baseIp, secondOctet } = subnetInfo;
    
    // Empezar desde .10 para dejar espacio para servicios del sistema (gateway está en .1)
    for (let i = 10; i <= 254; i++) {
      const candidateIp = `${baseIp}${i}`;
      if (!usedIps.includes(candidateIp)) {
        return candidateIp;
      }
    }

    // Si se agota el rango .0, usar .1
    const baseIp1 = `10.${secondOctet}.1.`;
    for (let i = 1; i <= 254; i++) {
      const candidateIp = `${baseIp1}${i}`;
      if (!usedIps.includes(candidateIp)) {
        return candidateIp;
      }
    }

    throw new Error(`No available IP addresses in the range for network ${networkName}`);
  }

  /**
   * Guarda el mapeo de IP en el archivo
   */
  private async saveIpMapping(nodeIpInfo: NodeIpInfo): Promise<void> {
    try {
      let mappings: NodeIpInfo[] = [];
      
      if (await this.fs.exists(this.ipMappingsFile)) {
        const content = await this.fs.readFile(this.ipMappingsFile, 'utf-8');
        mappings = JSON.parse(content);
      }

      // Eliminar mapeo existente si existe
      mappings = mappings.filter(m => 
        !(m.nodeName === nodeIpInfo.nodeName && m.networkName === nodeIpInfo.networkName)
      );

      // Agregar nuevo mapeo
      mappings.push(nodeIpInfo);

      // Guardar archivo
      await this.fs.writeFile(this.ipMappingsFile, JSON.stringify(mappings, null, 2));
    } catch (error) {
      this.logger.error(`Error saving IP mapping: ${error}`);
      throw error;
    }
  }

  /**
   * Elimina el mapeo de IP de un nodo
   */
  public async removeIpMapping(nodeName: string, networkName: string): Promise<void> {
    try {
      if (!await this.fs.exists(this.ipMappingsFile)) {
        return;
      }

      const content = await this.fs.readFile(this.ipMappingsFile, 'utf-8');
      let mappings: NodeIpInfo[] = JSON.parse(content);
      
      mappings = mappings.filter(m => 
        !(m.nodeName === nodeName && m.networkName === networkName)
      );

      await this.fs.writeFile(this.ipMappingsFile, JSON.stringify(mappings, null, 2));
      this.logger.info(`Removed IP mapping for node ${nodeName} in network ${networkName}`);
    } catch (error) {
      this.logger.error(`Error removing IP mapping: ${error}`);
      throw error;
    }
  }

  /**
   * Obtiene todos los mapeos de IP para una red
   */
  public async getNetworkIpMappings(networkName: string): Promise<NodeIpInfo[]> {
    try {
      if (!await this.fs.exists(this.ipMappingsFile)) {
        return [];
      }

      const content = await this.fs.readFile(this.ipMappingsFile, 'utf-8');
      const mappings: NodeIpInfo[] = JSON.parse(content);
      
      return mappings.filter(m => m.networkName === networkName);
    } catch (error) {
      this.logger.error(`Error getting network IP mappings: ${error}`);
      return [];
    }
  }
}