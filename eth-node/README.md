
## Nodo de Etherium

### Introducción

https://geth.ethereum.org/docs/getting-started/installing-geth#docker-container

```bash
$ docker pull ethereum/client-go
$ docker run -it -p 30303:30303 ethereum/client-go
```

Puertos por defecto
  - 8545 TCP, used by the HTTP based JSON RPC API
  - 8546 TCP, used by the WebSocket based JSON RPC API
  - 8547 TCP, used by the GraphQL API
  - 30303 TCP and UDP, used by the P2P protocol running the network


Mostrar ayuda del comando `account`
```bash
$ docker run -v ./eth-node-data:/root/.ethereum -v ./pwd.txt:/pwd.txt ethereum/client-go:latest account help
```

### Crear cuenta

Comando para crear una cuenta:

```bash
$ docker run -v ${PWD}/data:/data -v ${PWD}/pwd.txt:/pwd.txt ethereum/client-go:v1.13.15 account new --datadir /data --password /pwd.txt
```

Esta cuenta que se crea es la que se usará como signer al definir el protocolo de consenso para crear la blockchain.

Importante definir correctamente los volumenes ya que en `${PWD}/data` encontraremos toda la información relevante de la cuenta creada, como la clave privada necesaria para usar esta cuenta como signer en la blockchain.

### Clique (protocolo de la red PoA)

https://geth.ethereum.org/docs/tools/clef/clique-signing

Protocolo de prueba de autoridad. Se basa en que haya una cuenta especializada en hacer la firma/validación de las transacciones.
Esto se define especificando en el archivo `genesis.json` que la red que se va a montar es proof of authority (PoA)

Ejemplo genesis.json
```json
{
  "config": {
    "chainId": 15,
    "homesteadBlock": 0,
    "eip150Block": 0,
    "eip155Block": 0,
    "eip158Block": 0,
    "byzantiumBlock": 0,
    "constantinopleBlock": 0,
    "petersburgBlock": 0,
    // espeficar el protocolo clique: PoA
    "clique": {
      "period": 30, // cada cuantos segundos se crea un bloque
      "epoch": 30000
    }
  },
  "difficulty": "1",
  "gasLimit": "8000000",
  // dirección del signer/validador. Cuenta creada anteriormente por lo que se dispone de la clave privada de dicha cuenta
  "extradata": "0x00000000000000000000000000000000000000000000000000000000000000009CD932F670F7eDe5dE86F756A6D02548e5899f470000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
  // ponemos todas las cuentas que queramos junto con un balance pre-cargado
  "alloc": {
    "0x9CD932F670F7eDe5dE86F756A6D02548e5899f47": {
      "balance": "300000000000000000000000000000000"
    }
  }
}

```

Ejemplo simplificado de un archivo `genesis.json` configurado para usar el protocolo de consenso **Clique** en una red blockchain basada en Ethereum:

```json
{
  "config": {
    "chainId": 1234,
    "homesteadBlock": 0,
    "eip150Block": 0,
    "eip155Block": 0,
    "eip158Block": 0,
    "byzantiumBlock": 0,
    "clique": {
      "period": 15,
      "epoch": 30000
    }
  },
  "nonce": "0x0",
  "timestamp": "0x0",
  "extraData": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "gasLimit": "0x47e7c4",
  "difficulty": "0x1",
  "mixHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
  "coinbase": "0x0000000000000000000000000000000000000000",
  "alloc": {},
  "number": "0x0",
  "gasUsed": "0x0",
  "parentHash": "0x0000000000000000000000000000000000000000000000000000000000000000"
}
```

1. **`config`**:
   - **`chainId`**: Identificador único de la red para evitar conflictos entre cadenas.
   - **`clique`**: Configuración específica del protocolo Clique:
     - **`period`**: Tiempo, en segundos, entre la creación de bloques. En este caso, 15 segundos.
     - **`epoch`**: Número de bloques después del cual se reinicia el consenso para reforzar la seguridad.

2. **`nonce`**: Se utiliza para identificar redes particulares, en este caso, configurado como `0x0`.

3. **`timestamp`**: Marca de tiempo del bloque génesis. Por lo general, `0x0` para el bloque inicial.

4. **`extraData`**: Campo importante para incluir las direcciones de los nodos firmantes (en la configuración real, aquí se añadirían las claves públicas de los nodos autorizados).

5. **`gasLimit`**: Límite de gas para las transacciones en un bloque. Determina la capacidad de procesamiento por bloque.

6. **`difficulty`**: En Clique, esto se establece en `0x1`, ya que no depende de cálculos computacionales como en Proof of Work.

7. **`alloc`**: Inicialización de cuentas con balance. Útil para preasignar fondos en el bloque génesis.

8. **`parentHash`**: Hash del bloque padre. En el bloque génesis, esto es todo ceros, ya que no tiene un bloque anterior.


## Inicializar la blockchain

Crear la base de datos de la blockchain. No necesariamente se levanta la blockchain, se **crea la base de datos**.

