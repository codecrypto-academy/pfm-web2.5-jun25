import { useCallback, useEffect, useState } from "react";

function throwRequestError(request: string, message: unknown): Error {
  throw new Error(
    `${request} request failed: ${JSON.stringify(message, null, 4)}`
  );
}

export const useEthereumAccount = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [chainId, setChainId] = useState<number>();
  const [currentAccount, setCurrentAccount] = useState<string>();

  const metamaskConnectHandler = () => {
    setIsConnecting(true);
    window.ethereum
      ?.request({ method: "eth_requestAccounts" })
      .then((accounts) => {
        setIsConnecting(false);
        if (Array.isArray(accounts)) {
          setCurrentAccount(accounts[0]);
          return;
        }
        throwRequestError("eth_requestAccounts", accounts);
      });
  };

  const accountsChangedHandler = useCallback(
    (accounts: Array<string>) => {
      if (accounts.length === 0) {
        // MetaMask is locked or the user has not connected any accounts.
        console.info("Please connect to MetaMask.");
      } else if (accounts[0] !== currentAccount) {
        setCurrentAccount(accounts[0]);
      }
    },
    [currentAccount]
  );

  /**
   * Add accountsChanged handler to manage wallet address change
   */
  useEffect(() => {
    window.ethereum?.on("accountsChanged", accountsChangedHandler);
  }, [accountsChangedHandler]);

  useEffect(() => {
    window.ethereum
      ?.request({ method: "eth_chainId" })
      .then((chainId) => {
        // console.log(`Connected to chain: ${Number(chainId)}`);
        // console.log("GETH", import.meta.env.VITE_GETH_CHAIN_ID);
        // console.log("BESU", import.meta.env.VITE_BESU_CHAIN_ID);
        setChainId(Number(chainId));
      })
      .catch((error) => {
        console.error(error);
      });

    window.ethereum?.on("chainChanged", () => {
      console.log("Chain changed");
      window.location.reload();
    });
  }, []);



  /**
   * Detect if metamask is already connected
   */
  useEffect(() => {
    window.ethereum
      ?.request({ method: "eth_accounts" })
      .then((accounts) => accountsChangedHandler(accounts as Array<string>));
  }, [accountsChangedHandler]);

  return {
    isConnecting,
    chainId,
    currentAccount,

    metamaskConnectHandler,
  };
};
