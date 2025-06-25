# Besu Network Scripts

Ce dossier contient des scripts pour automatiser la création et la gestion d'un réseau Ethereum privé utilisant Hyperledger Besu, ainsi que des utilitaires pour manipuler les clés et interagir avec le réseau.

## Script `besu_network.ps1`

Ce script PowerShell permet de créer un réseau Besu local composé d'un bootnode et de deux nœuds supplémentaires. Il automatise les étapes suivantes :

- Vérification de la présence de Docker.
- Suppression des réseaux et conteneurs existants liés à Besu.
- Création d'un réseau Docker dédié avec une plage d'adresses IP personnalisée.
- Génération des clés (privée, publique, enode, address) pour chaque nœud via le script `index.mjs`.
- Création du fichier `genesis.json` avec la configuration Clique (Proof of Authority).

**Utilisation :**

```powershell
# Depuis le dossier scripts
./besu_network.ps1
```

Assurez-vous que Docker est installé et en cours d'exécution.

---

## Script `index.mjs`

Ce script Node.js fournit plusieurs utilitaires pour la gestion des nœuds et l'interaction avec le réseau Besu. Il propose les commandes suivantes :

- `create-keys <ip>` : Génère une paire de clés (privée/publique), l'adresse Ethereum et l'enode pour un nœud donné, et les enregistre dans le dossier courant.
- `network-info [url]` : Affiche des informations sur le réseau (version, nombre de pairs) via l'API JSON-RPC (par défaut sur http://localhost:9090).
- `balance <address>` : Affiche le solde d'une adresse Ethereum sur le réseau local.
- `transfer <fromPrivate> <to> <amount>` : Effectue un transfert d'ETH entre deux comptes du réseau local.

**Utilisation :**

```bash
# Générer les clés pour un nœud
node index.mjs create-keys <ip>

# Obtenir des infos réseau
node index.mjs network-info [url]

# Consulter le solde d'une adresse
node index.mjs balance <address>

# Effectuer un transfert
node index.mjs transfer <fromPrivate> <to> <amount>
```

Remplacez `<ip>`, `<address>`, `<fromPrivate>`, `<to>`, `<amount>` par les valeurs appropriées.

---