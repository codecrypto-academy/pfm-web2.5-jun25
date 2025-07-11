import fs from 'fs';
import path from 'path';
import { createCliqueGenesisFile, generateCliqueGenesisFile, generateExtraData, generatePreAllocatedAccounts } from "../services/cliqueGenesisFile";


describe('cliqueGenesisFile', () => {
    let existsSyncSpy: jest.SpyInstance;
    let mkdirSyncSpy: jest.SpyInstance;
    let writeFileSyncSpy: jest.SpyInstance;
    beforeEach(() => {
        jest.clearAllMocks();

        existsSyncSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        mkdirSyncSpy = jest.spyOn(fs, 'mkdirSync').mockReturnValue(undefined);
        writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);

    });

    afterEach(() => {
        // After each test, restore the original implementation of the spied functions
        existsSyncSpy.mockRestore();
        mkdirSyncSpy.mockRestore();
        writeFileSyncSpy.mockRestore();
    });

    it('should create directory and write genesis file', () => {
        const config = {
            chainId: 123,
            initialValidators: ['0xdd8655f39bee863dba4c5210cf6e4a02e76173e0']
        };

        const mockNetworkPath = path.join(process.cwd(), 'mock-network');
        const expectedGenesisContent = generateCliqueGenesisFile(config);

        createCliqueGenesisFile(mockNetworkPath, config);

        expect(existsSyncSpy).toHaveBeenCalledWith(mockNetworkPath);
        expect(writeFileSyncSpy).toHaveBeenCalledWith(
            expect.any(String),
            JSON.stringify(expectedGenesisContent)
        );
    });

    it('should create directory when it does not exist', () => {
        existsSyncSpy.mockReturnValue(false);

        const config = {
            chainId: 123,
            initialValidators: ['0xdd8655f39bee863dba4c5210cf6e4a02e76173e0']
        };

        const mockNetworkPath = path.join(process.cwd(), 'mock-network');

        createCliqueGenesisFile(mockNetworkPath, config);

        expect(mkdirSyncSpy).toHaveBeenCalledWith(mockNetworkPath, { recursive: true });
    });

    it('should write correct genesis content', () => {
        const config = {
            chainId: 123,
            initialValidators: ['0xdd8655f39bee863dba4c5210cf6e4a02e76173e0']
        };

        const mockNetworkPath = path.join(process.cwd(), 'mock-network');

        createCliqueGenesisFile(mockNetworkPath, config);

        const expectedGenesisContent = generateCliqueGenesisFile(config);
        expect(writeFileSyncSpy).toHaveBeenCalledWith(
            expect.any(String),
            JSON.stringify(expectedGenesisContent)
        );
    });

    it('should validate config and throw error for invalid chainId', () => {
        const invalidConfig = {
            chainId: 0,
            initialValidators: ['0xdd8655f39bee863dba4c5210cf6e4a02e76173e0']
        };

        const mockNetworkPath = path.join(process.cwd(), 'mock-network');


        expect(() => createCliqueGenesisFile(mockNetworkPath, invalidConfig))
            .toThrow('Chain ID must be a positive integer');
    });


    it('should validate config and throw error for empty validators', () => {
        const invalidConfig = {
            chainId: 123,
            initialValidators: []
        };

        const mockNetworkPath = path.join(process.cwd(), 'mock-network');

        expect(() => createCliqueGenesisFile(mockNetworkPath, invalidConfig))
            .toThrow('At least one initial validator is required');
    });
});

