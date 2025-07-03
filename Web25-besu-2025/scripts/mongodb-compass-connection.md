# Conexión MongoDB Compass

## Método 1: URI de conexión
```
mongodb://admin:password123@localhost:27017/besuNetworks?authSource=admin
```

## Método 2: Conexión manual
- **Hostname** : `localhost`
- **Puerto** : `27017`
- **Autenticación** : `Usuario / Contraseña`
- **Usuario** : `admin`
- **Contraseña** : `password123`
- **Base de datos de autenticación** : `admin`
- **Base de datos** : `besuNetworks`

## Comandos útiles

### Detener el contenedor
```bash
docker stop mongodb-besu
```

### Reiniciar el contenedor
```bash
docker start mongodb-besu
```

### Eliminar el contenedor (advertencia: elimina los datos)
```bash
docker stop mongodb-besu
docker rm mongodb-besu
docker volume rm mongodb_data
```

### Ver los logs del contenedor
```bash
docker logs mongodb-besu
```

### Acceder al shell de MongoDB
```bash
docker exec -it mongodb-besu mongosh --username admin --password password123 --authenticationDatabase admin
```