```bash
$ geth  --datadir ./ddir init genesis.json
```

En nuestro caso este comando hay que lanzarlo dentro de nuestro contenedor que es donde estamos creando el nodo

```bash
$ docker run -v ${PWD}/data:/data -v ${PWD}/genesis.json:/genesis.json ethereum/client-go:v1.13.15 init --datadir /data /genesis.json
```

## Inicializar el nodo

Ejecutar `$ docker-compose up`

El contenedor que se crea es el equivalente a ejecutar el comando de docker siguiente en la linea de comandos.

```bash

$ docker run --rm \
 -v ${PWD}/pwd.txt:/pwd.txt \
 -v ${PWD}/data:/data \
 -p 8545:8545 \
 --name nodo_eth \
 ethereum/client-go:v1.13.15 \
--datadir /data \
--unlock 5be2fbdadedd293f12195dc64066356a6d58bd21 \
--allow-insecure-unlock \
--mine \
--miner.etherbase 5be2fbdadedd293f12195dc64066356a6d58bd21 \
--password /pwd.txt \
--nodiscover \
--http \
--http.addr "0.0.0.0" \
--http.api "admin,eth,debug,miner,net,txpool,personal,web3" \
--http.corsdomain "*" \
--ipcdisable

```

**Línea 1:** `$ docker run --rm`

* `docker run`: ejecuta un contenedor Docker.
* `--rm`: elimina el contenedor después de que se detenga.

**Línea 2:** `-v ${PWD}/pwd.txt:/pwd.txt`

* `-v`: monta un volumen (un directorio o archivo) desde el host en el contenedor.
* `${PWD}/pwd.txt`: ruta al archivo `pwd.txt` en el directorio actual (`${PWD}`) del host.
* `:/pwd.txt`: ruta al archivo `pwd.txt` en el contenedor.

**Línea 3:** `-v ${PWD}/data:/data`

* `-v`: monta un volumen (un directorio o archivo) desde el host en el contenedor.
* `${PWD}/data`: ruta al directorio `data` en el directorio actual (`${PWD}`) del host.
* `:/data`: ruta al directorio `data` en el contenedor.

**Línea 4:** `-p 8545:8545`

* `-p`: publica un puerto del contenedor en el host.
* `8545`: puerto que se publicará en el host.
* `8545`: puerto que se utilizará en el contenedor.

**Línea 5:** `ethereum/client-go:v1.13.15`

* `ethereum/client-go`: imagen Docker de `geth`.
* `v1.13.15`: versión de la imagen.

**Línea 6:** `--datadir /data`

* `--datadir`: especifica el directorio de datos para `geth`.
* `/data`: ruta al directorio `data` en el contenedor.

**Línea 7:** `--unlock 5be2fbdadedd293f12195dc64066356a6d58bd21`

* `--unlock`: desbloquea la cuenta especificada.
* `5be2fbdadedd293f12195dc64066356a6d58bd21`: dirección de la cuenta que se desbloqueará.

**Línea 8:** `--allow-insecure-unlock`

* `--allow-insecure-unlock`: permite desbloquear la cuenta sin solicitar la contraseña. 
(necesario si en el mismo nodo se usa una cuenta para mintear y se crean otras cuentas con fondos)

**Línea 9:** `--mine`

* `--mine`: activa la minería en el nodo.

**Línea 10:** `--miner.etherbase 5be2fbdadedd293f12195dc64066356a6d58bd21`

* `--miner.etherbase`: especifica la dirección de la cuenta que recibirá las recompensas de minería.
* `5be2fbdadedd293f12195dc64066356a6d58bd21`: dirección de la cuenta que recibirá las recompensas de minería.

**Línea 11:** `--password /pwd.txt`

* `--password`: especifica el archivo que contiene la contraseña para desbloquear la cuenta.
* `/pwd.txt`: ruta al archivo `pwd.txt` en el contenedor.

**Línea 12:** `--nodiscover`

* `--nodiscover`: desactiva la descubierta de nodos en la red. (el nodo trabaja solo, no buscar nodos vecinos)

**Línea 13:** `--http`

* `--http`: activa el servidor HTTP para la API de `geth`.

**Línea 14:** `--http.addr "0.0.0.0"`

* `--http.addr`: especifica la dirección IP que se utilizará para el servidor HTTP.
* `"0.0.0.0"`: dirección IP que se utilizará para el servidor HTTP (todas las interfaces de red).

**Línea 15:** `--http.api "admin,eth,debug,miner,net,txpool,personal,web3"`

* `--http.api`: especifica los módulos de la API que se activarán.
* `"admin,eth,debug,miner,net,txpool,personal,web3"`: lista de módulos de la API que se activarán.

**Línea 16:** `--http.corsdomain "*"`

* `--http.corsdomain`: especifica el dominio que se permitirá para las solicitudes CORS.
* `"*"`: dominio que se permitirá para las solicitudes CORS (todos los dominios).
