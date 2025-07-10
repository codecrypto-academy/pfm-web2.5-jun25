#!/bin/bash
# 1. Crear e iniciar el contenedor MongoDB
docker run -d \
  --name mongodb-besu \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password123 \
  -e MONGO_INITDB_DATABASE=besuNetworks \
  -v mongodb_data:/data/db \
  mongo:latest

# 2. Esperar a que MongoDB esté listo (unos segundos)
sleep 10

# 3. Crear la base de datos e insertar los datos
docker exec -i mongodb-besu mongosh --username admin --password password123 --authenticationDatabase admin <<EOF
use besuNetworks

db.networks.insertMany([
  {
    "_id": {
      "$oid": "686bbd06cdb770d9daabf02c"
    },
    "name": "PrebaRedBesu",
    "chainId": 1337,
    "subnet": "192.168.0.0/24",
    "ip": "192.168.0.10",
    "signerAddress": "0x3B2F47B0134033afCa05c02a81cD81c9eEd5e957",
    "accounts": [
      {
        "address": "0x6243A64dd2E56F164E1f08e99433A7DEC132AB4E",
        "balance": "100"
      }
    ],
    "nodes": [
      {
        "id": "PrebaRedBesu-rpc19041",
        "networkId": "PrebaRedBesu",
        "name": "rpc19041",
        "type": "rpc",
        "ip": "192.168.0.11",
        "port": 19041,
        "createdAt": {
          "$date": "2025-07-07T12:26:46.108Z"
        },
        "updatedAt": {
          "$date": "2025-07-07T12:26:46.108Z"
        }
      },
      {
        "id": "PrebaRedBesu-miner19042",
        "networkId": "PrebaRedBesu",
        "name": "miner19042",
        "type": "miner",
        "ip": "192.168.0.12",
        "port": 19042,
        "createdAt": {
          "$date": "2025-07-07T12:26:46.108Z"
        },
        "updatedAt": {
          "$date": "2025-07-07T12:26:46.108Z"
        }
      },
      {
        "id": "PrebaRedBesu-node19043",
        "networkId": "PrebaRedBesu",
        "name": "node19043",
        "type": "node",
        "ip": "192.168.0.13",
        "port": 19043,
        "createdAt": {
          "$date": "2025-07-07T12:26:46.108Z"
        },
        "updatedAt": {
          "$date": "2025-07-07T12:26:46.108Z"
        }
      },
      {
        "id": "PrebaRedBesu-miner19073",
        "networkId": "686bbd06cdb770d9daabf02c",
        "name": "miner19073",
        "type": "miner",
        "ip": "192.168.0.22",
        "port": 19073,
        "createdAt": {
          "$date": "2025-07-07T13:10:39.826Z"
        },
        "updatedAt": {
          "$date": "2025-07-07T13:10:39.826Z"
        }
      }
    ],
    "createdAt": {
      "$date": "2025-07-07T12:26:46.108Z"
    },
    "updatedAt": {
      "$date": "2025-07-07T13:10:39.828Z"
    }
  },
  {
    "_id": {
      "$oid": "686bd1433881932a96cea03f"
    },
    "name": "RedBesu",
    "chainId": 1338,
    "subnet": "10.0.0.0/16",
    "ip": "10.0.0.10",
    "signerAddress": "0x890DA66c41345142719A9349d19ab0f48F08D449",
    "accounts": [
      {
        "address": "0x6243A64dd2E56F164E1f08e99433A7DEC132AB4E",
        "balance": "10000"
      }
    ],
    "nodes": [
      {
        "id": "RedBesu-rpc19074",
        "networkId": "RedBesu",
        "name": "rpc19074",
        "type": "rpc",
        "ip": "10.0.10.10",
        "port": 19074,
        "createdAt": {
          "$date": "2025-07-07T13:53:07.012Z"
        },
        "updatedAt": {
          "$date": "2025-07-07T13:53:07.012Z"
        }
      },
      {
        "id": "RedBesu-miner19075",
        "networkId": "RedBesu",
        "name": "miner19075",
        "type": "miner",
        "ip": "10.0.20.10",
        "port": 19075,
        "createdAt": {
          "$date": "2025-07-07T13:53:07.012Z"
        },
        "updatedAt": {
          "$date": "2025-07-07T13:53:07.012Z"
        }
      },
      {
        "id": "RedBesu-miner19076",
        "networkId": "RedBesu",
        "name": "miner19076",
        "type": "miner",
        "ip": "10.0.20.11",
        "port": 19076,
        "createdAt": {
          "$date": "2025-07-07T13:53:07.012Z"
        },
        "updatedAt": {
          "$date": "2025-07-07T13:53:07.012Z"
        }
      },
      {
        "id": "RedBesu-miner19077",
        "networkId": "RedBesu",
        "name": "miner19077",
        "type": "miner",
        "ip": "10.0.20.12",
        "port": 19077,
        "createdAt": {
          "$date": "2025-07-07T13:53:07.012Z"
        },
        "updatedAt": {
          "$date": "2025-07-07T13:53:07.012Z"
        }
      },
      {
        "id": "RedBesu-node19078",
        "networkId": "RedBesu",
        "name": "node19078",
        "type": "node",
        "ip": "10.0.30.10",
        "port": 19078,
        "createdAt": {
          "$date": "2025-07-07T13:53:07.012Z"
        },
        "updatedAt": {
          "$date": "2025-07-07T13:53:07.012Z"
        }
      },
      {
        "id": "RedBesu-miner19168",
        "networkId": "686bd1433881932a96cea03f",
        "name": "miner19168",
        "type": "miner",
        "ip": "10.0.20.13",
        "port": 19168,
        "createdAt": {
          "$date": "2025-07-07T14:02:32.334Z"
        },
        "updatedAt": {
          "$date": "2025-07-07T14:02:32.334Z"
        }
      },
      {
        "id": "RedBesu-miner19169",
        "networkId": "686bd1433881932a96cea03f",
        "name": "miner19169",
        "type": "miner",
        "ip": "10.0.20.14",
        "port": 19169,
        "createdAt": {
          "$date": "2025-07-07T14:06:09.749Z"
        },
        "updatedAt": {
          "$date": "2025-07-07T14:06:09.749Z"
        }
      }
    ],
    "createdAt": {
      "$date": "2025-07-07T13:53:07.012Z"
    },
    "updatedAt": {
      "$date": "2025-07-07T14:06:09.753Z"
    }
  }
])

# Verificar la inserción
db.networks.find().pretty()
EOF

echo "¡Base de datos MongoDB (vacia) creada exitosamente!"
echo "Contenedor: mongodb-besu"
echo "Puerto: 27017"
echo "Base de datos: besuNetworks"
echo "Colección: networks"