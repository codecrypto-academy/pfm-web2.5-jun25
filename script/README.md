# Script Besu

## Dependencias

- Docker
- Docker Compose
- Bash

## Comandos

```bash
./besu-network.sh start     # Iniciar red
./besu-network.sh stop      # Detener red
./besu-network.sh status    # Ver estado
```

## Endpoints

```bash
http://localhost:8545   # Nodo 1
http://localhost:8546   # Nodo 2
http://localhost:8547   # Nodo 3
```

## Errores Comunes

**Docker no disponible:**
```bash
docker --version
sudo systemctl start docker
```

**Puertos ocupados:**
```bash
# Editar docker-compose.yml
ports: ["8555:8545"]
```

**Permisos:**
```bash
chmod +x besu-network.sh
```