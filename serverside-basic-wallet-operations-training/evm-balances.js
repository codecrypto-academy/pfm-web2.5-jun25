import Web3 from "web3";
import { getProvider } from "./utils.js";

// provider
const polygonRPC = "https://polygon.llamarpc.com"; 
const ethereumRPC = "https://eth.llamarpc.com"
const provider = polygonRPC;


// public account
var walletAddress = process.env.WALLET_ADDRESS;
// conexión
const httpProvider = getProvider(provider);
const web3 = new Web3(httpProvider);

// get ETH balance
web3.eth
  .getBalance(walletAddress)
  .then(async (wei) => {
    // convert to ether
    console.log(wei);
    
    const etherValue = Web3.utils.fromWei(wei, "ether");
    console.log(`Your balance is ${etherValue} ether`);
    // console.log(await getEthPrice(etherValue));
    
  })
  .catch((e) => {
    console.log(e);
  });
/*****
// POL token address [https://polygonscan.com/token/0x0000000000000000000000000000000000001010#readContract]
const POLContractAddress = "0x0000000000000000000000000000000000001010"; // "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
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
****/ 