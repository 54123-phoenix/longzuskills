const express = require('express');
const http = require('http');
const path = require('path');
require('dotenv').config();

const storage = require('./src/services/storage');
const ai = require('./src/services/ai');
const chatRoutes = require('./src/routes/chat');
const groupRoutes = require('./src/routes/group');
const ws = require('./src/websocket');

const app = express();
const server = http.createServer(app);

// Init AI
ai.init(process.env.DASHSCOPE_API_KEY);

// Static
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Routes
app.use('/api', chatRoutes);
app.use('/api', groupRoutes);

// WebSocket
ws.init(server);

// Home
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Start
const PORT = process.env.PORT || 3000;
storage.init().then(() => {
  server.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`));
});
