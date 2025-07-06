# Asociación explícita entre miners y signerAccounts

A partir de la versión actual, la asociación entre nodos miner y cuentas firmantes (signerAccounts) es explícita y obligatoria.

## ¿Cómo funciona?
- **Cada nodo miner** en la definición de la red debe tener el campo `signerAddress`.
- El valor de `signerAddress` debe coincidir exactamente con la dirección de uno de los objetos en el array `signerAccounts` de la configuración.
- Si hay más miners que signerAccounts, o si algún miner no tiene un signerAccount correspondiente, se lanzará un error y la red no se creará.
- Las claves privadas y públicas de los signerAccounts se generan y gestionan internamente. **Nunca se exponen ni deben pasarse en la configuración pública.**

## Ejemplo de configuración mínima

```js
const config = {
  name: 'mi-red-besu',
  chainId: 1234,
  subnet: '172.50.0.0/16',
  consensus: 'clique',
  gasLimit: '0x47E7C4',
  signerAccounts: [
    { address: '0x742d35Cc6354C6532C4c0a1b9AAB6ff119B4a4B9', weiAmount: '100000000000000000000000' }
  ],
  nodes: [
    { name: 'bootnode1', ip: '172.50.0.10', rpcPort: 8545, type: 'bootnode' },
    { name: 'miner1', ip: '172.50.0.11', rpcPort: 8546, type: 'miner', signerAddress: '0x742d35Cc6354C6532C4c0a1b9AAB6ff119B4a4B9' }
  ]
};
```

Con esta configuración, el nodo `miner1` usará la clave generada internamente para la cuenta `0x742d35Cc6354C6532C4c0a1b9AAB6ff119B4a4B9`. 