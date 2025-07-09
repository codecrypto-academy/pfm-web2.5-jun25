import { JsonRpcProvider, Wallet, formatEther, parseEther } from "ethers";
import path from "path";
import fs from "fs";
import { MINERNODE_PORT, RPC_PORT_NODE_LIST, BOOTNODE_PORT, NETWORK_NAME } from "./constants";

const getProvider = (port: number) => {
    return new JsonRpcProvider(`http://localhost:${port}`);
};

const getSigner = (privateKey: string, provider: JsonRpcProvider) => {
    return new Wallet(privateKey, provider);
};

const checkAccountBalance = async (provider: JsonRpcProvider, address: string, nodeName: string) => {
    const balance = await provider.getBalance(address);
    console.log(`Balance of ${address} on ${nodeName}: ${formatEther(balance)} ETH`);
    return balance;
};

const getBlockNumber = async (provider: JsonRpcProvider, nodeName: string) => {
    const blockNumber = await provider.getBlockNumber();
    console.log(`Current block number on ${nodeName}: ${blockNumber}`);
    return blockNumber;
};

const sendTransaction = async (
    signer: Wallet,
    toAddress: string,
    amount: string,
    nodeName: string
) => {
    console.log(`Attempting to send ${amount} ETH from ${signer.address} to ${toAddress} on ${nodeName}...`);
    const tx = {
        to: toAddress,
        value: parseEther(amount),
        gasLimit: 21000 // Standard gas limit for a simple ETH transfer
    };
    const response = await signer.sendTransaction(tx);
    await response.wait(); // Wait for the transaction to be mined
    console.log(`Transaction successful on ${nodeName}. Tx Hash: ${response.hash}`);
    return response;
};

(async () => {
    try {
        const blockchainDataPath = path.join(process.cwd(), NETWORK_NAME); // Assuming blockchain-manager is the network name

        // --- Configuration and Initialization ---
        const minernodeProvider = getProvider(MINERNODE_PORT);
        const bootnodeProvider = getProvider(BOOTNODE_PORT);
        const rpcNodeProviders = RPC_PORT_NODE_LIST.map(port => getProvider(port));

        const minernodeAddress = fs.readFileSync(path.join(blockchainDataPath, "miner", "address"), { encoding: 'utf-8' });
        const minernodePrivateKey = fs.readFileSync(path.join(blockchainDataPath, "miner", "key.priv"), { encoding: 'utf-8' });
        const minernodeSigner = getSigner(minernodePrivateKey, minernodeProvider);

        // --- Validation Steps ---

        console.log("\n--- Checking Account Balances ---");
        await checkAccountBalance(minernodeProvider, `0x${minernodeAddress}`, "Miner Node");

        // Example: Check balance of a dummy RPC node address (replace with actual RPC node address if needed)
        // For simplicity, we'll check the miner's balance again on an RPC node, assuming all nodes can access the same state.
        if (rpcNodeProviders.length > 0) {
            await checkAccountBalance(rpcNodeProviders[0], `0x${minernodeAddress}`, `RPC Node ${RPC_PORT_NODE_LIST[0]}`);
        } else {
            console.warn("No RPC nodes configured to check balances.");
        }


        console.log("\n--- Checking Node Synchronization ---");
        const bootnodeBlockNumber = await getBlockNumber(bootnodeProvider, "Bootnode");
        const minernodeBlockNumber = await getBlockNumber(minernodeProvider, "Miner Node");

        for (const [index, rpcProvider] of rpcNodeProviders.entries()) {
            const rpcBlockNumber = await getBlockNumber(rpcProvider, `RPC Node ${RPC_PORT_NODE_LIST[index]}`);
            if (rpcBlockNumber === bootnodeBlockNumber && rpcBlockNumber === minernodeBlockNumber) {
                console.log(`RPC Node ${RPC_PORT_NODE_LIST[index]} is synchronized.`);
            } else {
                console.warn(`RPC Node ${RPC_PORT_NODE_LIST[index]} is NOT synchronized.`);
            }
        }

        console.log("\n--- Performing Transaction Test ---");
        if (rpcNodeProviders.length > 0) {
            const recipientAddress = Wallet.createRandom().address; // Generate a random address for the recipient
            const initialMinerBalance = await checkAccountBalance(minernodeProvider, `0x${minernodeAddress}`, "Miner Node (Pre-Tx)");
            const initialRecipientBalance = await checkAccountBalance(rpcNodeProviders[0], recipientAddress, "Recipient (Pre-Tx)");

            const amountToSend = "0.0001"; // Amount in ETH
            await sendTransaction(minernodeSigner, recipientAddress, amountToSend, "Miner Node");

            const finalMinerBalance = await checkAccountBalance(minernodeProvider, `0x${minernodeAddress}`, "Miner Node (Post-Tx)");
            const finalRecipientBalance = await checkAccountBalance(rpcNodeProviders[0], recipientAddress, "Recipient (Post-Tx)");

            const expectedMinerBalanceChange = initialMinerBalance - parseEther(amountToSend);
            if (finalMinerBalance < initialMinerBalance && finalRecipientBalance > initialRecipientBalance) {
                console.log("Transaction successful: Balances updated as expected.");
            } else {
                console.error("Transaction failed: Balances did NOT update as expected.");
            }

        } else {
            console.warn("Cannot perform transaction test: No RPC nodes available.");
        }

    } catch (error) {
        console.error("Network validation failed:", error);
    }
})(); 