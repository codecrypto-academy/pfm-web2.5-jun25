# Librería TypeScript Besu

## Dependencias

- Node.js v18+
- Docker Desktop

## Instalación

```bash
npm install
npm run build
```

## Comandos

```bash
npx ts-node examples/simple-network.ts    # Red básica
npx ts-node examples/transactions.ts      # Transacciones
npx ts-node examples/deploy-contract.ts   # Contratos
npm test                                   # Tests
```

## Errores Comunes

**Docker no disponible:**
```bash
docker --version
docker ps
```

**Puerto ocupado:**
```bash
# Cambiar puerto en config
baseRpcPort: 8555
```

**Permisos Docker (Linux):**
```bash
sudo usermod -aG docker $USER
newgrp docker
```