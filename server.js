const express = require('express');
const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const storage = require('./src/services/storage');
const ai = require('./src/services/ai');
const chatRoutes = require('./src/routes/chat');
const groupRoutes = require('./src/routes/group');
const uploadRoutes = require('./src/routes/upload');
const ws = require('./src/websocket');

const app = express();
const server = http.createServer(app);

// Simple request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    if (req.path.startsWith('/api/')) console.log(`${req.method} ${req.path} ${res.statusCode} ${ms}ms`);
  });
  next();
});

// Init AI
const apiKey = process.env.DEEPSEEK_API_KEY || process.env.DASHSCOPE_API_KEY;
if (!apiKey) console.warn('⚠ No API key found — set DEEPSEEK_API_KEY in .env');
ai.init(apiKey);

// Static
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '12mb' }));

// Routes
app.use('/api', chatRoutes);
app.use('/api', groupRoutes);
app.use('/api', uploadRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  res.status(500).json({ error: '服务器内部错误', detail: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

// WebSocket
ws.init(server);

// Home
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Start
const PORT = process.env.PORT || 3000;
storage.init().then(() => {
  require('./src/services/seed').seedQuotes();
  require('./src/services/seed').seedEvents();
  require('./src/services/seed').seedLore();
  server.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`));
});
