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

echo "¡Base de datos MongoDB (vacia) creada exitosamente!"
echo "Contenedor: mongodb-besu"
echo "Puerto: 27017"
echo "Base de datos: besuNetworks"
echo "Colección: networks"
