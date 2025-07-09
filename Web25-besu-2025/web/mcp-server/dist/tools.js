"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BESU_TOOLS = void 0;
// mcp-server/src/tools.ts
exports.BESU_TOOLS = [
    // Outil : Créer un réseau Besu
    {
        name: 'create_besu_network',
        description: 'Crée un réseau Hyperledger Besu complet avec nœuds, comptes et paramètres.',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Nom du réseau' },
                chainId: { type: 'number', description: 'ID de la chaîne' },
                subnet: { type: 'string', description: 'Sous-réseau (ex: 192.168.0.0/24)' },
                bootnodeIP: { type: 'string', description: 'Adresse IP du bootnode' },
                signerAccount: { type: 'string', description: 'Compte signataire' },
                listOfNodes: {
                    type: 'array',
                    description: 'Liste des nœuds à créer',
                    items: {
                        type: 'object',
                        properties: {
                            nodeType: { type: 'string', description: 'Type de nœud (miner, rpc, node)' },
                            ip: { type: 'string', description: 'Adresse IP du nœud' },
                            name: { type: 'string', description: 'Nom du nœud' },
                            port: { type: 'number', description: 'Port du nœud' }
                        },
                        required: ['nodeType', 'ip', 'name', 'port']
                    }
                },
                prefundedAccounts: {
                    type: 'array',
                    description: 'Comptes préfinancés',
                    items: {
                        type: 'object',
                        properties: {
                            address: { type: 'string', description: 'Adresse du compte' },
                            amount: { type: 'string', description: 'Montant à préfinancer' }
                        },
                        required: ['address', 'amount']
                    }
                },
                nbrNetwork: { type: 'number', description: 'Numéro du réseau (optionnel)' }
            },
            required: ['name', 'chainId', 'subnet', 'bootnodeIP', 'signerAccount', 'listOfNodes']
        }
    },
    // Outil : Supprimer un réseau Besu
    {
        name: 'remove_besu_network',
        description: 'Supprime un réseau Hyperledger Besu existant.',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Nom du réseau à supprimer' }
            },
            required: ['name']
        }
    },
    // Outil : Ajouter un nœud Besu
    {
        name: 'add_besu_node',
        description: 'Ajoute un nœud à un réseau Besu existant.',
        inputSchema: {
            type: 'object',
            properties: {
                networkName: { type: 'string', description: 'Nom du réseau' },
                nodeName: { type: 'string', description: 'Nom du nœud' },
                nodeType: { type: 'string', description: 'Type de nœud (bootnode, miner, rpc, node)' },
                port: { type: 'string', description: 'Port du nœud' },
                ip: { type: 'string', description: 'Adresse IP du nœud (optionnelle)' }
            },
            required: ['networkName', 'nodeName', 'nodeType', 'port']
        }
    },
    // Outil : Supprimer un nœud Besu
    {
        name: 'remove_besu_node',
        description: 'Supprime un nœud d’un réseau Besu existant.',
        inputSchema: {
            type: 'object',
            properties: {
                networkName: { type: 'string', description: 'Nom du réseau' },
                nodeName: { type: 'string', description: 'Nom du nœud à supprimer' }
            },
            required: ['networkName', 'nodeName']
        }
    },
    // Outil : Démarrer un réseau Besu
    {
        name: 'start_besu_network',
        description: 'Démarre un réseau Hyperledger Besu.',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Nom du réseau à démarrer' }
            },
            required: ['name']
        }
    },
    // Outil : Arrêter un réseau Besu
    {
        name: 'stop_besu_network',
        description: 'Arrête un réseau Hyperledger Besu.',
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Nom du réseau à arrêter' }
            },
            required: ['name']
        }
    },
    // Outil : Obtenir le solde d’une adresse sur un réseau Besu
    {
        name: 'get_besu_balance',
        description: 'Retourne le solde d\’une adresse sur un réseau Besu donné.',
        inputSchema: {
            type: 'object',
            properties: {
                networkName: { type: 'string', description: 'Nom du réseau' },
                address: { type: 'string', description: 'Adresse à interroger' }
            },
            required: ['networkName', 'address']
        }
    }
];
