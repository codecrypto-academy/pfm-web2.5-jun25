# Configuración de Redes Hyperledger Besu

## Descripción Técnica

Este directorio contiene las configuraciones y datos de la rede Hyperledger Besu de prueba creada por el script, incluyendo la configuración del concenso Clique, archivos génesis, y datos de los nodos.

## Estructura del Sistema de Archivos

```
networks/
└── besu-network/
    ├── config.toml              # Configuración general
    ├── genesis.json             # Bloque génesis
    ├── bootnode/
    │   ├── data/                # Datos blockchain
    │   ├── logs/                # Logs del nodo
    │   ├── key.priv            # Clave privada
    │   ├── key.pub             # Clave pública
    │   └── address             # Dirección Ethereum
    └── nodos/
```

## Configuraciones Técnicas

### 1. Bloque Génesis (genesis.json)
```json
{
  "config": {
    "chainId": 1337,
    "constantinoplefixblock": 0,
    "ibft2": {
      "blockperiodseconds": 2,
      "epochlength": 30000,
      "requesttimeoutseconds": 4,
      "blockreward": "0x0",
      "validatorcontractaddress": "0x0000000000000000000000000000000000000000"
    }
  },
  "nonce": "0x0",
  "timestamp": "0x0",
  "extraData": "0x...",  // Lista de validadores iniciales
  "gasLimit": "0x1fffffffffffff",
  "difficulty": "0x1",
  "mixHash": "0x63746963616c2062797a616e74696e65206661756c7420746f6c6572616e6365",
  "coinbase": "0x0000000000000000000000000000000000000000",
  "alloc": {
    // Cuentas prefundadas
  }
}
```

## Configuración de Nodos

### Bootnode

```toml
# config.toml
network="besu-network"
p2p-port=30303
discovery-enabled=true
```

### Nodos Normales

```toml
# config.toml
network="besu-network"
bootnodes=["enode://...@10.0.0.10:30303"]
p2p-port=30304
rpc-http-enabled=true
```

## Archivos de Configuración

### genesis.json

```json
{
  "config": {
    "chainId": 1337,
    "ibft2": {
      "blockperiodseconds": 2,
      "epochlength": 30000,
      "requesttimeoutseconds": 4
    }
  },
  "alloc": {
    "0x0000000000000000000000000000000000000000": {
      "balance": "0x1"
    }
  }
}
```

## Estructura de Datos

### Directorios de Nodos

```
nodo1/
├── data/           # Datos de la blockchain
├── logs/          # Logs del nodo
├── key            # Clave privada
├── key.pub        # Clave pública
└── address        # Dirección Ethereum
```

## Referencias

- [Documentación Besu](https://besu.hyperledger.org/en/stable/)
- [Guía de Configuración](https://besu.hyperledger.org/en/stable/HowTo/Configure/Using-Configuration-File/)
