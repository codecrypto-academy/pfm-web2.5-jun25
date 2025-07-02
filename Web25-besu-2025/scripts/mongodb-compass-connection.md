# Connexion MongoDB Compass

## Méthode 1 : URI de connexion
```
mongodb://admin:password123@localhost:27017/besuNetworks?authSource=admin
```

## Méthode 2 : Connexion manuelle
- **Hostname** : `localhost`
- **Port** : `27017`
- **Authentication** : `Username / Password`
- **Username** : `admin`
- **Password** : `password123`
- **Authentication Database** : `admin`
- **Database** : `besuNetworks`

## Commandes utiles

### Arrêter le conteneur
```bash
docker stop mongodb-besu
```

### Redémarrer le conteneur
```bash
docker start mongodb-besu
```

### Supprimer le conteneur (attention : supprime les données)
```bash
docker stop mongodb-besu
docker rm mongodb-besu
docker volume rm mongodb_data
```

### Voir les logs du conteneur
```bash
docker logs mongodb-besu
```

### Accéder au shell MongoDB
```bash
docker exec -it mongodb-besu mongosh --username admin --password password123 --authenticationDatabase admin
```