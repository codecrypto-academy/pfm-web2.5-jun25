# Información
Ejercicios para intectuar con una blockchain
 - Leer balance de una billetera

# Ejecución

1. Instalar dependencias `yarn install`
2. Copiar `.env` a `.env.local`
3. Asignar valores para [api-key de polygonscan](https://docs.polygonscan.com/getting-started/viewing-api-usage-statistics) y la dirección de la billetera a consultar
4. Leer balance `yarn dev:evm`

# Notas

Docs EVM compatible (depende de la RPC)
 - https://ethereum.org/en/developers/docs/apis/json-rpc/

Doc librería ethers
 - https://docs.ethers.org/v5/

## Ejercicios:
- leer balance de un token determinado en una red determinada
    - ejemplos:
        POL en Polygon
        ETH en Polygon

    - TIPs: 
      - Tú puedes leer todos los datos de una blockchain pública. En las redes EVM, nos tokens son realmente un contrato de balances. Son una clase con los diferentes métodos, siendo uno, el de obtener tú propio balance, pero también el de cualquier dirección de la red.
      - Para obtener entonces el balance, hay que crear una instancia del contrato y ejecutar el método balanceOf
      - El método RPC sería eth_call https://ethereum.org/es/developers/docs/apis/json-rpc/#eth_call
