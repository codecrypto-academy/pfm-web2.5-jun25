
## ⚙️ Requisitos

- Docker
- Node.js (v18+ recomendado)
- Bash (GNU/Linux o WSL en Windows)
- Hyperledger Besu (imagen Docker)
- Acceso a puertos locales (8545, etc.)

## 🚀 ¿Qué hace el script?

1. Crea una red Docker para los nodos Besu
2. Genera claves privadas, addresses y enodes para cada nodo
3. Construye un `genesis.json` con consenso **Clique (Proof of Authority)**
4. Lanza los contenedores de los nodos en Docker
5. Prueba la red consultando saldos y enviando transacciones vía RPC

## 📜 Uso

```bash
chmod +x deploy.sh
./deploy.sh