describe('generateCliqueGenesisFile', () => {
    it('should generate a valid genesis.json file', () => {
        const validEthereumAddress1 = '0xdd8655f39bee863dba4c5210cf6e4a02e76173e0';
        const validEthereumAddress2 = '0x93849a33bb149a12b1494640c97ca3d91749f849';
        const initialValidators = [validEthereumAddress1, validEthereumAddress2];
        const allocatedAccount1 = {
            address: '0xdd8655f39bee863dba4c5210cf6e4a02e76173e0',
            balance: '0xad78ebc5ac6200000'
        };
        const allocatedAccount2 = {
            address: '0x93849a33bb149a12b1494640c97ca3d91749f849',
            balance: '0xad78ebc5ac6200000'
        };
        const allocatedAccounts = [allocatedAccount1, allocatedAccount2];

        const genesisFile = generateCliqueGenesisFile({
            chainId: 201906,
            initialValidators: initialValidators,
            preAllocatedAccounts: allocatedAccounts,
        });

        expect(genesisFile).toEqual({
            "config": {
                "chainId": 201906,
                "homesteadBlock": 0,
                "eip150Block": 0,
                "eip155Block": 0,
                "eip158Block": 0,
                "byzantiumBlock": 0,
                "constantinopleBlock": 0,
                "petersburgBlock": 0,
                "istanbulBlock": 0,
                "berlinBlock": 0,
                "londonBlock": 0,
                "clique": {
                    "blockperiodseconds": 4,
                    "epochlength": 30000,
                    "createemptyblocks": true
                }
            },
            "extraData": "0x0000000000000000000000000000000000000000000000000000000000000000dd8655f39bee863dba4c5210cf6e4a02e76173e093849a33bb149a12b1494640c97ca3d91749f8490000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
            "gasLimit": "0xa00000",
            "difficulty": "0x1",
            "alloc": { "dd8655f39bee863dba4c5210cf6e4a02e76173e0": { "balance": "0xad78ebc5ac6200000" }, "93849a33bb149a12b1494640c97ca3d91749f849": { "balance": "0xad78ebc5ac6200000" } }
        });
    });

    it('should handle empty preAllocatedAccounts array', () => {
        const config = {
            chainId: 201906,
            initialValidators: ['0xdd8655f39bee863dba4c5210cf6e4a02e76173e0'],
            preAllocatedAccounts: [],
        };

        const result = generateCliqueGenesisFile(config);
        expect(result.alloc).toEqual({});
    });

    it('should handle undefined preAllocatedAccounts', () => {
        const config = {
            chainId: 201906,
            initialValidators: ['0xdd8655f39bee863dba4c5210cf6e4a02e76173e0'],
        };

        const result = generateCliqueGenesisFile(config);
        expect(result.alloc).toEqual({});
    });

    it('should use custom configuration values', () => {
        const config = {
            chainId: 201906,
            initialValidators: ['0xdd8655f39bee863dba4c5210cf6e4a02e76173e0'],
            blockPeriodSeconds: 10,
            epochLength: 50000,
            createEmptyBlocks: false,
            gasLimit: "0xb00000",
            difficulty: "0x2"
        };

        const result = generateCliqueGenesisFile(config);
        expect(result.config.clique.blockperiodseconds).toBe(10);
        expect(result.config.clique.epochlength).toBe(50000);
        expect(result.config.clique.createemptyblocks).toBe(false);
        expect(result.gasLimit).toBe("0xb00000");
        expect(result.difficulty).toBe("0x2");
    });
});

describe('generateExtraData', () => {
    it('generates valid extradata field when one validator address is provided', () => {
        const validEthereumAddress = '0xdd8655f39bee863dba4c5210cf6e4a02e76173e0';

        expect(generateExtraData([validEthereumAddress])).toBe("0x0000000000000000000000000000000000000000000000000000000000000000dd8655f39bee863dba4c5210cf6e4a02e76173e00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000");
    });

    it('generates valid extradata field two validator addresses are provided', () => {
        const validEthereumAddress1 = '0xdd8655f39bee863dba4c5210cf6e4a02e76173e0';
        const validEthereumAddress2 = '0x93849a33bb149a12b1494640c97ca3d91749f849';

        expect(generateExtraData([validEthereumAddress1, validEthereumAddress2])).toBe("0x0000000000000000000000000000000000000000000000000000000000000000dd8655f39bee863dba4c5210cf6e4a02e76173e093849a33bb149a12b1494640c97ca3d91749f8490000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000");
    });

    it('throws an error if no valid ethereum address is provided as validator', () => {
        const noValidEthereumAddress = 'xxx';
        const validEthereumAddress = '0x211a5e3696c8ee5debdffd4e429b6ed8a30c6361';

        expect(() => generateExtraData([validEthereumAddress, noValidEthereumAddress])).toThrow(`Invalid Ethereum address: ${noValidEthereumAddress}`);
    });

    it('should throw error for empty validator array', () => {
        expect(() => generateExtraData([])).toThrow('At least one validator address must be provided');
    });

    it('should throw error for address without 0x prefix', () => {
        expect(() => generateExtraData(['dd8655f39bee863dba4c5210cf6e4a02e76173e0']))
            .toThrow('Invalid Ethereum address: dd8655f39bee863dba4c5210cf6e4a02e76173e0');
    });

    it('should throw error for address with wrong length', () => {
        expect(() => generateExtraData(['0xdd8655f39bee863dba4c5210cf6e4a02e76173']))
            .toThrow('Invalid Ethereum address: 0xdd8655f39bee863dba4c5210cf6e4a02e76173');
    });

    it('should throw error for address with invalid characters', () => {
        expect(() => generateExtraData(['0xgg8655f39bee863dba4c5210cf6e4a02e76173e0']))
            .toThrow('Invalid Ethereum address: 0xgg8655f39bee863dba4c5210cf6e4a02e76173e0');
    });
});

