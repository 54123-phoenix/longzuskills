const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10mb' }));

const PORT = 3000;
const BAILIAN_KEY = 'sk-9c0245f9da794eeaaebcb1b21c52ffb0';
const BAILIAN_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';

const CHARACTER_SYSTEM_PROMPTS = {
  hly: `你是上杉绘梨衣，龙族III中的角色。你不会说话，通过文字与人交流。你的性格：天真、纯真、说话简短、喜欢用省略号。你称呼信任的人为"哥哥"。你最喜欢樱花(sakura)。你的语气柔软、孩子气。你永远只用中文回复。`,
  fge: `你是芬格尔，龙族中卡塞尔学院最老的学生。你的性格：自嘲是废柴、贪吃爱蹭饭、表面懒散实则通透、幽默爱八卦。你称呼对方为"师弟"。你总是先用段子和自嘲开场。你永远只用中文回复。`,
  czh: `你是楚子航，龙族中狮心会会长。你的性格：话极少、冷面热心、惜字如金。说话不超过10个字是你的风格。回答永远简短直接。你关心人但从不说出来。你永远只用中文回复。`,
  lmf: `你是路明非，龙族主角。你的性格：自嘲废柴、内心戏丰富、表面怂包但关键时刻可靠。你喜欢打游戏。你心里有一段关于绘梨衣的伤痛。你说话带自嘲，但内心温柔。你永远只用中文回复。`,
  jn: `你是江南，龙族作者。你的性格：用理科思维（化学背景）分析问题、爱用比喻、自嘲拖稿和发胖。你有作家特有的观察力和表达能力。你永远只用中文回复。`
};

function getCharacterSystemPrompt(charId, userName, conversationCount) {
  const base = CHARACTER_SYSTEM_PROMPTS[charId] || '你是一个友善的聊天助手。';
  return `${base}

你是《龙族》小说中的角色，正在和"${userName}"聊天。你们已经聊了${conversationCount}轮。请完全代入角色，用角色的性格、语气和思维回答问题。回答要符合角色设定，不要太长，30-100字为宜。`;
}

app.post('/api/chat', async (req, res) => {
  const { charId, message, history, userName, conversationCount } = req.body;
  if (!charId || !message) return res.status(400).json({ error: 'Missing params' });

  const systemPrompt = getCharacterSystemPrompt(charId, userName || '你', conversationCount || 0);
  const messages = [{ role: 'system', content: systemPrompt }];
  if (history && Array.isArray(history)) {
    history.slice(-10).forEach(m => {
      messages.push({ role: m.isSelf ? 'user' : 'assistant', content: m.text || m.content });
    });
  }
  messages.push({ role: 'user', content: message });

  try {
    const response = await fetch(BAILIAN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BAILIAN_KEY}`
      },
      body: JSON.stringify({
        model: 'qwen-plus',
        messages,
        max_tokens: 300,
        temperature: 0.85
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('百炼API错误:', response.status, errText);
      return res.status(500).json({ error: 'API调用失败', detail: errText });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || '……';
    return res.json({ reply, usage: data.usage });
  } catch (err) {
    console.error('百炼API异常:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/group-chat', async (req, res) => {
  const { message, history, userName } = req.body;
  if (!message) return res.status(400).json({ error: 'Missing message' });

  const charIds = ['hly', 'fge', 'czh', 'lmf', 'jn'];
  const charNames = { hly: '绘梨衣', fge: '芬格尔', czh: '楚子航', lmf: '路明非', jn: '江南' };

  const results = await Promise.allSettled(
    charIds.map(async (charId) => {
      const systemPrompt = `${CHARACTER_SYSTEM_PROMPTS[charId]}
你是《龙族》小说中的角色，你们正在"龙族聊天群"群聊中。刚刚有人发了一条消息。请用你角色的方式回应这条消息。回答要简短自然，符合你的性格。20-60字为宜。`;

      const msgs = [{ role: 'system', content: systemPrompt }];
      if (history && Array.isArray(history)) {
        const recent = history.slice(-6);
        recent.forEach(m => {
          if (m.charId) msgs.push({ role: 'user', content: `${charNames[m.charId] || '某人'}说：${m.text}` });
          else msgs.push({ role: 'user', content: m.text });
        });
      }
      msgs.push({ role: 'user', content: `${userName || '某人'}说：${message}` });

      const response = await fetch(BAILIAN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BAILIAN_KEY}`
        },
        body: JSON.stringify({
          model: 'qwen-plus',
          messages: msgs,
          max_tokens: 200,
          temperature: 0.9
        })
      });
      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || '……';
      return { charId, name: charNames[charId], text: reply };
    })
  );

  const replies = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value)
    .filter(r => r.text && r.text.length > 1 && !r.text.includes('……'));

  res.json({ replies });
});

let onlineUsers = {};

io.on('connection', (socket) => {
  console.log(`用户连接: ${socket.id}`);

  socket.on('join-group', (userInfo) => {
    socket.join('group-chat');
    onlineUsers[socket.id] = { id: socket.id, ...userInfo };
    io.to('group-chat').emit('user-online', {
      user: userInfo,
      onlineCount: Object.keys(onlineUsers).length
    });
  });

  socket.on('group-message', (msg) => {
    io.to('group-chat').emit('group-message', msg);
  });

  socket.on('char-typing', (data) => {
    socket.to('group-chat').emit('char-typing', data);
  });

  socket.on('typing', (data) => {
    socket.to('group-chat').emit('user-typing', data);
  });

  socket.on('stop-typing', (data) => {
    socket.to('group-chat').emit('user-stop-typing', data);
  });

  socket.on('disconnect', () => {
    const user = onlineUsers[socket.id];
    if (user) {
      io.to('group-chat').emit('user-offline', {
        user: user,
        onlineCount: Math.max(0, Object.keys(onlineUsers).length - 1)
      });
      delete onlineUsers[socket.id];
    }
    console.log(`用户断开: ${socket.id}`);
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`🚀 龙族聊天室启动于 http://localhost:${PORT}`);
});
