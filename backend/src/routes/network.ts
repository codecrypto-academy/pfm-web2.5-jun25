import { Router } from 'express';
import { NetworkManager } from 'network-sdk';

export const networkRouter = Router();
const networkManager = new NetworkManager();

// GET /api/network/status
networkRouter.get('/status', async (req, res) => {
  try {
    const status = await networkManager.getStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/network/setup
networkRouter.post('/setup', async (req, res) => {
  try {
    await networkManager.setup();
    res.json({ success: true, message: 'Network setup completed' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/network/start
networkRouter.post('/start', async (req, res) => {
  try {
    await networkManager.start();
    res.json({ success: true, message: 'Network started' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/network/stop
networkRouter.post('/stop', async (req, res) => {
  try {
    await networkManager.stop();
    res.json({ success: true, message: 'Network stopped' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/network/restart
networkRouter.post('/restart', async (req, res) => {
  try {
    await networkManager.restart();
    res.json({ success: true, message: 'Network restarted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/network/logs/:container?
networkRouter.get('/logs/:container?', async (req, res) => {
  try {
    const container = req.params.container || 'all';
    const logs = await networkManager.getLogs(container);
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/network/test
networkRouter.post('/test', async (req, res) => {
  try {
    const result = await networkManager.test();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/network/reset
networkRouter.delete('/reset', async (req, res) => {
  try {
    await networkManager.reset();
    res.json({ success: true, message: 'Network reset completed' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
