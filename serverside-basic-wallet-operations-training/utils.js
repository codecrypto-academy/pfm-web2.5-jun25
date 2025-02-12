import Web3 from "web3";

export async function getContractABI(contractAddress) {
  // https://docs.polygonscan.com/api-endpoints/contracts
  const res = await fetch(
    `${process.env.API_ENDPOINT}?module=contract&action=getabi&address=${contractAddress}&apikey=${process.env.API_KEY}`
  );
  const data = await res.json();
  return JSON.parse(data.result);
}

export function getProvider(blockchainNetwork) {
  return new Web3.providers.HttpProvider(blockchainNetwork);
}

export async function getEthPrice() {
  const getEthPriceResponse = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");
  const ethPrice = await getEthPriceResponse.json();
  return ethPrice.ethereum.usd;
    
}