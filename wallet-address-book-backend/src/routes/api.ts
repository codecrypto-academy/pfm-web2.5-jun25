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

router.get("/balance/:address", async (req: Request, res: Response) => {
  // TODO: Create an abstraction to validate the userId
  const parseResult = balanceInputSchema.safeParse(req.params);
  if (!parseResult.success) {
    res.status(400).send({ message: parseResult.error.errors[0].message });
    return;
  }

  const { address } = req.params;

  try {
    const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
    const balance = formatEther(await provider.getBalance(address));
    res.status(200).send({ balance: balance.toString() });
  } catch (error) {
    console.log(error);

    res.status(400).send({ message: "Invalid address" });
  }
});

router.post("/faucet", async (req: Request, res: Response) => {
  // TODO: Create an abstraction to validate the userId
  const parseResult = faucetInputsSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).send({ message: parseResult.error.errors[0].message });
    return;
  }
  const { address, amount } = req.body;

  try {
    const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);

    /**
     * Define the wallet that will send the funds:
     */

    // 1. get the wallet private key, should be the one defined in the genesis file
    const keystoreDir = path.join(
      process.cwd(),
      "..",
      "eth-node",
      "data",
      "keystore"
    );
    const keystoreFile = path.join(
      keystoreDir,
      process.env.SIGNER_ACCOUNT_FILE!
    );
    const keystoreFileContent = fs.readFileSync(keystoreFile, "utf8");

    // 2. connect the wallet to the provider
    const wallet = ethers.Wallet.fromEncryptedJsonSync(
      keystoreFileContent,
      process.env.SIGNER_ACCOUNT_PASSWORD!
    ).connect(provider);

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
