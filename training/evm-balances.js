import Web3 from "web3";
import { getContractABI, getProvider } from "./utils.js";

// provider
const polygon = "https://polygon.llamarpc.com"; // ethereum = "https://eth.llamarpc.com"

// public account
var walletAddress = process.env.WALLET_ADDRESS;
// conexión
const httpProvider = getProvider(polygon);
const web3 = new Web3(httpProvider);

// get ETH balance
web3.eth
  .getBalance(walletAddress)
  .then((i) => {
    // convert to ether
    const etherValue = Web3.utils.fromWei(i, "ether");
    console.log(`Your balance is ${etherValue} ether`);
  })
  .catch((e) => {
    console.log(e);
  });

// POL token address [https://polygonscan.com/token/0x0000000000000000000000000000000000001010#readContract]
const POLContractAddress = "0x0000000000000000000000000000000000001010";
// ABI contract for POL token
const contractAbi = await getContractABI(POLContractAddress);

// contract instance
const contract = new web3.eth.Contract(contractAbi, POLContractAddress);
// get balance
contract.methods
  .balanceOf(walletAddress)
  .call()
  .then((balance) => {
    console.log(`Your POL balance is: ${balance} tokens`);
  })
  .catch((error) => {
    console.error(error);
  });
