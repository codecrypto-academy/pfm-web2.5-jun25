## General description

This directory contains a bash script (`script.sh`) that deploys a private Hyperledger Besu network from scratch using Docker. It automates the creation of containers, the startup of multiple Besu nodes, and the execution of test transactions to validate the network’s operation, all based on the configuration defined in `config.yaml`, without needing to directly edit the script code.

## Prerequisites

To run the script correctly, you must have the following installed:

* **Node.js** and **npm** – used to sign transactions via JavaScript scripts.
* **Docker** – to run the blockchain network nodes.
* **WSL2** – required if you're working from Windows.

> **Note:** During its testing phase, the script uses Node.js libraries (like `ethers.js`) to sign transactions. In this project, those dependencies are centralized in the `frontback/` directory to avoid duplication, ease maintenance, and allow their use from both the bash scripts and the main application (Next.js).

### Installing "ethers"

During its testing phase, the script uses Node.js libraries (`ethers.js`) to sign transactions. To install it:

```bash
# From the project root
cd frontback
npm install ethers
cd ../script
```

> **Why `frontback/`?** This folder already contains a separate Next.js app, but it's **not** used in these tests. We just reuse its `node_modules` to avoid duplicate installs. If you're only running the Bash script, you can ignore all Next.js files—both parts of the repo are independent.
>
> The script reads the path to these dependencies from **`config.yaml`** (`tx_signer_deps_dir`). The default is `../frontback`, but you can change it if your directory layout differs. See the next section for details.

#### Using in other environments

If you plan to reuse this script in a different project or folder structure, you’ll need to install the required dependencies in the new location and update the corresponding path in `config.yaml`.

1. **Install the dependencies in the desired directory:**

```bash
# Suppose you're in 'script/' and will use '../backend' as the target
npm init -y         
npm install ethers  # generates node_modules and package-lock.json
```

2. **Update the `config.yaml` file accordingly:**

```yaml
tx_signer_deps_dir: "../backend"
```

> This value should point to the directory where the Node.js dependencies (e.g., `ethers`) are installed. Note that the path is **relative to the location of the `config.yaml` file itself**, not to where the script is executed from. The script then resolves it to an absolute path to ensure consistent behavior.

With that, the script will be able to locate the required libraries wherever you specify.

## How it works















The purpose of --no-cleanup is not to resume a perfectly running network. Its purpose is to reuse the persistent data (the generated node keys and genesis.json) while recreating the ephemeral parts (the running containers).














FALLOS ENCOTNRADOS :














¿Qué está funcionando perfectamente?
Arranque de Nodos: Todos los nodos arrancan y se mantienen en verde. ¡Éxito!
Conectividad P2P: El problema de aislamiento ha DESAPARECIDO.
Generated code
✓ bootnode-validator-0 (bootnode validator rpc) has 3 peer(s)
✓ All tested nodes appear to be connected to the network
✓ P2P connectivity test passed
Use code with caution.
La estrategia de darle al bootnode una lista vacía de bootnodes fue la solución correcta y definitiva para la conectividad.
Producción de Bloques: ¡El "stall" ha desaparecido!
Generated code
✓ Block production confirmed. Current block: 3 (started at: 2)
Use code with caution.
Esto prueba que la red está viva y el consenso funciona. Aunque tienes 2 validadores, en este caso particular tuvieron la suerte de no atascarse. Para una fiabilidad total, 1 o 3 sigue siendo la mejor práctica, pero ¡está funcionando!
Transacciones 1 y 2: ¡Funcionan perfectamente!
Generated code
✓ Transaction confirmed in block 0x5 (gas used: 0x5208)
...
✓ Transaction confirmed in block 0x6 (gas used: 0x5208)
Use code with caution.
Esto prueba que el fondeo automático de los nodos funcionó y que ahora pueden pagar por el gas de las transacciones.
El Único Error que Queda
Ahora, miremos el único punto rojo que queda en todo el informe:
Generated code
→ Processing test transaction 3/3...
...
✗ ERROR: Failed to sign transaction
✗ ERROR: Node.js error output: Transaction signing error: bad address checksum (argument="address", value="0x2EF3B1bD6Ff1E8b5F7229c7AE2dc5b0fE2D1d9eA", code=INVALID_ARGUMENT, version=6.15.0)
Use code with caution.
Este es exactamente el error que discutimos hace varios pasos. Es un simple error de formato en la dirección de destino dentro de tu config.yaml.
La Causa: La librería ethers.js que se usa para firmar la transacción es muy estricta y requiere que las direcciones de Ethereum usen el formato "checksum" (una mezcla de mayúsculas y minúsculas que valida la dirección para evitar errores de tipeo). La dirección que tienes en el config.yaml no cumple con este formato.
La Prueba: El error no es de la red, no es de conexión, no es de fondos. Es un error de INVALID_ARGUMENT que ocurre antes de que la transacción siquiera se envíe a la red. Ocurre localmente, dentro del script de Node.js que firma la transacción.



Race Conditions are Unpredictable: We are dealing with multiple independent processes (Docker containers) and network layers. The exact time it takes for a container to start, for the Besu process inside it to initialize, and for the network port to be bound by the operating system is not guaranteed. Factors like CPU load, disk I/O speed, and Docker daemon performance can introduce small, unpredictable delays.


to stop when ctrlçc it finds contianers and remobers them also


the script takes rpc directions