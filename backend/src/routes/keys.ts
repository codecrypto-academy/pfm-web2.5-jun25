import { Router } from 'express';
import { KeyGenerator } from 'network-sdk';

export const keysRouter = Router();

// POST /api/keys/generate
keysRouter.post('/generate', async (req, res) => {
  try {
    const keys = KeyGenerator.generateKeys();
    res.json({ success: true, data: keys });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/keys/generate-with-enode
keysRouter.post('/generate-with-enode', async (req, res) => {
  try {
    const { ip, port } = req.body;
    
    if (!ip || !port) {
      return res.status(400).json({ 
        success: false, 
        error: 'IP and port are required' 
      });
    }

    const keys = KeyGenerator.generateKeysWithEnode(ip, port);
    res.json({ success: true, data: keys });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/keys/save
keysRouter.post('/save', async (req, res) => {
  try {
    const { keys, directory } = req.body;
    
    if (!keys || !directory) {
      return res.status(400).json({ 
        success: false, 
        error: 'Keys and directory are required' 
      });
    }

    await KeyGenerator.saveKeys(keys, directory);
    res.json({ success: true, message: 'Keys saved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
