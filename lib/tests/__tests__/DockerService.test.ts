import { DockerService } from '../../src/services/DockerService';
import { Logger } from '../../src/utils/Logger';

describe('DockerService', () => {
  let logger: Logger;
  beforeEach(() => {
    logger = { info: jest.fn(), error: jest.fn() } as any;
  });

  it('should construct DockerService', () => {
    const docker = new DockerService({}, logger);
    expect(docker).toBeDefined();
  });

  it('should call createNetwork and return id', async () => {
    const docker = new DockerService({}, logger);
    docker["docker"] = {
      listNetworks: jest.fn().mockResolvedValue([]),
      createNetwork: jest.fn().mockResolvedValue({ id: "net123" })
    } as any;
    const id = await docker.createNetwork("testnet");
    expect(id).toBe("net123");
  });

  it('should call removeNetwork and handle non-existing network', async () => {
    const docker = new DockerService({}, logger);
    docker["docker"] = {
      listNetworks: jest.fn().mockResolvedValue([])
    } as any;
    await docker.removeNetwork("testnet");
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("no existe"));
  });

  it('should return null if network not found in getNetworkId', async () => {
    const docker = new DockerService({}, logger);
    docker["docker"] = {
      listNetworks: jest.fn().mockResolvedValue([])
    } as any;
    const id = await docker.getNetworkId("testnet");
    expect(id).toBeNull();
  });

  it('should handle error in getNetworkId', async () => {
    const docker = new DockerService({}, logger);
    docker["docker"] = {
      listNetworks: jest.fn().mockRejectedValue(new Error("fail"))
    } as any;
    const id = await docker.getNetworkId("testnet");
    expect(id).toBeNull();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("Error al obtener el ID de la red Docker"), expect.any(Error));
  });

  it('should start existing container in runContainer', async () => {
    const docker = new DockerService({}, logger);
    const mockStart = jest.fn();
    docker["docker"] = {
      listContainers: jest.fn().mockResolvedValue([{ Id: "cid123", State: "exited" }]),
      getContainer: jest.fn().mockReturnValue({ start: mockStart })
    } as any;
    const id = await docker.runContainer({ name: "test", image: "img", network: "net", volumes: [], ports: {}, command: [] });
    expect(mockStart).toHaveBeenCalled();
    expect(id).toBe("cid123");
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("iniciado"));
  });

  it('should create and start new container in runContainer', async () => {
    const docker = new DockerService({}, logger);
    const mockStart = jest.fn();
    const mockContainer = { start: mockStart, id: "newid123" };
    docker["docker"] = {
      listContainers: jest.fn().mockResolvedValue([]),
      createContainer: jest.fn().mockResolvedValue(mockContainer)
    } as any;
    const id = await docker.runContainer({ name: "test", image: "img", network: "net", volumes: [], ports: {}, command: [] });
    expect(docker["docker"].createContainer).toHaveBeenCalled();
    expect(mockStart).toHaveBeenCalled();
    expect(id).toBe("newid123");
  });

  it('should call stopContainer and handle non-existing container', async () => {
    const docker = new DockerService({}, logger);
    docker["docker"] = {
      listContainers: jest.fn().mockResolvedValue([])
    } as any;
    await docker.stopContainer("test");
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("no existe"));
  });

  it('should call stopContainer and stop running container', async () => {
    const docker = new DockerService({}, logger);
    const mockStop = jest.fn();
    const mockRemove = jest.fn();
    const mockInspect = jest.fn().mockResolvedValue({ State: { Running: true }, Name: "test" });
    docker["docker"] = {
      listContainers: jest.fn().mockResolvedValue([{ Id: "cid123" }]),
      getContainer: jest.fn().mockReturnValue({ inspect: mockInspect, stop: mockStop, remove: mockRemove })
    } as any;
    await docker.stopContainer("test");
    expect(mockInspect).toHaveBeenCalled();
    expect(mockStop).toHaveBeenCalled();
    expect(mockRemove).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("detenido y eliminado"));
  });

  it('should call getContainerInfo and return null if not found', async () => {
    const docker = new DockerService({}, logger);
    docker["docker"] = {
      listContainers: jest.fn().mockResolvedValue([])
    } as any;
    const info = await docker.getContainerInfo("test");
    expect(info).toBeNull();
  });

  it('should call stopContainer and handle already stopped container', async () => {
    const docker = new DockerService({}, logger);
    const mockInspect = jest.fn().mockResolvedValue({ State: { Running: false }, Name: "test" });
    docker["docker"] = {
      listContainers: jest.fn().mockResolvedValue([{ Id: "cid123" }]),
      getContainer: jest.fn().mockReturnValue({ inspect: mockInspect })
    } as any;
    await docker.stopContainer("test");
    expect(mockInspect).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("ya está detenido"));
  });
});