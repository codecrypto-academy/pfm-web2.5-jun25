/**
 *
 * TODO: Explorar https://www.npmjs.com/package/@metamask/sdk
 *
 */

import { formatUnits, parseEther } from "ethers";
// https://github.com/Road2Crypto/wallet-address-validator
import { isWalletValid } from "r2c-wallet-validator";
import { useEffect, useState } from "react";
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
};

function throwRequestError(request: string, message: unknown): Error {
  throw new Error(
    `${request} request failed: ${JSON.stringify(message, null, 4)}`
  );
}

const Balance = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [accounts, setAccounts] = useState<string>();
  const [balance, setBalance] = useState<string>();

  const [qty, setQty] = useState<string>("0.0000");
  const [to, setTo] = useState<string>("");

  /**
   * Connect to metamask
   */
  const metamaskConnectHandler = () => {
    setIsConnecting(true);
    window.ethereum
      ?.request({ method: "eth_requestAccounts" })
      .then((accounts) => {
        setIsConnecting(false);
        if (Array.isArray(accounts)) {
          setAccounts(accounts[0]);
          return;
        }

        throwRequestError("eth_requestAccounts", accounts);
      });
  };

  /**
   * Read the balance of the connected wallet address
   */
  useEffect(() => {
    if (accounts) {
      // console.log(window.ethereum.selectedAddress);
      window.ethereum
        ?.request({
          method: "eth_getBalance",
          params: [accounts.toString(), "latest"],
        })
        .then((balanceInWei) => {
          if (typeof balanceInWei !== "string") {
            throwRequestError("eth_getBalance", balanceInWei);
            return;
          }
          const balanceInEthers = formatUnits(balanceInWei, 18); //(Number(balanceInWei) / 10 ** 18).toFixed(4);
          setBalance(balanceInEthers);
        });
    }
  }, [accounts]);

  /**
   * Add accountsChanged handler to manage wallet address change
   */
  useEffect(() => {
    if (accounts) {
      window.ethereum?.on("accountsChanged", (data) => {
        setAccounts(data[0]);
      });
    }
  }, [accounts]);

  /**
   * Send funds from one wallet to another wallet
   */
  const transferClickHandler = () => {
    if (!qty || !to) {
      return;
    }

    window.ethereum
      ?.request({
        method: "eth_sendTransaction",
        params: [
          {
            to,
            from: (accounts as string).toString(),
            value: parseEther(qty).toString(),
          },
        ],
      })
      .then((result) => {
        console.log(result);
      })
      .catch((error) => {
        console.log("ERROR!", error);
      });
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
      {!accounts ? (
        <ConnectMetamaskButton
          clickHandler={metamaskConnectHandler}
          isConnecting={isConnecting}
        />
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Wallet address:</span>
            <span>{accounts.toString()}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Balance:</span>
            <span>{balance}</span>
          </div>
          <h3>Transfer</h3>
          <div style={{ display: "flex", gap: "12px" }}>
            <span>Quantity:</span>
            <input
              style={{ width: "64px" }}
              type="number"
              name="qty"
              min="0"
              max={balance}
              step="0.0001"
              value={Number(qty).toFixed(4)}
              onChange={(e) => setQty(e.target.value)}
            />
            <span>to account</span>
            <input
              style={{ flexGrow: "1" }}
              type="text"
              name="to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <pre>is valid {isWalletValid(to).valid ? "si" : "no"}</pre>
          <button
            style={{ width: "100%", marginTop: "12px" }}
            onClick={transferClickHandler}
            disabled={!qty || !to}
          >
            Transfer
          </button>
        </>
      )}
    </>
  );
};

export default Balance;
