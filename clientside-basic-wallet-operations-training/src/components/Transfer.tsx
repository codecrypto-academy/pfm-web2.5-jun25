import { useForm } from "react-hook-form";

import { ethers, parseEther } from "ethers";
// https://github.com/Road2Crypto/wallet-address-validator
import { isWalletValid } from "r2c-wallet-validator";

// https://github.com/juanelas/bigint-conversion/blob/4a6d8f8a680c2022024bc6f9d4df4cec2fe979a6/docs/API.md#bigint-conversion---v243

import { useState } from "react";
import { useEthereumAccount } from "../hooks/useEthereumAccount";
import ConnectedAccount from "./ConnectedAccount";
import styles from "./styles.module.css";

type FormData = {
  to: string;
  qty: string;
};
const Transfer = () => {
  const { currentAccount } = useEthereumAccount();
  const [isSendingFunds, setIsSendingFunds] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { isValid },
    reset,
  } = useForm<FormData>();

  const validateWalletAddress = (value: string) => {
    return isWalletValid(value).valid;
  };

  /**
   * Send funds from one wallet to another wallet
   */
  const transferClickHandler = async (data: FormData) => {
    setIsSendingFunds(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer = await provider.getSigner(currentAccount);
      const tx = await signer.sendTransaction({
        to: data.to,
        value: parseEther(data.qty),
      });

      await tx.wait();
      reset();
    } catch (error) {
      console.error("Transaction failed or cancelled:", error);
    } finally {
      setIsSendingFunds(false);
    }
  };

  return (
    <>
      <h2>Transfer</h2>
      <section
        style={{
          backgroundColor: "#1a1a1a",
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <ConnectedAccount currentAccount={currentAccount} />

        <form
          className={styles.form}
          onSubmit={handleSubmit(transferClickHandler)}
        >
          <div style={{ display: "flex", gap: "12px" }}>
            <div>
              <label style={{ alignSelf: "flex-start" }}>
                Quantity
                <input
                  style={{ width: "64px", height: "fit-content" }}
                  type="number"
                  min="0"
                  max={10000}
                  step="0.0001"
                  // value={Number(qty).toFixed(4)}
                  {...register("qty", { required: true })}
                />
              </label>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                width: "100%",
              }}
            >
              <label>
                <span>to account</span>
                <input
                  type="text"
                  {...register("to", {
                    required: true,
                    validate: validateWalletAddress,
                  })}
                />
              </label>
            </div>
          </div>

          <button
            className={styles.button}
            disabled={!isValid || isSendingFunds}
            type="submit"
          >
            {isSendingFunds ? "Sending..." : "Send"}
          </button>
        </form>
      </section>
    </>
  );
};

export default Transfer;
