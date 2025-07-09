import { Network, Node } from "./types";
import { MongoClient, ObjectId } from "mongodb";

// Load environment variables
import 'dotenv/config';

// MongoDB connection
const uri = process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/besuNetworks?authSource=admin';
const dbName = process.env.MONGODB_DB || 'besuNetworks';

// MongoDB client (singleton pattern for dev/hot-reload)
let globalWithMongo = global as typeof globalThis & { _mongoClientPromise?: Promise<MongoClient> };
let clientPromise: Promise<MongoClient>;

if (!globalWithMongo._mongoClientPromise) {
  const client = new MongoClient(uri);
  globalWithMongo._mongoClientPromise = client.connect();
}
clientPromise = globalWithMongo._mongoClientPromise;

// Get database
async function getDb() {
  const client = await clientPromise;
  return client.db(dbName);
}

// Convert MongoDB _id to id for frontend
function mapIdToDocument<T extends { _id?: ObjectId; id?: string }>(doc: T): Omit<T, '_id'> & { id: string } {
  if (!doc) return doc as Omit<T, '_id'> & { id: string };
  
  const { _id, ...rest } = doc;
  return {
    ...rest,
    id: _id?.toString() || rest.id || '',
  } as Omit<T, '_id'> & { id: string };
}

// Network CRUD operations
export const getNetworks = async (): Promise<Network[]> => {
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
      } as Network;
    });
  } catch (error) {
    console.error('Error fetching networks:', error);
    return [];
  }
};

export const getNetworkById = async (id: string): Promise<Network | null> => {
  try {
    const db = await getDb();
    const networksCollection = db.collection('networks');
    
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      return null; // Invalid ObjectId format
    }
    
    const network = await networksCollection.findOne({ _id: objectId });
    
    if (!network) return null;
    
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
    } as Network;
  } catch (error) {
    console.error('Error fetching network by ID:', error);
    return null;
  }
};

export const createNetwork = async (data: Omit<Network, "id" | "createdAt" | "updatedAt">): Promise<Network> => {
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
  } catch (error) {
    console.error('Error creating network:', error);
    throw error;
  }
};

export const updateNetwork = async (id: string, data: Partial<Omit<Network, "id" | "createdAt" | "updatedAt">>): Promise<Network | null> => {
  try {
    const db = await getDb();
    const networksCollection = db.collection('networks');
    
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch {
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
    return getNetworkById(id);
  } catch (error) {
    console.error('Error updating network:', error);
    return null;
  }
};

export const deleteNetwork = async (id: string): Promise<boolean> => {
  try {
    const db = await getDb();
    const networksCollection = db.collection('networks');
    
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      return false; // Invalid ObjectId format
    }
    
    // Delete the network
    const result = await networksCollection.deleteOne({ _id: objectId });
    
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting network:', error);
    return false;
  }
};

// Node CRUD operations (in-place in networks collection)
export const getNodes = async (networkId: string): Promise<Node[]> => {
  const network = await getNetworkById(networkId);
  return network?.nodes || [];
};

export const getNodeById = async (networkId: string, nodeName: string): Promise<Node | null> => {
  const nodes = await getNodes(networkId);
  return nodes.find(n => n.name === nodeName) || null;
};

export const createNode = async (networkId: string, node: Node): Promise<Node[]> => {
  const network = await getNetworkById(networkId);
  if (!network) throw new Error('Network not found');
  const nodes = [...(network.nodes || []), node];
  await updateNetwork(networkId, { nodes });
  return nodes;
};

export const updateNode = async (networkId: string, nodeName: string, data: Partial<Node>): Promise<Node | null> => {
  const network = await getNetworkById(networkId);
  if (!network) return null;
  const nodes = (network.nodes || []).map(n => n.name === nodeName ? { ...n, ...data } : n);
  await updateNetwork(networkId, { nodes });
  return nodes.find(n => n.name === nodeName) || null;
};

export const deleteNode = async (networkId: string, nodeName: string): Promise<boolean> => {
  const network = await getNetworkById(networkId);
  if (!network) return false;
  const nodes = (network.nodes || []).filter(n => n.name !== nodeName);
  await updateNetwork(networkId, { nodes });
  return true;
};

// Initialize the database with sample data if empty
export const initializeDatabase = async (): Promise<void> => {
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
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

// Network CRUD operations
export const getNetworkByName = async (name: string): Promise<Network | null> => {
  try {
    const db = await getDb();
    const networksCollection = db.collection('networks');
    
    const network = await networksCollection.findOne({ name });
    
    if (!network) return null;
    
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
    } as Network;
  } catch (error) {
    console.error('Error fetching network by name:', error);
    return null;
  }
};