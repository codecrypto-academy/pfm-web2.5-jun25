import { Network, Node } from "./types";
import { MongoClient, ObjectId } from "mongodb";

// Load environment variables
import 'dotenv/config';

// MongoDB connection
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB || 'redesBesu';

// MongoDB client
let client: MongoClient | null = null;

// Get MongoDB client
async function getClient() {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }
  return client;
}

// Get database
async function getDb() {
  const client = await getClient();
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
        nodes: [], // Will be populated when needed
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
    
    // Get nodes for this network
    const nodesCollection = db.collection('nodes');
    const nodes = await nodesCollection.find({ networkId: id }).toArray();
    const mappedNodes = nodes.map(node => {
      const mappedNode = mapIdToDocument(node);
      return {
        ...mappedNode,
        networkId: mappedNode.networkId || '',
        name: mappedNode.name || '',
        type: mappedNode.type || 'rpc',
        ip: mappedNode.ip || '',
        port: mappedNode.port || 0,
        createdAt: new Date(mappedNode.createdAt),
        updatedAt: new Date(mappedNode.updatedAt),
      } as Node;
    });
    
    return {
      ...mappedNetwork,
      name: mappedNetwork.name || '',
      chainId: mappedNetwork.chainId || 0,
      signerAddress: mappedNetwork.signerAddress || '',
      accounts: mappedNetwork.accounts || [],
      createdAt: new Date(mappedNetwork.createdAt),
      updatedAt: new Date(mappedNetwork.updatedAt),
      nodes: mappedNodes,
    } as Network;
  } catch (error) {
    console.error('Error fetching network by ID:', error);
    return null;
  }
};

export const createNetwork = async (data: Omit<Network, "id" | "createdAt" | "updatedAt" | "nodes">): Promise<Network> => {
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
      nodes: [],
    };
  } catch (error) {
    console.error('Error creating network:', error);
    throw error;
  }
};

export const updateNetwork = async (id: string, data: Partial<Omit<Network, "id" | "createdAt" | "updatedAt" | "nodes">>): Promise<Network | null> => {
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
    const nodesCollection = db.collection('nodes');
    
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      return false; // Invalid ObjectId format
    }
    
    // Delete the network
    const result = await networksCollection.deleteOne({ _id: objectId });
    
    // Delete all nodes associated with this network
    await nodesCollection.deleteMany({ networkId: id });
    
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting network:', error);
    return false;
  }
};

// Node CRUD operations
export const getNodes = async (networkId?: string): Promise<Node[]> => {
  try {
    const db = await getDb();
    const nodesCollection = db.collection('nodes');
    
    const query = networkId ? { networkId } : {};
    const nodes = await nodesCollection.find(query).toArray();
    
    // Map MongoDB _id to id for frontend
    return nodes.map(node => {
      const mappedNode = mapIdToDocument(node);
      return {
        ...mappedNode,
        networkId: mappedNode.networkId || '',
        name: mappedNode.name || '',
        type: mappedNode.type || 'rpc',
        ip: mappedNode.ip || '',
        port: mappedNode.port || 0,
        createdAt: new Date(mappedNode.createdAt),
        updatedAt: new Date(mappedNode.updatedAt),
      } as Node;
    });
  } catch (error) {
    console.error('Error fetching nodes:', error);
    return [];
  }
};

export const getNodeById = async (id: string): Promise<Node | null> => {
  try {
    const db = await getDb();
    const nodesCollection = db.collection('nodes');
    
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      return null; // Invalid ObjectId format
    }
    
    const node = await nodesCollection.findOne({ _id: objectId });
    
    if (!node) return null;
    
    // Map MongoDB _id to id for frontend
    const mappedNode = mapIdToDocument(node);
    return {
      ...mappedNode,
      networkId: mappedNode.networkId || '',
      name: mappedNode.name || '',
      type: mappedNode.type || 'rpc',
      ip: mappedNode.ip || '',
      port: mappedNode.port || 0,
      createdAt: new Date(mappedNode.createdAt),
      updatedAt: new Date(mappedNode.updatedAt),
    } as Node;
  } catch (error) {
    console.error('Error fetching node by ID:', error);
    return null;
  }
};

export const createNode = async (data: Omit<Node, "id" | "createdAt" | "updatedAt">): Promise<Node> => {
  try {
    const db = await getDb();
    const nodesCollection = db.collection('nodes');
    
    const now = new Date();
    const nodeToInsert = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    
    const result = await nodesCollection.insertOne(nodeToInsert);
    
    return {
      ...data,
      id: result.insertedId.toString(),
      createdAt: now,
      updatedAt: now,
    } as Node;
  } catch (error) {
    console.error('Error creating node:', error);
    throw error;
  }
};

export const updateNode = async (id: string, data: Partial<Omit<Node, "id" | "createdAt" | "updatedAt">>): Promise<Node | null> => {
  try {
    const db = await getDb();
    const nodesCollection = db.collection('nodes');
    
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
    
    await nodesCollection.updateOne({ _id: objectId }, updateData);
    
    // Get the updated node
    return getNodeById(id);
  } catch (error) {
    console.error('Error updating node:', error);
    return null;
  }
};

export const deleteNode = async (id: string): Promise<boolean> => {
  try {
    const db = await getDb();
    const nodesCollection = db.collection('nodes');
    
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      return false; // Invalid ObjectId format
    }
    
    const result = await nodesCollection.deleteOne({ _id: objectId });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting node:', error);
    return false;
  }
};

// Initialize the database with sample data if empty
export const initializeDatabase = async (): Promise<void> => {
  try {
    const db = await getDb();
    const networksCollection = db.collection('networks');
    const nodesCollection = db.collection('nodes');
    
    // Check if we already have networks
    const networkCount = await networksCollection.countDocuments();
    
    if (networkCount === 0) {
      // Create a sample network
      const now = new Date();
      const networkData = {
        name: "Sample Besu Network",
        chainId: 1337,
        signerAddress: "0x8967BCF84170c91B0d24D4302C2376283b0B1E21",
        accounts: [
          {
            address: "0x8967BCF84170c91B0d24D4302C2376283b0B1E21",
            balance: "1000000000000000000000",
          },
          {
            address: "0x999B93C31101e9B8312eBC32f91B2B04052c5Fab",
            balance: "500000000000000000000",
          },
        ],
        createdAt: now,
        updatedAt: now,
      };
      
      const networkResult = await networksCollection.insertOne(networkData);
      const networkId = networkResult.insertedId.toString();
      
      // Create sample nodes
      const nodesData = [
        {
          networkId,
          name: "Miner Node 1",
          type: "miner",
          ip: "192.168.1.10",
          port: 8545,
          createdAt: now,
          updatedAt: now,
        },
        {
          networkId,
          name: "RPC Node 1",
          type: "rpc",
          ip: "192.168.1.11",
          port: 8546,
          createdAt: now,
          updatedAt: now,
        },
        {
          networkId,
          name: "Bootnode 1",
          type: "bootnode",
          ip: "192.168.1.12",
          port: 30303,
          createdAt: now,
          updatedAt: now,
        },
      ];
      
      await nodesCollection.insertMany(nodesData);
      
      console.log('Database initialized with sample data');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}; 