describe('generatePreAllocatedAccounts', () => {
    it('generate the right alloc field value for the given allocated address and balance', () => {
        const allocatedAccount1 = {
            address: '0xdd8655f39bee863dba4c5210cf6e4a02e76173e0',
            balance: '0xad78ebc5ac6200000'
        };
        const allocatedAccount2 = {
            address: '0x93849a33bb149a12b1494640c97ca3d91749f849',
            balance: '0xad78ebc5ac6200000'
        };

        expect(generatePreAllocatedAccounts([allocatedAccount2, allocatedAccount1])).toEqual({
            "93849a33bb149a12b1494640c97ca3d91749f849": {
                "balance": "0xad78ebc5ac6200000"
            },
            "dd8655f39bee863dba4c5210cf6e4a02e76173e0": {
                "balance": "0xad78ebc5ac6200000"
            }
        });
    });

    it('should return empty object for empty array', () => {
        expect(generatePreAllocatedAccounts([])).toEqual({});
    });

    it('should throw error for invalid address format', () => {
        const invalidAccount = {
            address: 'invalid-address',
            balance: '0xad78ebc5ac6200000'
        };

        expect(() => generatePreAllocatedAccounts([invalidAccount]))
            .toThrow('Invalid Ethereum address: invalid-address');
    });

    it('should throw error for invalid balance format', () => {
        const invalidAccount = {
            address: '0xdd8655f39bee863dba4c5210cf6e4a02e76173e0',
            balance: 'invalid-balance'
        };

        expect(() => generatePreAllocatedAccounts([invalidAccount]))
            .toThrow('Invalid balance format: invalid-balance');
    });

    it('should throw error for duplicate addresses', () => {
        const duplicateAccounts = [
            { address: '0xdd8655f39bee863dba4c5210cf6e4a02e76173e0', balance: '0x1' },
            { address: '0xdd8655f39bee863dba4c5210cf6e4a02e76173e0', balance: '0x2' }
        ];

        expect(() => generatePreAllocatedAccounts(duplicateAccounts))
            .toThrow('Duplicate address found: 0xdd8655f39bee863dba4c5210cf6e4a02e76173e0');
    });

    it('should handle balance without 0x prefix', () => {
        const account = {
            address: '0xdd8655f39bee863dba4c5210cf6e4a02e76173e0',
            balance: 'ad78ebc5ac6200000'
        };

        const result = generatePreAllocatedAccounts([account]);
        expect(result['dd8655f39bee863dba4c5210cf6e4a02e76173e0'].balance)
            .toBe('0xad78ebc5ac6200000');
    });

    it('should handle mixed case addresses correctly', () => {
        const account = {
            address: '0xDD8655F39BEE863DBA4C5210CF6E4A02E76173E0',
            balance: '0xad78ebc5ac6200000'
        };

        const result = generatePreAllocatedAccounts([account]);
        expect(result).toHaveProperty('dd8655f39bee863dba4c5210cf6e4a02e76173e0');
    });
});