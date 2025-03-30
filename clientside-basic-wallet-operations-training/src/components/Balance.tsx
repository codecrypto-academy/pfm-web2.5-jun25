/**
 *
 * TODO: Explorar https://www.npmjs.com/package/@metamask/sdk
 *
 */

import { useState } from "react";
import ConnectMetamaskButton from "./ConnectMetamaskButton";

declare global {
  interface Window {
    ethereum?: ExternalProvider;
  }
}
type ExternalProvider = {
  isMetaMask: boolean;
  isStatus: boolean;
  host: string;
  path: string;
  sendAsync: (
    request: { method: string; params?: Array<unknown> },
    callback: (error: unknown, response: unknown) => void
  ) => void;
  send: (
    request: { method: string; params?: Array<unknown> },
    callback: (error: unknown, response: unknown) => void
  ) => void;
  request: (request: {
    method: string;
    params?: Array<unknown>;
  }) => Promise<unknown>;
  on: (event: string, callback: (data: string[]) => void) => void;
  selectedAddress?: string;
};

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEthereumAccount } from "../hooks/useEthereumAccount";
import ConnectedAccount from "./ConnectedAccount";
import styles from "./styles.module.css";

const Balance = () => {
  const [isProvidingFunds, setIsProvidingFunds] = useState(false);

  const [balance, setBalance] = useState<string>();

  const { currentAccount, metamaskConnectHandler, isConnecting } =
    useEthereumAccount();

  const { mutate: loadFundsMutation } = useMutation({
    mutationFn: async () => {
      if (!currentAccount) {
        return;
      }
      const response = await fetch(`http://localhost:3000/api/faucet/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: currentAccount.toString(),
          amount: "10000",
        }),
      });

      return await response.json();
    },
    onMutate: () => {
      setIsProvidingFunds(true);
    },
    onSuccess: async () => {
      setIsProvidingFunds(false);
      if (!currentAccount) {
        return;
      }
      const response = await fetch(
        `http://localhost:3000/api/balance/${currentAccount.toString()}`
      );

      const { balance } = await response.json();
      setBalance(balance);
    },
  });

  useQuery({
    queryKey: ["balance", currentAccount],
    queryFn: async () => {
      if (!currentAccount) {
        return 0;
      }
      const response = await fetch(
        `http://localhost:3000/api/balance/${currentAccount.toString()}`
      );

      const reponseBody = await response.json();
      setBalance(reponseBody.balance);
      return reponseBody;
    },
  });

  const loadFundsHandler = () => {
    loadFundsMutation();
  };

  const isMetamaskInstalled = !!window.ethereum;
  if (!isMetamaskInstalled) {
    return (
      <p style={{ textAlign: "center" }}>Metamask extension is not installed</p>
    );
  }

  return (
    <>
      <h2>Balance</h2>
      {!currentAccount ? (
        <ConnectMetamaskButton
          clickHandler={metamaskConnectHandler}
          isConnecting={isConnecting}
        />
      ) : (
        <section style={{ backgroundColor: "#1a1a1a", padding: "12px" }}>
          <ConnectedAccount currentAccount={currentAccount} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>Balance:</span>
            <span style={{ fontWeight: "bold", fontSize: "20px" }}>
              {balance}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "12px",
            }}
          >
            <button className={styles.button} onClick={loadFundsHandler}>
              {isProvidingFunds ? "Loading..." : "Load funds"}
            </button>
          </div>
        </section>
      )}
    </>
  );
};

export default Balance;
