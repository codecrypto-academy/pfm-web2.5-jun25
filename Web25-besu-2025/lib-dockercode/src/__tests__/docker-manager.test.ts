/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference types="jest" />
import { DockerManager } from '../docker-manager';
import Docker from 'dockerode';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock de dockerode
jest.mock('dockerode');

describe('DockerManager', () => {
  let dockerManager: DockerManager;
  let mockDocker: jest.Mocked<Docker>;
  
  beforeEach(() => {
    // Limpiar todos los mocks
    jest.clearAllMocks();
    
    // Configurar el mock de Docker
    mockDocker = new Docker() as jest.Mocked<Docker>;
    (Docker as jest.MockedClass<typeof Docker>).mockImplementation(() => mockDocker);
    // Utilisation de 'as any' pour bypasser les types stricts de Dockerode
    // @ts-ignore
    (mockDocker.createNetwork as any) = jest.fn();
    // @ts-ignore
    (mockDocker.createContainer as any) = jest.fn();
    // @ts-ignore
    (mockDocker.getNetwork as any) = jest.fn();
    // @ts-ignore
    (mockDocker.getContainer as any) = jest.fn();
    
    // Crear una instancia de DockerManager
    dockerManager = new DockerManager();
  });

  describe('createNetwork', () => {
    it('debe crear una red con los parámetros correctos', async () => {
      // Configurar el mock
      const mockNetwork = { id: 'network-123' };
      // @ts-ignore
      (mockDocker.createNetwork as any) = jest.fn().mockResolvedValue(mockNetwork);

      // Llamar al método
      const networkId = await dockerManager.createNetwork({
        name: 'test-network',
        subnet: '172.20.0.0/16',
        labels: { 'test-label': 'test-value' }
      });

      // Verificar que se llamó a createNetwork con los parámetros correctos
      expect(mockDocker.createNetwork).toHaveBeenCalledWith({
        Name: 'test-network',
        CheckDuplicate: true,
        Driver: 'bridge',
        IPAM: {
          Driver: 'default',
          Config: [
            {
              Subnet: '172.20.0.0/16'
            }
          ]
        },
        Labels: { 'test-label': 'test-value' }
      });

      // Verificar que se devolvió el ID correcto
      expect(networkId).toBe('network-123');
    });

    it('debe manejar errores al crear una red', async () => {
      // Configurar el mock para lanzar un error
      // @ts-ignore
      (mockDocker.createNetwork as any) = jest.fn().mockRejectedValue(new Error('Error de prueba'));

      // Verificar que se lanza un error
      await expect(dockerManager.createNetwork({
        name: 'test-network',
        subnet: '172.20.0.0/16'
      })).rejects.toThrow('Error al crear la red: Error de prueba');
    });
  });

  describe('createContainer', () => {
    it('debe crear un contenedor con los parámetros correctos', async () => {
      // Configurar los mocks
      const mockContainer = {
        id: 'container-123',
        // @ts-ignore
        start: jest.fn().mockResolvedValue(undefined) as any
      };
      // @ts-ignore
      (mockDocker.createContainer as any) = jest.fn().mockResolvedValue(mockContainer);

      // Llamar al método
      const containerId = await dockerManager.createContainer({
        name: 'test-container',
        Image: 'nginx:latest'
      });

      // Verificar que se llamó a createContainer con los parámetros correctos
      expect(mockDocker.createContainer).toHaveBeenCalledWith({
        name: 'test-container',
        Image: 'nginx:latest'
      });

      // Verificar que se inició el contenedor
      expect(mockContainer.start).toHaveBeenCalled();

      // Verificar que se devolvió el ID correcto
      expect(containerId).toBe('container-123');
    });

    it('debe conectar el contenedor a una red si se especifica', async () => {
      // Configurar los mocks
      const mockContainer = {
        id: 'container-123',
        // @ts-ignore
        start: jest.fn().mockResolvedValue(undefined) as any
      };
      const mockNetwork = {
        // @ts-ignore
        connect: jest.fn().mockResolvedValue(undefined) as any
      };
      // @ts-ignore
      (mockDocker.createContainer as any) = jest.fn().mockResolvedValue(mockContainer);
      // @ts-ignore
      (mockDocker.getNetwork as any) = jest.fn().mockReturnValue(mockNetwork);

      // Llamar al método
      await dockerManager.createContainer({
        name: 'test-container',
        Image: 'nginx:latest',
        networkName: 'test-network',
        ip: '172.20.0.2'
      });

      // Verificar que se obtuvo la red correcta
      expect(mockDocker.getNetwork).toHaveBeenCalledWith('test-network');

      // Verificar que se conectó el contenedor a la red con la IP especificada
      expect(mockNetwork.connect).toHaveBeenCalledWith({
        Container: 'container-123',
        EndpointConfig: {
          IPAddress: '172.20.0.2'
        }
      });
    });

    it('debe manejar errores al crear un contenedor', async () => {
      // Configurar el mock para lanzar un error
      // @ts-ignore
      (mockDocker.createContainer as any) = jest.fn().mockRejectedValue(new Error('Error de prueba'));

      // Verificar que se lanza un error
      await expect(dockerManager.createContainer({
        name: 'test-container',
        Image: 'nginx:latest'
      })).rejects.toThrow('Error al crear el contenedor: Error de prueba');
    });
  });

  describe('removeContainer', () => {
    it('debe eliminar un contenedor con los parámetros correctos', async () => {
      // Configurar los mocks
      const mockContainer = {
        // @ts-ignore
        remove: jest.fn().mockResolvedValue(undefined) as any
      };
      // @ts-ignore
      (mockDocker.getContainer as any) = jest.fn().mockReturnValue(mockContainer);

      // Llamar al método
      await dockerManager.removeContainer('test-container');

      // Verificar que se obtuvo el contenedor correcto
      expect(mockDocker.getContainer).toHaveBeenCalledWith('test-container');

      // Verificar que se eliminó el contenedor con force=true por defecto
      expect(mockContainer.remove).toHaveBeenCalledWith({ force: true });
    });

    it('debe respetar el parámetro force', async () => {
      // Configurar los mocks
      const mockContainer = {
        // @ts-ignore
        remove: jest.fn().mockResolvedValue(undefined) as any
      };
      // @ts-ignore
      (mockDocker.getContainer as any) = jest.fn().mockReturnValue(mockContainer);

      // Llamar al método con force=false
      await dockerManager.removeContainer('test-container', false);

      // Verificar que se eliminó el contenedor con force=false
      expect(mockContainer.remove).toHaveBeenCalledWith({ force: false });
    });

    it('debe manejar errores al eliminar un contenedor', async () => {
      // Configurar el mock para lanzar un error
      const mockContainer = {
        // @ts-ignore
        remove: jest.fn().mockRejectedValue(new Error('Error de prueba')) as any
      };
      // @ts-ignore
      (mockDocker.getContainer as any) = jest.fn().mockReturnValue(mockContainer);

      // Verificar que se lanza un error
      await expect(dockerManager.removeContainer('test-container')).rejects.toThrow(
        'Error al eliminar el contenedor: Error de prueba'
      );
    });
  });

  describe('removeContainersInNetwork', () => {
    it('debe eliminar todos los contenedores de una red', async () => {
      // Configurar los mocks
      const mockNetwork = {
        // @ts-ignore
        inspect: jest.fn().mockResolvedValue({
          Containers: {
            'container-1': {},
            'container-2': {}
          }
        }) as any
      };
      // @ts-ignore
      (mockDocker.getNetwork as any) = jest.fn().mockReturnValue(mockNetwork);
      
      // Mock para removeContainer
      const spyRemoveContainer = jest.spyOn(dockerManager, 'removeContainer').mockResolvedValue();

      // Llamar al método
      await dockerManager.removeContainersInNetwork('test-network');

      // Verificar que se obtuvo la red correcta
      expect(mockDocker.getNetwork).toHaveBeenCalledWith('test-network');

      // Verificar que se eliminaron los contenedores correctos
      expect(spyRemoveContainer).toHaveBeenCalledTimes(2);
      expect(spyRemoveContainer).toHaveBeenCalledWith('container-1');
      expect(spyRemoveContainer).toHaveBeenCalledWith('container-2');
    });

    it('debe manejar el caso de una red sin contenedores', async () => {
      // Configurar los mocks
      const mockNetwork = {
        // @ts-ignore
        inspect: jest.fn().mockResolvedValue({
          Containers: {}
        }) as any
      };
      // @ts-ignore
      (mockDocker.getNetwork as any) = jest.fn().mockReturnValue(mockNetwork);
      
      // Mock para removeContainer
      const spyRemoveContainer = jest.spyOn(dockerManager, 'removeContainer').mockResolvedValue();

      // Llamar al método
      await dockerManager.removeContainersInNetwork('test-network');

      // Verificar que no se eliminó ningún contenedor
      expect(spyRemoveContainer).not.toHaveBeenCalled();
    });

    it('debe manejar errores al eliminar contenedores de una red', async () => {
      // Configurar el mock para lanzar un error
      const mockNetwork = {
        // @ts-ignore
        inspect: jest.fn().mockRejectedValue(new Error('Error de prueba')) as any
      };
      // @ts-ignore
      (mockDocker.getNetwork as any) = jest.fn().mockReturnValue(mockNetwork);

      // Verificar que se lanza un error
      await expect(dockerManager.removeContainersInNetwork('test-network')).rejects.toThrow(
        'Error al eliminar los contenedores de la red: Error de prueba'
      );
    });
  });

  describe('removeNetwork', () => {
    it('debe eliminar una red y sus contenedores por defecto', async () => {
      // Configurar los mocks
      const mockNetwork = {
        // @ts-ignore
        remove: jest.fn().mockResolvedValue(undefined) as any
      };
      // @ts-ignore
      (mockDocker.getNetwork as any) = jest.fn().mockReturnValue(mockNetwork);
      
      // Mock para removeContainersInNetwork
      const spyRemoveContainers = jest.spyOn(dockerManager, 'removeContainersInNetwork').mockResolvedValue();

      // Llamar al método
      await dockerManager.removeNetwork('test-network');

      // Verificar que se eliminaron los contenedores primero
      expect(spyRemoveContainers).toHaveBeenCalledWith('test-network');

      // Verificar que se obtuvo la red correcta
      expect(mockDocker.getNetwork).toHaveBeenCalledWith('test-network');

      // Verificar que se eliminó la red
      expect(mockNetwork.remove).toHaveBeenCalled();
    });

    it('debe permitir eliminar una red sin eliminar sus contenedores', async () => {
      // Configurar los mocks
      const mockNetwork = {
        // @ts-ignore
        remove: jest.fn().mockResolvedValue(undefined) as any
      };
      // @ts-ignore
      (mockDocker.getNetwork as any) = jest.fn().mockReturnValue(mockNetwork);
      
      // Mock para removeContainersInNetwork
      const spyRemoveContainers = jest.spyOn(dockerManager, 'removeContainersInNetwork').mockResolvedValue();

      // Llamar al método con removeContainers=false
      await dockerManager.removeNetwork('test-network', false);

      // Verificar que no se eliminaron los contenedores
      expect(spyRemoveContainers).not.toHaveBeenCalled();

      // Verificar que se eliminó la red
      expect(mockNetwork.remove).toHaveBeenCalled();
    });

    it('debe manejar errores al eliminar una red', async () => {
      // Configurar el mock para lanzar un error
      const mockNetwork = {
        // @ts-ignore
        remove: jest.fn().mockRejectedValue(new Error('Error de prueba')) as any
      };
      // @ts-ignore
      (mockDocker.getNetwork as any) = jest.fn().mockReturnValue(mockNetwork);
      
      // Mock para removeContainersInNetwork
      jest.spyOn(dockerManager, 'removeContainersInNetwork').mockResolvedValue();

      // Verificar que se lanza un error
      await expect(dockerManager.removeNetwork('test-network')).rejects.toThrow(
        'Error al eliminar la red: Error de prueba'
      );
    });
  });

  describe('getNetworkInfo', () => {
    it('debe obtener información detallada de una red', async () => {
      // Configurar los mocks
      const mockNetwork = {
        // @ts-ignore
        inspect: jest.fn().mockResolvedValue({
          Id: 'network-123',
          Name: 'test-network',
          IPAM: {
            Config: [
              {
                Subnet: '172.20.0.0/16',
                Gateway: '172.20.0.1'
              }
            ]
          },
          Containers: {
            'container-1': {
              IPv4Address: '172.20.0.2/16'
            }
          }
        }) as any
      };
      const mockContainer = {
        // @ts-ignore
        inspect: jest.fn().mockResolvedValue({
          Name: '/test-container'
        }) as any
      };
      // @ts-ignore
      (mockDocker.getNetwork as any) = jest.fn().mockReturnValue(mockNetwork);
      // @ts-ignore
      (mockDocker.getContainer as any) = jest.fn().mockReturnValue(mockContainer);

      // Llamar al método
      const info = await dockerManager.getNetworkInfo('test-network');

      // Verificar que se obtuvo la red correcta
      expect(mockDocker.getNetwork).toHaveBeenCalledWith('test-network');

      // Verificar que se devolvió la información correcta
      expect(info).toEqual({
        id: 'network-123',
        name: 'test-network',
        config: {
          subnet: '172.20.0.0/16',
          gateway: '172.20.0.1'
        },
        containers: [
          {
            id: 'container-1',
            name: 'test-container',
            ip: '172.20.0.2'
          }
        ]
      });
    });

    it('debe manejar errores al obtener información de una red', async () => {
      // Configurar el mock para lanzar un error
      const mockNetwork = {
        // @ts-ignore
        inspect: jest.fn().mockRejectedValue(new Error('Error de prueba')) as any
      };
      // @ts-ignore
      (mockDocker.getNetwork as any) = jest.fn().mockReturnValue(mockNetwork);

      // Verificar que se lanza un error
      await expect(dockerManager.getNetworkInfo('test-network')).rejects.toThrow(
        'Error al obtener información de la red: Error de prueba'
      );
    });
  });

  describe('getContainerInfo', () => {
    it('debe obtener información detallada de un contenedor', async () => {
      // Configurar los mocks
      const mockContainer = {
        // @ts-ignore
        inspect: jest.fn().mockResolvedValue({
          Id: 'container-123',
          Name: '/test-container',
          State: {
            Status: 'running'
          },
          NetworkSettings: {
            Networks: {
              'test-network': {
                IPAddress: '172.20.0.2'
              },
              'bridge': {
                IPAddress: '172.17.0.2'
              }
            }
          }
        }) as any
      };
      // @ts-ignore
      (mockDocker.getContainer as any) = jest.fn().mockReturnValue(mockContainer);

      // Llamar al método
      const info = await dockerManager.getContainerInfo('test-container');

      // Verificar que se obtuvo el contenedor correcto
      expect(mockDocker.getContainer).toHaveBeenCalledWith('test-container');

      // Verificar que se devolvió la información correcta
      expect(info).toEqual({
        id: 'container-123',
        name: 'test-container',
        state: 'running',
        networks: [
          {
            name: 'test-network',
            ip: '172.20.0.2'
          },
          {
            name: 'bridge',
            ip: '172.17.0.2'
          }
        ]
      });
    });

    it('debe manejar errores al obtener información de un contenedor', async () => {
      // Configurar el mock para lanzar un error
      const mockContainer = {
        // @ts-ignore
        inspect: jest.fn().mockRejectedValue(new Error('Error de prueba')) as any
      };
      // @ts-ignore
      (mockDocker.getContainer as any) = jest.fn().mockReturnValue(mockContainer);

      // Verificar que se lanza un error
      await expect(dockerManager.getContainerInfo('test-container')).rejects.toThrow(
        'Error al obtener información del contenedor: Error de prueba'
      );
    });
  });
});