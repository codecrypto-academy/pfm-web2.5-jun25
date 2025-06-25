import express from 'express';
import cors from 'cors';
import { networkRouter } from './routes/network.js';
import { keysRouter } from './routes/keys.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/network', networkRouter);
app.use('/api/keys', keysRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 Network API: http://localhost:${PORT}/api/network`);
  console.log(`🔑 Keys API: http://localhost:${PORT}/api/keys`);
});

export default app;
