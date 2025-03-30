
# Nodo de Etherium besu (private networks)

## Introducción

https://besu.hyperledger.org/private-networks

https://besu.hyperledger.org/private-networks/get-started/install/run-docker-image

```bash

$ docker run -rf \
--network besu-network \
-p 8888:8545 \
-v ${PWD}/networks/besu-network:/data \
hyperledger/besu:latest \
--config-file=/data/config.toml \
--data-path=/data/bootnode/data \
--node-private-key-file=/data/bootnode/key.priv

```

### Configuración

Mecanismo de consenso
- `genesis.json`: https://besu.hyperledger.org/private-networks/tutorials/clique

```json
{
  "config": {
    "chainId": 701337,
    "londonBlock": 0,
    "clique": {
      "blockperiodseconds": 4,
      "epochlength": 30000,
      "createemptyblocks": true
    }
  },
  "extraData": "0x0000000000000000000000000000000000000000000000000000000000000000<Node 1 Address>0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "gasLimit": "0xa00000",
  "difficulty": "0x1",
  "alloc": {
    "<Node 1 Address>": {
      "balance": "0xad78ebc5ac6200000"
    }
  }
}
```


Configuración para la ejecución del nodo
- `config.toml`: https://besu.hyperledger.org/public-networks/how-to/configure-besu

```
# Chain
genesis-file="/data/genesis.json" # Path to the custom genesis file

# Network
p2p-host="0.0.0.0"
p2p-port=30303
p2p-enabled=true

# JSON-RPC
rpc-http-enabled=true
rpc-http-host="0.0.0.0"
rpc-http-port=8545
rpc-http-cors-origins=["*"]
rpc-http-api=["ETH","NET","CLIQUE","ADMIN","TRACE","DEBUG","TXPOOL","PERM"]

host-allowlist=["*"]
```


- `key`: priv/pub 
- `address`: adress de la key

Se crea una red de docker con varios nodos, uno de ellos es el `bootnode`: Definir `enode://publickey@ip:30030`

### Inicialización

## Crear claves publica y privada, address y enode

- Crear claves

  - Curva eliptica
  https://www.npmjs.com/package/elliptic

  - Algoritmo de hash
  https://www.npmjs.com/package/keccak256

```javascript
const { ec } = require("elliptic");

const ecObj = new ec("secp256k1");
const key = ecObj.genKeyPair();

// generate the public key in hex format
const pubKey = key.getPublic("hex");
console.log({ pubKey });

// generate the private key in hex format
const privKey = key.getPrivate("hex");
console.log({ privKey });

// generate the address from the public key
// --> In Ethereum, the '04' prefix is used to indicate that the public key is uncompressed
// --> To generate the wallet address,
//      --> this prefix '04' should be removed
//      --> should use the Keccak-256 hash algorithm

const pubKeyWithoutPrefix = pubKey.slice(2); // remove '04' prefix

const keccak256 = require("keccak256");
const address = keccak256(Buffer.from(pubKeyWithoutPrefix, "hex"))
  .toString("hex")
  .slice(-40);
console.log({ address });

// create enode URL from the public key and IP address
const ip = "127.0.0.1";
const enode = `enode://${pubKeyWithoutPrefix}@${ip}:30303`;
console.log({ enode });
```

## Crear network

```bash
$ docker network create besu-network \
--subnet $NETWORK
--label network=besu-network \
--label type=besu
```

## Lanzar el contenedor
```bash
$ docker run -d \
--name besu-network-bootnode \
--label nodo=bootnode \
--label network=besu-network \
--ip ${BOOTNODE_IP}
--network besu-network \
-p 8888:8545 \
-v ${PWD}/networks/besu-network:/data \
hyperledger/besu:latest \
--config-file=/data/config.toml \
--data-path=/data/bootnode/data
--node-private-key-file=/data/bootnode/key.priv \
--genesis-file=/data/genesis.json
```

  `--genesis-file` es redundante ya que el archivo `genesis.json` se referencia en la configuración de beso dentro de `config.toml`




