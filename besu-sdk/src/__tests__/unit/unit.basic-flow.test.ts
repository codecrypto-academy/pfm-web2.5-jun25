import {
    BesuNetworkBuilder,
    createTestNetwork,
    generateNodeIdentity,
    generateMultipleIdentities,
    validateNodeIdentity,
    deriveAddressFromPrivateKey,
    formatPrivateKeyForBesu,
    validateNetworkConfig,
    validateNodeConfig,
    DEFAULTS,
    VERSION
  } from '../../index';
  
  describe('Besu SDK - Smoke Tests', () => {
    // Verificar que las constantes existen
    test('exports constants', () => {
      expect(VERSION).toBeDefined();
      expect(DEFAULTS).toBeDefined();
    });
  
    // Verificar que todas las funciones utility existen y retornan algo
    test('key utilities work', async () => {
      const identity = await generateNodeIdentity();
      expect(identity).toHaveProperty('privateKey');
      
      const identities = await generateMultipleIdentities(2);
      expect(identities).toHaveLength(2);
      
      expect(validateNodeIdentity(identity)).toBe(true);
      
      const address = deriveAddressFromPrivateKey(identity.privateKey);
      expect(address).toBeDefined();
      
      const formatted = formatPrivateKeyForBesu(identity.privateKey);
      expect(formatted).toBeDefined();
    });
  
        // Verificar que las validaciones no explotan con data válida
    test('validations work', () => {
      // Test that empty nodes array throws error (as expected)
      expect(() => validateNetworkConfig({
        chainId: 1337,
        blockPeriodSeconds: 5,
        network: {
          name: 'test',
          subnet: '172.20.0.0/16'
        },
        nodes: []
      })).toThrow('Must be a non-empty array of node configurations');

      // Test that valid config with nodes doesn't throw
      expect(() => validateNetworkConfig({
        chainId: 1337,
        blockPeriodSeconds: 5,
        network: {
          name: 'test',
          subnet: '172.20.0.0/16'
        },
        nodes: [{
          name: 'validator1',
          ip: '172.20.0.10',
          validator: true
        }]
      })).not.toThrow();

      expect(() => validateNodeConfig({
        name: 'test',
        ip: '172.20.0.10',
        validator: true
      }, '172.20.0.0/16')).not.toThrow();
    });
  
    // Verificar que el builder funciona con operaciones básicas
    test('builder works', () => {
      const builder = new BesuNetworkBuilder();
      
      // Probar el fluent API
      builder
        .withChainId(1337)
        .withBlockPeriod(5)
        .withNetworkName('test')
        .withSubnet('172.20.0.0/16')
        .addValidator('v1', '172.20.0.10')
        .addRpcNode('r1', '172.20.0.20', 8545);
      
      const config = builder.getConfig();
      expect(config.chainId).toBe(1337);
      expect(config.nodes).toHaveLength(2);
      
      // Probar clone y reset
      const cloned = builder.clone();
      expect(cloned).toBeDefined();
      
      builder.reset();
      expect(builder.getConfig().nodes).toHaveLength(0);
    });
  
    // Verificar que createTestNetwork existe
    test('createTestNetwork exists', () => {
      expect(createTestNetwork).toBeDefined();
      expect(typeof createTestNetwork).toBe('function');
    });
  });