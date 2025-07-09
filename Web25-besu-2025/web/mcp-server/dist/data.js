"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNetworkByName = exports.initializeDatabase = exports.deleteNode = exports.updateNode = exports.createNode = exports.getNodeById = exports.getNodes = exports.deleteNetwork = exports.updateNetwork = exports.createNetwork = exports.getNetworkById = exports.getNetworks = void 0;
const mongodb_1 = require("mongodb");
// Load environment variables
require("dotenv/config");
// MongoDB connection
const uri = process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/besuNetworks?authSource=admin';
const dbName = process.env.MONGODB_DB || 'besuNetworks';
// MongoDB client (singleton pattern for dev/hot-reload)
let globalWithMongo = global;
let clientPromise;
if (!globalWithMongo._mongoClientPromise) {
    const client = new mongodb_1.MongoClient(uri);
    globalWithMongo._mongoClientPromise = client.connect();
}
clientPromise = globalWithMongo._mongoClientPromise;
// Get database
async function getDb() {
    const client = await clientPromise;
    return client.db(dbName);
}
// Convert MongoDB _id to id for frontend
function mapIdToDocument(doc) {
    if (!doc)
        return doc;
    const { _id, ...rest } = doc;
    return {
        ...rest,
        id: _id?.toString() || rest.id || '',
    };
}
// Network CRUD operations
const getNetworks = async () => {
    try {
        const db = await getDb();
        const networksCollection = db.collection('networks');
        const networks = await networksCollection.find({}).toArray();
        // Map MongoDB _id to id for frontend
        return networks.map(network => {
            const mappedNetwork = mapIdToDocument(network);
            return {
                ...mappedNetwork,
                name: mappedNetwork.name || '',
                chainId: mappedNetwork.chainId || 0,
                signerAddress: mappedNetwork.signerAddress || '',
                accounts: mappedNetwork.accounts || [],
                createdAt: new Date(mappedNetwork.createdAt),
                updatedAt: new Date(mappedNetwork.updatedAt),
                nodes: mappedNetwork.nodes || [],
            };
        });
    }
    catch (error) {
        console.error('Error fetching networks:', error);
        return [];
    }
};
exports.getNetworks = getNetworks;
const getNetworkById = async (id) => {
    try {
        const db = await getDb();
        const networksCollection = db.collection('networks');
        let objectId;
        try {
            objectId = new mongodb_1.ObjectId(id);
        }
        catch {
            return null; // Invalid ObjectId format
        }
        const network = await networksCollection.findOne({ _id: objectId });
        if (!network)
            return null;
        // Map MongoDB _id to id for frontend
        const mappedNetwork = mapIdToDocument(network);
        return {
            ...mappedNetwork,
            name: mappedNetwork.name || '',
            chainId: mappedNetwork.chainId || 0,
            signerAddress: mappedNetwork.signerAddress || '',
            accounts: mappedNetwork.accounts || [],
            createdAt: new Date(mappedNetwork.createdAt),
            updatedAt: new Date(mappedNetwork.updatedAt),
            nodes: mappedNetwork.nodes || [],
        };
    }
    catch (error) {
        console.error('Error fetching network by ID:', error);
        return null;
    }
};
exports.getNetworkById = getNetworkById;
const createNetwork = async (data) => {
    try {
        const db = await getDb();
        const networksCollection = db.collection('networks');
        const now = new Date();
        const networkToInsert = {
            ...data,
            createdAt: now,
            updatedAt: now,
        };
        const result = await networksCollection.insertOne(networkToInsert);
        return {
            ...data,
            id: result.insertedId.toString(),
            createdAt: now,
            updatedAt: now,
        };
    }
    catch (error) {
        console.error('Error creating network:', error);
        throw error;
    }
};
exports.createNetwork = createNetwork;
const updateNetwork = async (id, data) => {
    try {
        const db = await getDb();
        const networksCollection = db.collection('networks');
        let objectId;
        try {
            objectId = new mongodb_1.ObjectId(id);
        }
        catch {
            return null; // Invalid ObjectId format
        }
        const now = new Date();
        const updateData = {
            $set: {
                ...data,
                updatedAt: now,
            },
        };
        await networksCollection.updateOne({ _id: objectId }, updateData);
        // Get the updated network
        return (0, exports.getNetworkById)(id);
    }
    catch (error) {
        console.error('Error updating network:', error);
        return null;
    }
};
exports.updateNetwork = updateNetwork;
const deleteNetwork = async (id) => {
    try {
        const db = await getDb();
        const networksCollection = db.collection('networks');
        let objectId;
        try {
            objectId = new mongodb_1.ObjectId(id);
        }
        catch {
            return false; // Invalid ObjectId format
        }
        // Delete the network
        const result = await networksCollection.deleteOne({ _id: objectId });
        return result.deletedCount > 0;
    }
    catch (error) {
        console.error('Error deleting network:', error);
        return false;
    }
};
exports.deleteNetwork = deleteNetwork;
// Node CRUD operations (in-place in networks collection)
const getNodes = async (networkId) => {
    const network = await (0, exports.getNetworkById)(networkId);
    return network?.nodes || [];
};
exports.getNodes = getNodes;
const getNodeById = async (networkId, nodeName) => {
    const nodes = await (0, exports.getNodes)(networkId);
    return nodes.find(n => n.name === nodeName) || null;
};
exports.getNodeById = getNodeById;
const createNode = async (networkId, node) => {
    const network = await (0, exports.getNetworkById)(networkId);
    if (!network)
        throw new Error('Network not found');
    const nodes = [...(network.nodes || []), node];
    await (0, exports.updateNetwork)(networkId, { nodes });
    return nodes;
};
exports.createNode = createNode;
const updateNode = async (networkId, nodeName, data) => {
    const network = await (0, exports.getNetworkById)(networkId);
    if (!network)
        return null;
    const nodes = (network.nodes || []).map(n => n.name === nodeName ? { ...n, ...data } : n);
    await (0, exports.updateNetwork)(networkId, { nodes });
    return nodes.find(n => n.name === nodeName) || null;
};
exports.updateNode = updateNode;
const deleteNode = async (networkId, nodeName) => {
    const network = await (0, exports.getNetworkById)(networkId);
    if (!network)
        return false;
    const nodes = (network.nodes || []).filter(n => n.name !== nodeName);
    await (0, exports.updateNetwork)(networkId, { nodes });
    return true;
};
exports.deleteNode = deleteNode;
// Initialize the database with sample data if empty
const initializeDatabase = async () => {
    try {
        const db = await getDb();
        const networksCollection = db.collection('networks');
        // Check if we already have networks
        const networkCount = await networksCollection.countDocuments();
        /* Sample Besu Network initialization
        if (networkCount === 0) {
          // Create a sample network
          const now = new Date();
          const networkData = {
            name: "Prueba Red Besu",
            chainId: 1337,
            signerAddress: "0x4F9d6Eafa67ae9F317AC6A67138727E13D80Fe98",
            accounts: [
              {
                address: "0x6243A64dd2E56F164E1f08e99433A7DEC132AB4E",
                balance: "100",
              },
              {
                address: "0xd69A7b47f4038BC831B8F22991Cf3A69DdC21574",
                balance: "250",
              },
            ],
            nodes: [
              {
                type: "rpc",
                ip: "10.0.0.11",
                name: "rpc18962",
                port: 18962,
              },
              {
                type: "miner",
                ip: "10.0.0.12",
                name: "miner18963",
                port: 18963,
              },
              {
                type: "node",
                ip: "10.0.0.13",
                name: "node18964",
                port: 18964,
              },
            ],
            createdAt: now,
            updatedAt: now,
          };
          
          await networksCollection.insertOne(networkData);
          
          console.log('Database initialized with sample data');
        }*/
    }
    catch (error) {
        console.error('Error initializing database:', error);
    }
};
exports.initializeDatabase = initializeDatabase;
// Network CRUD operations
const getNetworkByName = async (name) => {
    try {
        const db = await getDb();
        const networksCollection = db.collection('networks');
        const network = await networksCollection.findOne({ name });
        if (!network)
            return null;
        // Map MongoDB _id to id for frontend
        const mappedNetwork = mapIdToDocument(network);
        return {
            ...mappedNetwork,
            name: mappedNetwork.name || '',
            chainId: mappedNetwork.chainId || 0,
            signerAddress: mappedNetwork.signerAddress || '',
            accounts: mappedNetwork.accounts || [],
            createdAt: new Date(mappedNetwork.createdAt),
            updatedAt: new Date(mappedNetwork.updatedAt),
            nodes: mappedNetwork.nodes || [],
        };
    }
    catch (error) {
        console.error('Error fetching network by name:', error);
        return null;
    }
};
exports.getNetworkByName = getNetworkByName;
