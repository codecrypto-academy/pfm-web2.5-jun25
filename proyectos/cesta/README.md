
1. Instalar base de datos Nordwind
    - crear contenedor postgresql y cargar la base de datos de ejemplo

2. Crear nodo eth
    - crear contenedor usando geth

        1. crear cuenta

        ```bash
            $ docker run -v ${PWD}/data:/data -v ${PWD}/pwd.txt:/pwd.txt ethereum/client-go:v1.13.15 account new --datadir /data --password /pwd.txt
        ```

        2. configurar nodo mediante la creación del archivo genesis.json

        ```json
            {
                "config": {
                    "chainId": 35001,
                    "homesteadBlock": 0,
                    "eip150Block": 0,
                    "eip155Block": 0,
                    "eip158Block": 0,
                    "byzantiumBlock": 0,
                    "constantinopleBlock": 0,
                    "petersburgBlock": 0,
                    "clique": {
                    "period": 4, 
                    "epoch": 30000
                    }
                },
                "extraData": "0x0000000000000000000000000000000000000000000000000000000000000000<address>0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
                "gasLimit": "0x1fffffffffffff",
                "difficulty": "0x1",
                "alloc": {
                    "0x<address>": {
                    "balance": "0x200000000000000000000000000000000000000000000000000000000000000"
                    }
                }
            }

        ```

        3. inicializar el nodo
        ```bash
            docker run --rm -v ${PWD}/genesis.json:/genesis.json -v ${PWD}/data:/data ethereum/client-go:v1.13.15 init --datadir /data /genesis.json
        ```


    - !OJO! 
        - en el video del proyecto por primera vez aparece el mecanismo de consenso PoW, sin mención al respecto
            -> buscar documentación sobre geth con PoW
        - verificar y repasar el concepto de cuenta de minado
            - es la que se pone al crear el container despues de --mine ?¿
            - no tiene relación con la cuenta que se usa para inicializar el nodo en el genesis ?¿
            - es quien recibe los fees de las transacciones ?¿

3. Crear aplicación frontend

    ```
    yarn create vite cesta-app --template react-ts
    ```