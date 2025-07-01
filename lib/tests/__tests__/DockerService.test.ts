import { DockerService } from '../../src/services/DockerService';
import { Logger } from '../../src/utils/Logger';

describe('DockerService', () => {
  let logger: Logger;
  beforeEach(() => {
    logger = { info: jest.fn(), error: jest.fn() } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
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

  it('should call getContainerInfo and return info if found', async () => {
    const docker = new DockerService({}, logger);
    const mockInspect = jest.fn().mockResolvedValue({
      Id: 'cid123',
      Name: '/test',
      State: { Running: true, Status: 'running' },
      NetworkSettings: { Networks: { net: { IPAddress: '1.2.3.4' } }, Ports: { '80/tcp': [{ HostPort: '8080' }] } }
    });
    docker["docker"] = {
      listContainers: jest.fn().mockResolvedValue([{ Id: 'cid123' }]),
      getContainer: jest.fn().mockReturnValue({ inspect: mockInspect })
    } as any;
    const info = await docker.getContainerInfo('test');
    expect(info).toMatchObject({ id: 'cid123', name: 'test', state: 'running', ipAddress: '1.2.3.4', ports: { '80/tcp': '8080' } });
  });

  it('should call execCommand and resolve output', async () => {
    const docker = new DockerService({}, logger);
    const on = jest.fn((event, cb) => { if (event === 'data') cb(Buffer.from('ok')); if (event === 'end') cb(); });
    const mockStream = { on };
    const mockExec = { start: jest.fn().mockResolvedValue(mockStream) };
    const mockContainer = { exec: jest.fn().mockResolvedValue(mockExec) };
    docker["docker"] = { getContainer: jest.fn().mockReturnValue(mockContainer) } as any;
    const result = await docker.execCommand('cid123', ['ls']);
    expect(result.stdout).toContain('ok');
  });

  it('should handle error in execCommand', async () => {
    const docker = new DockerService({}, logger);
    docker["docker"] = { getContainer: jest.fn(() => { throw new Error('fail'); }) } as any;
    await expect(docker.execCommand('cid123', ['ls'])).rejects.toThrow('fail');
  });

  it('should call imageExists and return true', async () => {
    const docker = new DockerService({}, logger);
    docker["docker"] = { listImages: jest.fn().mockResolvedValue([{}]) } as any;
    const exists = await docker.imageExists('img');
    expect(exists).toBe(true);
  });

  it('should call imageExists and return false', async () => {
    const docker = new DockerService({}, logger);
    docker["docker"] = { listImages: jest.fn().mockResolvedValue([]) } as any;
    const exists = await docker.imageExists('img');
    expect(exists).toBe(false);
  });

  it('should handle error in imageExists', async () => {
    const docker = new DockerService({}, logger);
    docker["docker"] = { listImages: jest.fn().mockRejectedValue(new Error('fail')) } as any;
    const exists = await docker.imageExists('img');
    expect(exists).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error al comprobar si la imagen'), expect.any(Error));
  });

  it('should call pullImage and resolve if image exists', async () => {
    const docker = new DockerService({}, logger);
    docker.imageExists = jest.fn().mockResolvedValue(true);
    docker["docker"] = {} as any;
    await docker.pullImage('img');
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('ya existe localmente'));
  });

  it('should call pullImage and resolve if image is pulled', async () => {
    const docker = new DockerService({}, logger);
    docker.imageExists = jest.fn().mockResolvedValue(false);
    const followProgress = jest.fn((stream, cb) => cb(null, []));
    docker["docker"] = {
      pull: jest.fn((img, opts, cb) => cb(null, {})),
      modem: { followProgress }
    } as any;
    await docker.pullImage('img');
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('descargada correctamente'));
  });

  it('should handle error in pullImage', async () => {
    const docker = new DockerService({}, logger);
    docker.imageExists = jest.fn().mockResolvedValue(false);
    docker["docker"] = {
      pull: jest.fn((img, opts, cb) => cb(new Error('fail')))
    } as any;
    await expect(docker.pullImage('img')).rejects.toThrow('fail');
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





  it('should call getContainerInfo and return info', async () => {
    const docker = new DockerService({}, logger);
    const mockInspect = jest.fn().mockResolvedValue({
      Id: "cid123",
      Name: "/test",
      State: { Running: true, Status: "running" },
      NetworkSettings: {
        Networks: { bridge: { IPAddress: "172.17.0.2" } },
        Ports: { "80/tcp": [{ HostPort: "8080" }] }
      }
    });
    docker["docker"] = {
      listContainers: jest.fn().mockResolvedValue([{ Id: "cid123" }]),
      getContainer: jest.fn().mockReturnValue({ inspect: mockInspect })
    } as any;
    const info = await docker.getContainerInfo("test");
    expect(info).toBeDefined();
    expect(info).toEqual({
      id: "cid123",
      name: "test",
      state: "running",
      ipAddress: "172.17.0.2",
      ports: { "80/tcp": "8080" }
    });
    expect(mockInspect).toHaveBeenCalled();
  });

  it('should return null in getContainerInfo if not found', async () => {
    const docker = new DockerService({}, logger);
    docker["docker"] = {
      listContainers: jest.fn().mockResolvedValue([])
    } as any;
    const info = await docker.getContainerInfo("test");
    expect(info).toBeNull();
  });

  it('should handle error in removeNetwork', async () => {
    const docker = new DockerService({}, logger);
    docker["docker"] = {
      listNetworks: jest.fn().mockRejectedValue(new Error('fail'))
    } as any;
    await expect(docker.removeNetwork('testnet')).rejects.toThrow('fail');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error al eliminar la red Docker'), expect.any(Error));
  });

  it('should handle error in runContainer', async () => {
    const docker = new DockerService({}, logger);
    docker["docker"] = {
      listContainers: jest.fn().mockRejectedValue(new Error('fail'))
    } as any;
    await expect(docker.runContainer({ name: 'test', image: 'img', network: 'net', volumes: [], ports: {}, command: [] })).rejects.toThrow('fail');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error al ejecutar el contenedor'), expect.any(Error));
  });
});