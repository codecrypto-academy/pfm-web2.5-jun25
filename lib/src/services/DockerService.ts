import Docker from "dockerode";
import { Logger } from "../utils/Logger";

/**
 * Opciones para ejecutar un contenedor
 */
interface ContainerOptions {
  name: string;
  image: string;
  network: string;
  volumes: string[];
  ports: Record<string, string>;
  command: string[];
  environment?: Record<string, string>;
  staticIp?: string;
}

/**
 * Información de un contenedor
 */
interface ContainerInfo {
  id: string;
  name: string;
  state: "running" | "stopped" | "exited" | "unknown";
  ipAddress?: string;
  ports?: Record<string, string>;
}

/**
 * Servicio para interactuar con Docker
 */
export class DockerService {
  private docker: Docker;
  private logger: Logger;

  /**
   * Constructor
   * @param options Opciones de configuración
   * @param logger Servicio de logging
   */
  constructor(
    options: { socketPath?: string; host?: string; port?: number } = {},
    logger: Logger
  ) {
    this.docker = new Docker(options);
    this.logger = logger;
  }

  /**
   * Genera una subred única basada en el nombre de la red
   * @param networkName Nombre de la red
   */
  private generateUniqueSubnet(networkName: string): { subnet: string; gateway: string } {
    // Crear un hash simple del nombre de la red
    let hash = 0;
    for (let i = 0; i < networkName.length; i++) {
      const char = networkName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32bit integer
    }
    
    // Usar el hash para generar un rango único en 10.x.0.0/16
    // Usar el rango 10.100-199.0.0/16 para evitar conflictos con rangos comunes
    // Este rango está reservado para uso privado y es menos probable que entre en conflicto
    const secondOctet = 100 + (Math.abs(hash) % 100);
    const subnet = `10.${secondOctet}.0.0/16`;
    const gateway = `10.${secondOctet}.0.1`;
    
    return { subnet, gateway };
  }

  /**
   * Crea una red Docker
   * @param name Nombre de la red
   */
  public async createNetwork(name: string): Promise<string> {
    try {
      // Comprobar si la red ya existe
      const networks = await this.docker.listNetworks({
        filters: { name: [name] },
      });
      if (networks.length > 0) {
        this.logger.info(`La red ${name} ya existe, se utilizará la existente`);
        return networks[0].Id;
      }

      // Generar subred única para esta red
      const { subnet, gateway } = this.generateUniqueSubnet(name);

      // Crear la red con configuración IPAM para soportar IPs estáticas
      const network = await this.docker.createNetwork({
        Name: name,
        Driver: "bridge",
        CheckDuplicate: true,
        IPAM: {
          Driver: "default",
          Config: [
            {
              Subnet: subnet,
              Gateway: gateway
            }
          ]
        }
      });

      this.logger.info(`Red Docker creada con IPAM: ${name} (${subnet})`);
      return network.id;
    } catch (error) {
      this.logger.error(`Error al crear la red Docker ${name}:`, error);
      throw error;
    }
  }

