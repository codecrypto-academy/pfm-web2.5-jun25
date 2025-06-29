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

      // Crear la red
      const network = await this.docker.createNetwork({
        Name: name,
        Driver: "bridge",
        CheckDuplicate: true,
      });

      this.logger.info(`Red Docker creada: ${name}`);
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
        return;
      }

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

      // Eliminar el contenedor
      await container.remove();

      this.logger.info(`Contenedor detenido y eliminado: ${name}`);
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
}
