import {
  validateNetworkConfig,
  validateNodeConfig,
  validateNodeOptions,
  validateNodeIp,
  validateDockerConnection
} from '../../validators/config';
import { ConfigurationValidationError } from '../../errors';
import { NetworkConfig, NodeConfig, NodeOptions } from '../../types';

describe('Configuration Validators - Comprehensive Tests', () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('validateNetworkConfig()', () => {
    const validConfig: NetworkConfig = {
      chainId: 1337,
      blockPeriodSeconds: 5,
      network: {
        name: 'test-network',
        subnet: '172.20.0.0/16'
      },
      nodes: [
        {
          name: 'validator1',
          ip: '172.20.0.10',
          validator: true
        }
      ]
    };

    describe('Happy path', () => {
      test('accepts valid configuration', () => {
        expect(() => validateNetworkConfig(validConfig)).not.toThrow();
      });

      test('accepts multiple valid nodes', () => {
        const config = {
          ...validConfig,
          nodes: [
            { name: 'validator1', ip: '172.20.0.10', validator: true },
            { name: 'rpc1', ip: '172.20.0.11', rpc: true, rpcPort: 8545 },
            { name: 'node1', ip: '172.20.0.12', validator: false }
          ]
        };
        expect(() => validateNetworkConfig(config)).not.toThrow();
      });
    });

    describe('chainId validation', () => {
      test('throws for zero chainId', () => {
        const config = { ...validConfig, chainId: 0 };
        expect(() => validateNetworkConfig(config)).toThrow(ConfigurationValidationError);
        expect(() => validateNetworkConfig(config)).toThrow('Must be a positive integer');
      });

      test('throws for negative chainId', () => {
        const config = { ...validConfig, chainId: -1 };
        expect(() => validateNetworkConfig(config)).toThrow(ConfigurationValidationError);
        expect(() => validateNetworkConfig(config)).toThrow('Must be a positive integer');
      });

      test('throws for float chainId', () => {
        const config = { ...validConfig, chainId: 1337.5 };
        expect(() => validateNetworkConfig(config)).toThrow(ConfigurationValidationError);
        expect(() => validateNetworkConfig(config)).toThrow('Must be a positive integer');
      });

      test('warns for well-known chain IDs', () => {
        const wellKnownIds = [1, 3, 4, 5, 42, 56, 137, 43114];
        wellKnownIds.forEach(chainId => {
          consoleWarnSpy.mockClear();
          const config = { ...validConfig, chainId };
          expect(() => validateNetworkConfig(config)).not.toThrow();
          expect(consoleWarnSpy).toHaveBeenCalledWith(
            expect.stringContaining(`Warning: Chain ID ${chainId} is used by a public network`)
          );
        });
      });
    });

    describe('blockPeriodSeconds validation', () => {
      test('throws for zero blockPeriodSeconds', () => {
        const config = { ...validConfig, blockPeriodSeconds: 0 };
        expect(() => validateNetworkConfig(config)).toThrow(ConfigurationValidationError);
        expect(() => validateNetworkConfig(config)).toThrow('Must be a positive integer (minimum 1 second)');
      });

      test('throws for negative blockPeriodSeconds', () => {
        const config = { ...validConfig, blockPeriodSeconds: -1 };
        expect(() => validateNetworkConfig(config)).toThrow(ConfigurationValidationError);
        expect(() => validateNetworkConfig(config)).toThrow('Must be a positive integer (minimum 1 second)');
      });

      test('throws for float blockPeriodSeconds', () => {
        const config = { ...validConfig, blockPeriodSeconds: 5.5 };
        expect(() => validateNetworkConfig(config)).toThrow(ConfigurationValidationError);
        expect(() => validateNetworkConfig(config)).toThrow('Must be a positive integer (minimum 1 second)');
      });

      test('warns for long block periods', () => {
        const config = { ...validConfig, blockPeriodSeconds: 120 };
        expect(() => validateNetworkConfig(config)).not.toThrow();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Warning: Block period of 120s is quite long')
        );
      });
    });

    describe('network name validation', () => {
      test('throws for empty network name', () => {
        const config = {
          ...validConfig,
          network: { ...validConfig.network, name: '' }
        };
        expect(() => validateNetworkConfig(config)).toThrow(ConfigurationValidationError);
        expect(() => validateNetworkConfig(config)).toThrow('Must be a non-empty string');
      });

      test('throws for invalid characters in network name', () => {
        const invalidNames = ['test@network', 'test network', 'test/network', 'test*network'];
        invalidNames.forEach(name => {
          const config = {
            ...validConfig,
            network: { ...validConfig.network, name }
          };
          expect(() => validateNetworkConfig(config)).toThrow(ConfigurationValidationError);
          expect(() => validateNetworkConfig(config)).toThrow('Must start with alphanumeric and contain only');
        });
      });

      test('throws for network name starting with non-alphanumeric', () => {
        const config = {
          ...validConfig,
          network: { ...validConfig.network, name: '-invalid' }
        };
        expect(() => validateNetworkConfig(config)).toThrow(ConfigurationValidationError);
        expect(() => validateNetworkConfig(config)).toThrow('Must start with alphanumeric and contain only');
      });

      test('throws for network name too long', () => {
        const longName = 'a'.repeat(65);
        const config = {
          ...validConfig,
          network: { ...validConfig.network, name: longName }
        };
        expect(() => validateNetworkConfig(config)).toThrow(ConfigurationValidationError);
        expect(() => validateNetworkConfig(config)).toThrow('Must not exceed 64 characters');
      });

      test('accepts valid network names', () => {
        const validNames = ['test', 'test-network', 'test_network', 'test.network', 'test123'];
        validNames.forEach(name => {
          const config = {
            ...validConfig,
            network: { ...validConfig.network, name }
          };
          expect(() => validateNetworkConfig(config)).not.toThrow();
        });
      });
    });

    describe('subnet validation', () => {
      test('throws for invalid subnet format', () => {
        const invalidSubnets = ['192.168.1', '192.168.1.0', '192.168.1.0/'];
        invalidSubnets.forEach(subnet => {
          const config = {
            ...validConfig,
            network: { ...validConfig.network, subnet }
          };
          expect(() => validateNetworkConfig(config)).toThrow(ConfigurationValidationError);
          expect(() => validateNetworkConfig(config)).toThrow('Must be in CIDR notation');
        });
      });

      test('throws for public IP ranges', () => {
        const publicSubnets = ['8.8.8.0/24', '1.1.1.0/24', '208.67.222.0/24'];
        publicSubnets.forEach(subnet => {
          const config = {
            ...validConfig,
            network: { ...validConfig.network, subnet }
          };
          expect(() => validateNetworkConfig(config)).toThrow(ConfigurationValidationError);
          expect(() => validateNetworkConfig(config)).toThrow('Must be a private network range');
        });
      });

      test('throws for invalid prefix lengths', () => {
        const invalidPrefixes = ['172.20.0.0/7', '172.20.0.0/31', '172.20.0.0/35'];
        invalidPrefixes.forEach(subnet => {
          const config = {
            ...validConfig,
            network: { ...validConfig.network, subnet }
          };
          expect(() => validateNetworkConfig(config)).toThrow(ConfigurationValidationError);
          expect(() => validateNetworkConfig(config)).toThrow('Prefix length must be between 8 and 30');
        });
      });
    });

    describe('nodes array validation', () => {
      test('throws for empty nodes array', () => {
        const config = { ...validConfig, nodes: [] };
        expect(() => validateNetworkConfig(config)).toThrow(ConfigurationValidationError);
        expect(() => validateNetworkConfig(config)).toThrow('Must be a non-empty array of node configurations');
      });

      test('throws for duplicate node names', () => {
        const config = {
          ...validConfig,
          nodes: [
            { name: 'node1', ip: '172.20.0.10', validator: true },
            { name: 'node1', ip: '172.20.0.11', validator: false }
          ]
        };
        expect(() => validateNetworkConfig(config)).toThrow(ConfigurationValidationError);
        expect(() => validateNetworkConfig(config)).toThrow('Node names must be unique');
      });

      test('throws for duplicate node IPs', () => {
        const config = {
          ...validConfig,
          nodes: [
            { name: 'node1', ip: '172.20.0.10', validator: true },
            { name: 'node2', ip: '172.20.0.10', validator: false }
          ]
        };
        expect(() => validateNetworkConfig(config)).toThrow(ConfigurationValidationError);
        expect(() => validateNetworkConfig(config)).toThrow('IP addresses must be unique');
      });

      test('throws for duplicate RPC ports', () => {
        const config = {
          ...validConfig,
          nodes: [
            { name: 'node1', ip: '172.20.0.10', rpc: true, rpcPort: 8545 },
            { name: 'node2', ip: '172.20.0.11', rpc: true, rpcPort: 8545 }
          ]
        };
        expect(() => validateNetworkConfig(config)).toThrow(ConfigurationValidationError);
        expect(() => validateNetworkConfig(config)).toThrow('RPC ports must be unique');
      });

      test('throws for no validators', () => {
        const config = {
          ...validConfig,
          nodes: [
            { name: 'node1', ip: '172.20.0.10', validator: false },
            { name: 'node2', ip: '172.20.0.11', validator: false }
          ]
        };
        expect(() => validateNetworkConfig(config)).toThrow(ConfigurationValidationError);
        expect(() => validateNetworkConfig(config)).toThrow('At least one node must be configured as a validator');
      });
    });
  });

  describe('validateNodeConfig()', () => {
    const validNode: NodeConfig = {
      name: 'test-node',
      ip: '172.20.0.10',
      validator: true
    };
    const subnet = '172.20.0.0/16';

    describe('Happy path', () => {
      test('accepts valid node configuration', () => {
        expect(() => validateNodeConfig(validNode, subnet)).not.toThrow();
      });

      test('accepts node with RPC configuration', () => {
        const nodeWithRpc = {
          ...validNode,
          rpc: true,
          rpcPort: 8545
        };
        expect(() => validateNodeConfig(nodeWithRpc, subnet)).not.toThrow();
      });
    });

    describe('name validation', () => {
      test('throws for empty name', () => {
        const node = { ...validNode, name: '' };
        expect(() => validateNodeConfig(node, subnet)).toThrow(ConfigurationValidationError);
        expect(() => validateNodeConfig(node, subnet)).toThrow('Must be a non-empty string');
      });

      test('throws for invalid name format', () => {
        const invalidNames = ['-invalid', 'test@node', 'test node'];
        invalidNames.forEach(name => {
          const node = { ...validNode, name };
          expect(() => validateNodeConfig(node, subnet)).toThrow(ConfigurationValidationError);
          expect(() => validateNodeConfig(node, subnet)).toThrow('Must start with alphanumeric and contain only');
        });
      });
    });

    describe('IP validation', () => {
      test('throws for IP outside subnet', () => {
        const node = { ...validNode, ip: '192.168.1.10' };
        expect(() => validateNodeConfig(node, subnet)).toThrow(ConfigurationValidationError);
        expect(() => validateNodeConfig(node, subnet)).toThrow('Must be within subnet');
      });

      test('throws for network address', () => {
        const node = { ...validNode, ip: '172.20.0.0' };
        expect(() => validateNodeConfig(node, subnet)).toThrow(ConfigurationValidationError);
        expect(() => validateNodeConfig(node, subnet)).toThrow('Cannot use network address');
      });

      test('throws for broadcast address', () => {
        const node = { ...validNode, ip: '172.20.255.255' };
        expect(() => validateNodeConfig(node, subnet)).toThrow(ConfigurationValidationError);
        expect(() => validateNodeConfig(node, subnet)).toThrow('Cannot use broadcast address');
      });
    });
  });

  describe('validateNodeOptions()', () => {
    const validOptions: NodeOptions = {
      name: 'test-node',
      ip: '172.20.0.10',
      validator: true
    };

    describe('name validation', () => {
      test('throws for empty name', () => {
        const options = { ...validOptions, name: '' };
        expect(() => validateNodeOptions(options)).toThrow(ConfigurationValidationError);
        expect(() => validateNodeOptions(options)).toThrow('Must be a non-empty string');
      });

      test('throws for invalid name format', () => {
        const options = { ...validOptions, name: '-invalid' };
        expect(() => validateNodeOptions(options)).toThrow(ConfigurationValidationError);
        expect(() => validateNodeOptions(options)).toThrow('Must start with alphanumeric and contain only');
      });
    });
  });

  describe('validateNodeIp()', () => {
    const subnet = '172.20.0.0/16';

    describe('Happy path', () => {
      test('accepts valid IPs within subnet', () => {
        const validIps = ['172.20.0.1', '172.20.0.10', '172.20.255.254'];
        validIps.forEach(ip => {
          expect(() => validateNodeIp(ip, subnet)).not.toThrow();
        });
      });
    });

    describe('IP format validation', () => {
      test('throws for invalid octet values', () => {
        const invalidIps = ['256.1.1.1', '1.256.1.1', '1.1.256.1', '1.1.1.256'];
        invalidIps.forEach(ip => {
          expect(() => validateNodeIp(ip, subnet)).toThrow(ConfigurationValidationError);
          expect(() => validateNodeIp(ip, subnet)).toThrow('Invalid octet value');
        });
      });
    });

    describe('Subnet validation', () => {
      test('throws for IP outside subnet', () => {
        const outsideIps = ['192.168.1.10', '10.0.0.10', '172.19.0.10', '172.21.0.10'];
        outsideIps.forEach(ip => {
          expect(() => validateNodeIp(ip, subnet)).toThrow(ConfigurationValidationError);
          expect(() => validateNodeIp(ip, subnet)).toThrow('Must be within subnet');
        });
      });

      test('throws for network address', () => {
        expect(() => validateNodeIp('172.20.0.0', subnet)).toThrow(ConfigurationValidationError);
        expect(() => validateNodeIp('172.20.0.0', subnet)).toThrow('Cannot use network address');
      });

      test('throws for broadcast address', () => {
        expect(() => validateNodeIp('172.20.255.255', subnet)).toThrow(ConfigurationValidationError);
        expect(() => validateNodeIp('172.20.255.255', subnet)).toThrow('Cannot use broadcast address');
      });

      test('allows gateway IP if it is valid host IP within subnet', () => {
        // Gateway IP 172.20.0.1 should be allowed as it's a valid host IP
        expect(() => validateNodeIp('172.20.0.1', subnet)).not.toThrow();
      });
    });
  });

  describe('validateRpcPort()', () => {
    // Note: validateRpcPort is not exported, but it's tested indirectly through node validation
    // We test it through the node validation functions that call it internally

    describe('RPC port validation through node config', () => {
      const validNode: NodeConfig = {
        name: 'test-node',
        ip: '172.20.0.10',
        rpc: true,
        rpcPort: 8545
      };
      const subnet = '172.20.0.0/16';

      test('accepts valid port range', () => {
        const validPorts = [1, 8545, 9545, 65535];
        validPorts.forEach(rpcPort => {
          const node = { ...validNode, rpcPort };
          expect(() => validateNodeConfig(node, subnet)).not.toThrow();
        });
      });


      test('warns for privileged ports', () => {
        const privilegedPorts = [80, 443, 22, 23, 25, 53, 110, 993, 995];
        privilegedPorts.forEach(rpcPort => {
          consoleWarnSpy.mockClear();
          const node = { ...validNode, rpcPort };
          expect(() => validateNodeConfig(node, subnet)).not.toThrow();
          expect(consoleWarnSpy).toHaveBeenCalledWith(
            expect.stringContaining(`Warning: Port ${rpcPort}`)
          );
        });
      });

      test('warns for common ports', () => {
        const commonPorts = [3000, 3306, 5432, 6379, 8080, 8443, 9000, 27017];
        commonPorts.forEach(rpcPort => {
          consoleWarnSpy.mockClear();
          const node = { ...validNode, rpcPort };
          expect(() => validateNodeConfig(node, subnet)).not.toThrow();
          expect(consoleWarnSpy).toHaveBeenCalledWith(
            expect.stringContaining(`Warning: Port ${rpcPort}`)
          );
        });
      });
    });
  });

  describe('validateDockerConnection()', () => {
    describe('Happy path', () => {
      test('accepts undefined dockerHost (default socket)', () => {
        expect(() => validateDockerConnection()).not.toThrow();
        expect(() => validateDockerConnection(undefined)).not.toThrow();
      });

      test('accepts valid protocols', () => {
        const validHosts = [
          'unix:///var/run/docker.sock',
          'tcp://localhost:2376',
          'http://localhost:2375',
          'https://remote-docker:2376'
        ];
        validHosts.forEach(dockerHost => {
          expect(() => validateDockerConnection(dockerHost)).not.toThrow();
        });
      });
    });

    describe('Invalid formats', () => {
      test('throws for invalid protocols', () => {
        const invalidHosts = [
          'file:///var/run/docker.sock',
          'ssh://user@host',
          'ftp://host',
          'localhost:2376',
          '/var/run/docker.sock'
        ];
        invalidHosts.forEach(dockerHost => {
          expect(() => validateDockerConnection(dockerHost)).toThrow(ConfigurationValidationError);
          expect(() => validateDockerConnection(dockerHost)).toThrow('Must start with one of: unix://, tcp://, http://, https://');
        });
      });
    });
  });
}); 