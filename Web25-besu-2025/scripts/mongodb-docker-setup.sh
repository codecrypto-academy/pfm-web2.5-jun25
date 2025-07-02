# 1. Créer et démarrer le conteneur MongoDB
docker run -d \
  --name mongodb-besu \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password123 \
  -e MONGO_INITDB_DATABASE=besuNetworks \
  -v mongodb_data:/data/db \
  mongo:latest

# 2. Attendre que MongoDB soit prêt (quelques secondes)
sleep 10

# 3. Créer la base de données et insérer les données
docker exec -i mongodb-besu mongosh --username admin --password password123 --authenticationDatabase admin <<EOF
use besuNetworks

db.networks.insertMany([
  {
    "network": "Test Besu",
    "cidr": "192.168.0.0/24",
    "ip": "192.168.0.10",
    "chainId": 1337,
    "signerAccount": "0x3B2F47B0134033afCa05c02a81cD81c9eEd5e957",
    "prefundedAccounts": [
      {
        "address": "0x6243A64dd2E56F164E1f08e99433A7DEC132AB4E",
        "amount": "1000"
      }
    ],
    "nodes": [
      {
        "type": "rpc",
        "ip": "192.168.0.11",
        "name": "rpc18883",
        "port": 18883
      },
      {
        "type": "miner",
        "ip": "192.168.0.3",
        "name": "miner18884",
        "port": 18884
      }
    ],
    "id": "3877004f-6b6d-4e8c-9fc0-499f6d5f0e63"
  },
  {
    "network": "Prueba Red Besu",
    "cidr": "10.0.0.0/16",
    "ip": "10.0.0.10",
    "chainId": 1338,
    "signerAccount": "0x4F9d6Eafa67ae9F317AC6A67138727E13D80Fe98",
    "prefundedAccounts": [
      {
        "address": "0x6243A64dd2E56F164E1f08e99433A7DEC132AB4E",
        "amount": "100"
      },
      {
        "address": "0xd69A7b47f4038BC831B8F22991Cf3A69DdC21574",
        "amount": "250"
      }
    ],
    "nodes": [
      {
        "type": "rpc",
        "ip": "10.0.0.11",
        "name": "rpc18962",
        "port": 18962
      },
      {
        "type": "miner",
        "ip": "10.0.0.12",
        "name": "miner18963",
        "port": 18963
      },
      {
        "type": "node",
        "ip": "10.0.0.13",
        "name": "node18964",
        "port": 18964
      }
    ],
    "id": "489744dc-b887-4ae0-8449-331c2a4c1cbb"
  }
])

# Vérifier l'insertion
db.networks.find().pretty()
EOF

echo "Base de données MongoDB créée avec succès !"
echo "Conteneur: mongodb-besu"
echo "Port: 27017"
echo "Base de données: besuNetworks"
echo "Collection: networks"