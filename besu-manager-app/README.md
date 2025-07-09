# Besu Manager App

## Dependencias

- Node.js v18+
- Docker Desktop

## Instalación

```bash
npm install
npm run dev
```

URL: `http://localhost:3000`

## Comandos

```bash
npm run dev      # Desarrollo
npm run build    # Compilar
npm run start    # Producción
npm run lint     # Verificar código
```

## Errores Comunes

**Puerto ocupado:**
```bash
npm run dev -- -p 3001
```

**Docker no disponible:**
```bash
docker ps
```

**MetaMask no conecta:**
- Instalar MetaMask
- Agregar red con ChainID correcto