  /**
   * Elimina una red Docker
   * @param name Nombre de la red
   */
  public async removeNetwork(name: string): Promise<void> {
    try {
      const networks = await this.docker.listNetworks({
        filters: { name: [name] },
      });
      if (networks.length === 0) {
        this.logger.info(
          `La red ${name} no existe, no es necesario eliminarla`
        );
        return;
      }

      const network = this.docker.getNetwork(networks[0].Id);
      const netDetails = await network.inspect();
      const containers = netDetails.Containers || {};

      const containerIds = Object.keys(containers);
      if (containerIds.length === 0) {
        console.log(`✅ No hay contenedores en la red "${name}".`);
      } else {
        for (const id of containerIds) {
        const container = this.docker.getContainer(id);

        try {
          const info = await container.inspect();

          if (info.State.Running) {
            console.log(`🛑 Deteniendo contenedor: ${info.Name}`);
            await container.stop();
          }

          console.log(`🗑️  Eliminando contenedor: ${info.Name}`);
          await container.remove({ force: true });
        } catch (err: any) {
          console.error(
            `⚠️  Error al manejar el contenedor ${id}:`,
            err.message
          );
        }
      }

      console.log(
        `✅ Todos los contenedores en la red "${name}" han sido eliminados.`
      );
      }
      
      await network.remove();
      this.logger.info(`Red Docker eliminada: ${name}`);

    } catch (error) {
      this.logger.error(`Error al eliminar la red Docker ${name}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene el ID de una red Docker
   * @param name Nombre de la red
   */
  /**
   * Lista todas las redes Docker
   */
  public async listNetworks(): Promise<any> {
    // @ts-ignore
    try {
      return await this.docker.listNetworks();
    } catch (error) {
      this.logger.error('Error al listar las redes Docker:', error);
      throw error;
    }
  }

  /**
   * Obtiene informacion de todos los contenedores de una red
   * @param option ContainerListOptions
   */
  public async listContainers(options: Docker.ContainerListOptions): Promise<Docker.ContainerInfo[]> {
    try {
      return this.docker.listContainers(options);
    } catch (error) {
      this.logger.error('Error al listar los contenedores Docker:', error);
      throw error;
    }
  }

  public async getNetworkId(name: string): Promise<string | null> {
    try {
      const networks = await this.docker.listNetworks({
        filters: { name: [name] },
      });
      if (networks.length === 0) {
        return null;
      }

      return networks[0].Id;
    } catch (error) {
      this.logger.error(
        `Error al obtener el ID de la red Docker ${name}:`,
        error
      );
      return null;
    }
  }

  /**
   * Inspecciona una red Docker para obtener información detallada
   * @param networkId ID de la red
   */
  public async inspectNetwork(networkId: string): Promise<any> {
    try {
      const network = this.docker.getNetwork(networkId);
      return await network.inspect();
    } catch (error) {
      this.logger.error(
        `Error al inspeccionar la red Docker ${networkId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Ejecuta un contenedor Docker
   * @param options Opciones del contenedor
   */
  public async runContainer(options: ContainerOptions): Promise<string> {
    try {
      // Comprobar si el contenedor ya existe
      const containers = await this.docker.listContainers({
        all: true,
        filters: { name: [options.name] },
      });
      if (containers.length > 0) {
        // Si el contenedor existe pero no está en ejecución, iniciarlo
        if (containers[0].State !== "running") {
          const container = this.docker.getContainer(containers[0].Id);
          await container.start();
          this.logger.info(`Contenedor existente iniciado: ${options.name}`);
          return containers[0].Id;
        }

        this.logger.info(`El contenedor ${options.name} ya está en ejecución`);
        return containers[0].Id;
      }

      // Preparar las opciones de creación del contenedor
      const portBindings: Record<string, Array<{ HostPort: string }>> = {};
      const exposedPorts: Record<string, {}> = {};

      // Configurar los puertos
      for (const [hostPort, containerPort] of Object.entries(options.ports)) {
        const containerPortWithProto = containerPort.includes("/")
          ? containerPort
          : `${containerPort}/tcp`;
        portBindings[containerPortWithProto] = [{ HostPort: hostPort }];
        exposedPorts[containerPortWithProto] = {};
      }

      // Configurar los volúmenes
      const volumes: Record<string, {}> = {};
      const binds: string[] = [];

      for (const volume of options.volumes) {
        const [hostPath, containerPath] = volume.split(":");
        volumes[containerPath] = {};
        binds.push(volume);
      }

      // Construir y loguear el comando Docker equivalente
      let dockerCommand = `docker run --name ${options.name}`;
      
      // Agregar puertos
      for (const [hostPort, containerPort] of Object.entries(options.ports)) {
        const cleanContainerPort = containerPort.replace('/tcp', '');
        dockerCommand += ` -p ${hostPort}:${cleanContainerPort}`;
      }
      
      // Agregar volúmenes
      for (const volume of options.volumes) {
        dockerCommand += ` -v ${volume}`;
      }
      
      // Agregar red
      if (options.network) {
        dockerCommand += ` --network ${options.network}`;
      }
      
      // Agregar variables de entorno
      if (options.environment) {
        for (const [key, value] of Object.entries(options.environment)) {
          dockerCommand += ` -e ${key}=${value}`;
        }
      }
      
      // Agregar imagen y comando
      dockerCommand += ` ${options.image}`;
      if (options.command && options.command.length > 0) {
        dockerCommand += ` ${options.command.join(' ')}`;
      }
      
      this.logger.info(`Ejecutando comando Docker: ${dockerCommand}`);

      // Preparar configuración de red
      const networkingConfig: any = {};
      if (options.staticIp) {
        networkingConfig[options.network] = {
          IPAMConfig: {
            IPv4Address: options.staticIp
          }
        };
      }

      // Crear el contenedor
      const container = await this.docker.createContainer({
        name: options.name,
        Image: options.image,
        Cmd: options.command,
        ExposedPorts: exposedPorts,
        HostConfig: {
          PortBindings: portBindings,
          Binds: binds,
          NetworkMode: options.network,
        },
        NetworkingConfig: {
          EndpointsConfig: networkingConfig
        },
        Env: options.environment
          ? Object.entries(options.environment).map(
              ([key, value]) => `${key}=${value}`
            )
          : undefined,
      });

      // Iniciar el contenedor
      await container.start();

      this.logger.info(`Contenedor iniciado: ${options.name}`);
      return container.id;
    } catch (error) {
      this.logger.error(
        `Error al ejecutar el contenedor ${options.name}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Detiene un contenedor Docker
   * @param name Nombre del contenedor
   */
  public async stopContainer(name: string): Promise<void> {
    try {
      const containers = await this.docker.listContainers({
        all: true,
        filters: { name: [name] },
      });
      if (containers.length === 0) {
        this.logger.info(
          `El contenedor ${name} no existe, no es necesario detenerlo`
        );
        return;
      }

      const container = this.docker.getContainer(containers[0].Id);

      // Comprobar si el contenedor está en ejecución
      const info = await container.inspect();
      if (!info.State.Running) {
        this.logger.info(`El contenedor ${name} ya está detenido`);
        return;
      }

      // Detener el contenedor
      await container.stop({ t: 10 });

      this.logger.info(`Contenedor detenido: ${name}`);
    } catch (error) {
      this.logger.error(`Error al detener el contenedor ${name}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene información de un contenedor
   * @param name Nombre del contenedor
   */
  public async getContainerInfo(name: string): Promise<ContainerInfo | null> {
    try {
      const containers = await this.docker.listContainers({
        all: true,
        filters: { name: [name] },
      });
      if (containers.length === 0) {
        return null;
      }

      const container = this.docker.getContainer(containers[0].Id);
      const info = await container.inspect();

      // Obtener la dirección IP del contenedor
      let ipAddress: string | undefined;
      if (info.NetworkSettings && info.NetworkSettings.Networks) {
        const networkNames = Object.keys(info.NetworkSettings.Networks);
        if (networkNames.length > 0) {
          ipAddress = info.NetworkSettings.Networks[networkNames[0]].IPAddress;
        }
      }

      // Obtener los puertos mapeados
      const ports: Record<string, string> = {};
      if (info.NetworkSettings && info.NetworkSettings.Ports) {
        for (const [containerPort, hostPorts] of Object.entries(
          info.NetworkSettings.Ports
        )) {
          if (hostPorts && hostPorts.length > 0) {
            ports[containerPort] = hostPorts[0].HostPort;
          }
        }
      }

      return {
        id: info.Id,
        name: info.Name.replace(/^\//, ""), // Eliminar la barra inicial
        state: info.State.Running ? "running" : (info.State.Status as any),
        ipAddress,
        ports,
      };
    } catch (error) {
      this.logger.error(
        `Error al obtener información del contenedor ${name}:`,
        error
      );
      return null;
    }
  }

  /**
   * Ejecuta un comando en un contenedor
   * @param containerId ID del contenedor
   * @param command Comando a ejecutar
   */
  public async execCommand(
    containerId: string,
    command: string[]
  ): Promise<{ stdout: string; stderr: string }> {
    try {
      const container = this.docker.getContainer(containerId);
      const exec = await container.exec({
        Cmd: command,
        AttachStdout: true,
        AttachStderr: true,
      });

      const stream = await exec.start({ Detach: false });
      let stdout = "";
      let stderr = "";

      return new Promise((resolve, reject) => {
        stream.on("data", (chunk: Buffer) => {
          stdout += chunk.toString();
        });

        stream.on("error", (err: Error) => {
          stderr += err.message;
        });

        stream.on("end", () => {
          resolve({ stdout, stderr });
        });
      });
    } catch (error) {
      this.logger.error(
        `Error al ejecutar el comando en el contenedor ${containerId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Comprueba si una imagen Docker existe localmente
   * @param imageName Nombre de la imagen
   */
  public async imageExists(imageName: string): Promise<boolean> {
    try {
      const images = await this.docker.listImages({
        filters: { reference: [imageName] },
      });
      return images.length > 0;
    } catch (error) {
      this.logger.error(
        `Error al comprobar si la imagen ${imageName} existe:`,
        error
      );
      return false;
    }
  }

  /**
   * Descarga una imagen Docker
   * @param imageName Nombre de la imagen
   */
  public async pullImage(imageName: string): Promise<void> {
    try {
      // Comprobar si la imagen ya existe
      if (await this.imageExists(imageName)) {
        this.logger.info(`La imagen ${imageName} ya existe localmente`);
        return;
      }

      this.logger.info(`Descargando imagen ${imageName}...`);

      return new Promise((resolve, reject) => {
        const self = this;
        this.docker.pull(imageName, {}, function (err, stream) {
          if (err) {
            self.logger.error(
              `Error al descargar la imagen ${imageName}:`,
              err
            );
            return reject(err);
          }

          if (!stream) {
            self.logger.error(
              `No se pudo obtener el stream para la imagen ${imageName}`
            );
            return reject(
              new Error(
                `No se pudo obtener el stream para la imagen ${imageName}`
              )
            );
          }

          self.docker.modem.followProgress(
            stream,
            (err: Error | null, output: any[]) => {
              if (err) {
                self.logger.error(
                  `Error al descargar la imagen ${imageName}:`,
                  err
                );
                return reject(err);
              }

              self.logger.info(`Imagen ${imageName} descargada correctamente`);
              resolve();
            }
          );
        });
      });
    } catch (error) {
      this.logger.error(`Error al descargar la imagen ${imageName}:`, error);
      throw error;
    }
  }

  /**
   * Inspecciona un contenedor por ID
   * @param containerId ID del contenedor
   */
  public async inspectContainer(containerId: string): Promise<any> {
    try {
      const container = this.docker.getContainer(containerId);
      return await container.inspect();
    } catch (error) {
      this.logger.error(
        `Error al inspeccionar el contenedor ${containerId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Elimina un contenedor Docker
   * @param containerId ID del contenedor
   * @param force Forzar eliminación
   */
  public async removeContainer(containerId: string, force: boolean = false): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.remove({ force });
      this.logger.info(`Contenedor eliminado: ${containerId}`);
    } catch (error) {
      this.logger.error(
        `Error al eliminar el contenedor ${containerId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Inicia un contenedor Docker existente
   * @param containerId ID del contenedor
   */
  public async startContainer(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.start();
      this.logger.info(`Contenedor iniciado: ${containerId}`);
    } catch (error) {
      this.logger.error(
        `Error al iniciar el contenedor ${containerId}:`,
        error
      );
      throw error;
    }
  }
}
