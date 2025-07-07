import fs from "fs";
import path from "path";

export interface CliqueGenesisConfig {
    chainId: number;
    network: string;
    initialValidators: string[];
    preAllocatedAccounts?: PreAllocatedAccount[];
    blockPeriodSeconds?: number;
    epochLength?: number;
    createEmptyBlocks?: boolean;
    gasLimit?: string;
    difficulty?: string;
}

export interface PreAllocatedAccount {
    address: string;
    balance: string;
}

export interface AllocationObject {
    [address: string]: {
        balance: string;
    };
}

const DEFAULT_BLOCK_PERIOD_SECONDS = 4;
const DEFAULT_EPOCH_LENGTH = 30000;
const DEFAULT_GAS_LIMIT = "0xa00000";
const DEFAULT_DIFFICULTY = "0x1";
const VANITY_DATA_LENGTH = 64;
const SIGNATURE_LENGTH = 130;

export function createCliqueGenesisFile(config: CliqueGenesisConfig) {

    validateConfig(config);


    const genesisFile = generateCliqueGenesisFile(config);
    const blockchainDataPath = path.join(process.cwd(), config.network);

    try {
        if (!fs.existsSync(blockchainDataPath)) {
            fs.mkdirSync(blockchainDataPath, { recursive: true });
        }
        fs.writeFileSync(path.join(blockchainDataPath, "genesis.json"), JSON.stringify(genesisFile));
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to create genesis file: ${error.message}`);
        }
        throw new Error(`Failed to create genesis file`);
    }
}

function validateConfig(config: CliqueGenesisConfig): void {
    if (!config.chainId || config.chainId <= 0) {
        throw new Error('Chain ID must be a positive integer');
    }

    if (!config.network || config.network.trim() === '') {
        throw new Error('Network name cannot be empty');
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(config.network)) {
        throw new Error('Network name contains invalid characters');
    }

    if (!config.initialValidators || config.initialValidators.length === 0) {
        throw new Error('At least one initial validator is required');
    }
}

export function generateCliqueGenesisFile(config: CliqueGenesisConfig) {

    try {
        const extraDataField = generateExtraData(config.initialValidators);

        const preAllocatedAccountsObject = config.preAllocatedAccounts
            ? generatePreAllocatedAccounts(config.preAllocatedAccounts)
            : {}


        const forkConfig = {
            homesteadBlock: 0,
            eip150Block: 0,
            eip155Block: 0,
            eip158Block: 0,
            byzantiumBlock: 0,
            constantinopleBlock: 0,
            petersburgBlock: 0,
            istanbulBlock: 0,
            berlinBlock: 0,
            londonBlock: 0,
        };

        const genesisFile = {
            config: {
                chainId: config.chainId,
                ...forkConfig,
                clique: {
                    blockperiodseconds: config.blockPeriodSeconds ?? DEFAULT_BLOCK_PERIOD_SECONDS,
                    epochlength: config.epochLength ?? DEFAULT_EPOCH_LENGTH,
                    createemptyblocks: config.createEmptyBlocks ?? true
                }
            },
            extraData: extraDataField,
            gasLimit: config.gasLimit ?? DEFAULT_GAS_LIMIT,
            difficulty: config.difficulty ?? DEFAULT_DIFFICULTY,
            alloc: preAllocatedAccountsObject
        };

        return genesisFile;
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to generate genesis json object: ${error.message}`);
        }
        throw new Error(`Failed to generate genesis json object`);
    }
}

export function generateExtraData(validatorAddresses: string[]): string {
    if (!validatorAddresses.length) {
        throw new Error(`At least one validator address must be provided`);
    }
    validatorAddresses.forEach(addr => {
        if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
            throw new Error(`Invalid Ethereum address: ${addr}`);
        }
    });

    const vanityData = "0".repeat(VANITY_DATA_LENGTH);
    const addresses = validatorAddresses
        .map(addr => addr.replace('0x', ''))
        .join('');
    const signature = "0".repeat(SIGNATURE_LENGTH);

    return `0x${vanityData}${addresses}${signature}`;
}

export function generatePreAllocatedAccounts(preAllocatedAccounts: PreAllocatedAccount[]): AllocationObject {
    const allocObject: AllocationObject = {};

    preAllocatedAccounts.forEach((account) => {
        const addressKey = account.address.replace(/^0x/i, '').toLowerCase();
        if (!/^0x[0-9a-fA-F]{40}$/i.test(account.address)) {
            throw new Error(`Invalid Ethereum address: ${account.address}`);
        }

        if (!/^(0x)?[0-9a-fA-F]+$/i.test(account.balance)) {
            throw new Error(`Invalid balance format: ${account.balance}`);
        }

        const balanceValue = account.balance.startsWith('0x')
            ? account.balance
            : `0x${account.balance}`;

        if (allocObject[addressKey]) {
            throw new Error(`Duplicate address found: ${account.address}`);
        }

        allocObject[addressKey] = { balance: balanceValue };
    });


    return allocObject;
}