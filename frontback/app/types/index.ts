export interface NetworkConfig {
  id: string; // "besu-local", "sepolia-testnet", etc.
  name: string; // "Besu Local Network"
  rpcUrl: string; // "http://localhost:8545"
  chainId: number; // 1337
  privateKey: string; // process.env.PRIVATE_KEY
  theme: {
    primary: string; // "blue-dark"
    secondary: string; // "blue-light"
  };
} 