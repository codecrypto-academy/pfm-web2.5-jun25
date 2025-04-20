import { Eip1193Provider } from 'ethers';
import { useEffect, useState } from 'react';

declare global {
  interface Window {
    ethereum?: Eip1193Provider & {
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}

const useMetamask = () => {
  
    const [isWalletConnected, setIsWalletConnected] = useState(false);
    const [account, setAccount] = useState<string | null>(null);
  
    const connectWallet = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: "eth_requestAccounts",
          });
          setIsWalletConnected(true);
          setAccount(accounts[0]);
        } catch (error) {
          console.error(error);
        }
      } else {
        alert("Please install MetaMask to use this feature.");
      }
    };
  
    useEffect(() => {
      if (window.ethereum && !isWalletConnected) {
        window.ethereum
          .request({
            method: "eth_accounts",
          })
          .then((accounts: string[]) => {
            if (accounts.length > 0) {
              setIsWalletConnected(true);
              setAccount(accounts[0]);
            } else {
              setIsWalletConnected(false);
            }
          });
      }
    }, [isWalletConnected]);
  
    useEffect(() => {
      if (window.ethereum) {
        const handleAccountsChanged = (...args: unknown[]) => {
          const accounts = args[0] as string[];
          
          if (accounts.length > 0) {
            setIsWalletConnected(true);
            setAccount(accounts[0]);
          } else {
            setIsWalletConnected(false);
          }
        };
        window.ethereum.on("accountsChanged", handleAccountsChanged);
  
        return () => {
          window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
        };
      }
    }, []);

    return { isWalletConnected, account, connectWallet };
}

export default useMetamask