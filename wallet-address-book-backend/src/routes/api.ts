import { ethers, formatEther, isError } from "ethers";
import express, { Request, Response } from "express";
import fs from "fs";
import path from "path";
import {
  balanceInputSchema,
  faucetInputsSchema,
} from "../infraestructure/zod-validation";

const router = express.Router();
router.use(express.json());

router.get(
  "/balance/:chainid/:address",
  async (req: Request, res: Response) => {
    // TODO: Create an abstraction to validate the userId
    const parseResult = balanceInputSchema.safeParse(req.params);
    if (!parseResult.success) {
      res.status(400).send({ message: parseResult.error.errors[0].message });
      return;
    }

    const { address, chainid } = req.params;

    const providerURL =
      chainid === "701337"
        ? process.env.BESU_RPC_URL
        : process.env.ETHEREUM_RPC_URL;

    try {
      const provider = new ethers.JsonRpcProvider(providerURL);
      const balance = formatEther(await provider.getBalance(address));
      res.status(200).send({ balance });
    } catch (error) {
      console.log(error);

      res.status(400).send({ message: "Invalid address" });
    }
  }
);

router.post("/faucet/:chainid", async (req: Request, res: Response) => {
  // TODO: Create an abstraction to validate the userId
  const parseResult = faucetInputsSchema.safeParse({
    ...req.body,
    ...req.params,
  });
  if (!parseResult.success) {
    res.status(400).send({ message: parseResult.error.errors[0].message });
    return;
  }
  const { address, amount } = req.body;
  const { chainid } = req.params;

  // TODO: Refactor the logic depending on the chainid to get the wallet
  const providerURL =
    chainid === "701337"
      ? process.env.BESU_RPC_URL
      : process.env.ETHEREUM_RPC_URL;

  try {
    const provider = new ethers.JsonRpcProvider(providerURL);

    /**
     * Define the wallet that will send the funds:
     */
    let wallet;
    if (providerURL === process.env.ETHEREUM_RPC_URL) {
      // 1. get the wallet private key, should be the one defined in the genesis file
      const keystoreDir = path.join(
        process.cwd(),
        "..",
        "geth-node",
        "data",
        "keystore"
      );
      const keystoreFile = path.join(
        keystoreDir,
        process.env.SIGNER_ACCOUNT_FILE!
      );
      const keystoreFileContent = fs.readFileSync(keystoreFile, "utf8");

      // 2. connect the wallet to the provider
      wallet = ethers.Wallet.fromEncryptedJsonSync(
        keystoreFileContent,
        process.env.SIGNER_ACCOUNT_PASSWORD!
      ).connect(provider);
    } else {

      const privateKeyDir = path.join(
        process.cwd(),
        "..",
        "besu-node",
        "networks",
        "besu-network",
        "bootnode"
      );
      const privateKeyFile = path.join(
        privateKeyDir,
        process.env.BESU_SIGNER_PRIVATE_KEY!
      );

      const privateKey = fs.readFileSync(privateKeyFile, "utf8");
      wallet = new ethers.Wallet(privateKey, provider);
    }

    // 3. send the transaction
    const tx = await wallet.sendTransaction({
      to: address,
      value: ethers.parseEther(amount),
    });

    // 4. wait for the transaction to be mined
    const txPayload = await tx.wait();

    res.status(200).send({ txPayload });
  } catch (error) {
    if (isError(error, "INSUFFICIENT_FUNDS")) {
      console.dir(error.info, { depth: 3 });
      res.status(400).send({ message: error.shortMessage });
      return;
    }

    console.log(error);
    res.status(400).send({ message: "Something went wrong" });
  }
});

export default router;
