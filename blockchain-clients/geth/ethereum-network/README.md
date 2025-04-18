
Crear un red privada Ethereum con varios nodos con consenso Proof of Autority.

- Se va a user el cliente [geth](https://geth.ethereum.org/) para crear una red de diferentes nodos

  - crear cuenta
    1. preparar archivo para almacenar una password (PWD_FILE)
    2. crear cuenta en NODE: `geth --datadir ${NODE} account new --password ${PWD_FILE}`

  - generar archivo `genesis.json`

    en `extradata` se define la cuenta que firma las transacciones, que debe ser la cuenta creada anteriormente <Signer Account1> (puede ser uno o más de un nodo)

    ```json
    {
      "config": {
        "chainId": <ChainId>,
        "homesteadBlock": 0,
        "eip150Block": 0,
        "eip155Block": 0,
        "eip158Block": 0,
        "byzantiumBlock": 0,
        "constantinopleBlock": 0,
        "petersburgBlock": 0,
        "istanbulBlock": 0,
        "berlinBlock": 0,
        "clique": {
          "period": 5,
          "epoch": 30000
        }
      },
      "difficulty": "1",
      "gasLimit": "8000000",
      "extradata": "0x0000000000000000000000000000000000000000000000000000000000000000<Signer Account1><Signer Account2><Signer Account3>0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
      "alloc": {
        "<AccountWithBalance>": { "balance": "300000" },
      }
    }
    ```



  - inicializar el nodo

    `geth --datadir ${NODE} init genesis.json`


  - configurar un bootnode

    1. crear key `bootnode -genkey boot.key`
    2. generar el bootnode `bootnode -nodekey boot.key -addr :30305`
    3. Anotar la dirección del enode: ${ENODE}

  - levantar el nodo

    ```bash
    geth 
      --datadir ${NODE}
      --syncmode full

      --http --http.api admin,eth,miner,net,txpool,personal
      --http.port ${PORT}

      --allow-insecure-unlock 
      --unlock ${<Signer Account1>}
      --password ${PWD_FILE}
      --mine
      --miner.etherbase ${<Signer Account1>}

      --port ${NODE_PORT}
      --bootnodes ${ENODE}
    ```

  - Ejemplos
  
  ```bash
    geth --datadir node1 --syncmode full --http --http.api admin,eth,miner,net,txpool,personal --http.port 30306 --allow-insecure-unlock --unlock b8ff17cc5d114a0717f38cbbd09ed83642619c73 --password pwd --mine --miner.etherbase b8ff17cc5d114a0717f38cbbd09ed83642619c73 --port 30034 --authrpc.port 8551 --ipcpath "\\.\pipe\geth1.ipc" --bootnodes enode://89b9108ae56e43c22c9204ca701553eb795db6321a493fa2f1c65ed3c311900d739c650dd864a092c31ff8bdb0761274814612afa79453f11adab4a4fcebd978@127.0.0.1:0?discport=30305

    geth --datadir node2 --syncmode full --http --http.api admin,eth,miner,net,txpool,personal --http.port 30307 --allow-insecure-unlock --unlock 83204c3dd67ef49df01f7df241e31f99b0344b69 --password pwd --mine --miner.etherbase 83204c3dd67ef49df01f7df241e31f99b0344b69 --port 30035 --authrpc.port 8552 --ipcpath "\\.\pipe\geth2.ipc" --bootnodes enode://89b9108ae56e43c22c9204ca701553eb795db6321a493fa2f1c65ed3c311900d739c650dd864a092c31ff8bdb0761274814612afa79453f11adab4a4fcebd978@127.0.0.1:0?discport=30305

    geth --datadir node3 --syncmode full --http --http.api admin,eth,miner,net,txpool,personal --http.port 30308 --allow-insecure-unlock --unlock 321a5d0a94df1bd127401bd9c839a09f14f44968 --password pwd --mine --miner.etherbase 321a5d0a94df1bd127401bd9c839a09f14f44968 --port 30036 --authrpc.port 8553 --ipcpath "\\.\pipe\geth3.ipc" --bootnodes enode://89b9108ae56e43c22c9204ca701553eb795db6321a493fa2f1c65ed3c311900d739c650dd864a092c31ff8bdb0761274814612afa79453f11adab4a4fcebd978@127.0.0.1:0?discport=30305
  ```
