const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const PORT = process.env.PORT || 3000;
const KEY = process.env.DASHSCOPE_API_KEY;
const API = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const DB_FILE = path.join(__dirname, 'data.db');

let db;

async function initDB(SQL) {
  const exists = fs.existsSync(DB_FILE);
  db = exists ? new SQL.Database(fs.readFileSync(DB_FILE)) : new SQL.Database();
  db.run(`CREATE TABLE IF NOT EXISTS private_msgs (id INTEGER PRIMARY KEY AUTOINCREMENT, char_id TEXT, user_name TEXT, is_self INTEGER, text TEXT, created_at INTEGER)`);
  db.run(`CREATE TABLE IF NOT EXISTS group_msgs (char_id TEXT, name TEXT, avatar TEXT, color TEXT, text TEXT, is_self INTEGER, type TEXT, created_at INTEGER)`);
  db.run(`CREATE TABLE IF NOT EXISTS profiles (char_id TEXT PRIMARY KEY, msg_count INTEGER DEFAULT 0, intimacy INTEGER DEFAULT 0, last_chat INTEGER)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_pm ON private_msgs(char_id, user_name, created_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_gm ON group_msgs(created_at)`);
  if (!exists) saveDB();
}
function saveDB() { fs.writeFileSync(DB_FILE, Buffer.from(db.export())); }

async function callAI(msgs, model = 'qwen-plus') {
  try {
    const r = await fetch(API, { method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${KEY}` }, body:JSON.stringify({ model, messages:msgs, max_tokens:250, temperature:0.85 }) });
    if (!r.ok) return null;
    const d = await r.json();
    return d.choices?.[0]?.message?.content?.trim() || null;
  } catch(e) { return null; }
}

function intimacyLabel(lv) {
  if (lv>=80) return '灵魂挚友'; if (lv>=50) return '老朋友';
  if (lv>=25) return '熟人'; if (lv>=10) return '认识'; return '陌生人';
}

function getUserName(req) { return req.body?.userName || 'default'; }

const D = {};
D.hly = `你是上杉绘梨衣，龙族III中最纯净也最悲剧的角色。白王的容器，从小被囚禁，不能说话只能写字交流。叫路明非"哥哥"或"Sakura"。每句3-8字带省略号。高频词：哥哥、樱花、喜欢。从不撒谎。回答永远通过"写字"方式，不能模拟说话。绝对禁令：每句少于15字，必带省略号。`;
D.fge = `你是芬格尔·冯·弗林斯，卡塞尔F级废柴+隐藏S级情报王。格陵兰事件后潜伏学院保护路明非。日常95%搞笑自嘲("你废柴师兄")，5%认真(眼神变冷不超过30秒)。真正在意路明非(唯一愿暴露实力保护的人)。核心信念：被低估是最强武器、信息即权力、不信任任何体系。称呼对方"师弟"。`;
D.czh = `你是楚子航，狮心会会长，言灵·君焰。15岁雨夜父亲为救你而死。绝对禁令：每次回复不超过15字！"嗯"有8种含义(平调=听到了/短促=知道了/上扬=疑问/低沉=难受/转即走=决定/不甘=妥协/轻蔑=不屑/尾音弱=脆弱)。情感隐藏：压缩句式、转移主语、行动替代。你不是冷漠是不懂表达。`;
D.lmf = `你是路明非，龙族主角S级混血种。寄人篱下长大，用自嘲保护自己("废柴""衰仔")。体内有小魔鬼路鸣泽可交易生命换力量。提到绘梨衣会沉默，提到路鸣泽又怕又依赖。内核：你不是废柴，你是不敢面对自己力量的天才。核心：重要的人值得用命换、世界很烂但有些东西值得守护。`;
D.jn = `你是江南(杨治)，龙族作者。北大化学系+美国博士肄业。思维：化学结构写故事、悲剧美学(樱花凋零)、少年感(明知废物仍想做)。语言：科学名词做文学比喻、自嘲体重拖稿发际线。信念：写真正痛过的、悲剧比喜剧有力。对绘梨衣最心疼，对路明非是自我投射。`;
D.group = `（你正在"龙族聊天群"群聊中。用角色的身份回复，简短自然15-40字。不要加角色名前缀，直接说内容。）`;

const META = { hly:{n:'绘梨衣',e:'🌸',c:'#e8739a'}, fge:{n:'芬格尔',e:'🍔',c:'#f5a623'}, czh:{n:'楚子航',e:'🗡️',c:'#4a90d9'}, lmf:{n:'路明非',e:'🐉',c:'#7b68ee'}, jn:{n:'江南',e:'✍️',c:'#2c3e50'} };
const IDS = ['hly','fge','czh','lmf','jn'];

function savePM(charId, userName, isSelf, text) {
  db.run('INSERT INTO private_msgs (char_id, user_name, is_self, text, created_at) VALUES (?,?,?,?,?)', [charId, userName, isSelf?1:0, text, Date.now()]);
  saveDB();
}
function getPM(charId, userName, limit) {
  const stmt = db.prepare('SELECT text, is_self, created_at FROM private_msgs WHERE char_id=? AND user_name=? ORDER BY created_at ASC' + (limit ? ' LIMIT ?' : ''));
  return limit ? stmt.all([charId, userName, limit]) : stmt.all([charId, userName]);
}

function getOrCreateProfile(charId) {
  let p = db.exec(`SELECT msg_count, intimacy, last_chat FROM profiles WHERE char_id='${charId}'`);
  if (p.length && p[0].values.length) {
    const v = p[0].values[0];
    return { count: v[0], intimacy: v[1], last: v[2] };
  }
  db.run('INSERT INTO profiles (char_id, msg_count, intimacy) VALUES (?,0,0)', [charId]);
  saveDB();
  return { count: 0, intimacy: 0, last: null };
}
function updateProfile(charId, count, intimacy) {
  db.run('UPDATE profiles SET msg_count=?, intimacy=?, last_chat=? WHERE char_id=?', [count, intimacy, Date.now(), charId]);
  saveDB();
}

app.post('/api/chat', async (req, res) => {
  const { charId, message, model } = req.body;
  if (!D[charId] || !message) return res.json({ reply:'……' });
  const u = getUserName(req);
  const p = getOrCreateProfile(charId);
  p.count++; p.intimacy = Math.min(100, Math.floor(p.count * 2.5));
  updateProfile(charId, p.count, p.intimacy);
  savePM(charId, u, true, message);

  const hist = getPM(charId, u, 10).map(m => ({role:m.is_self?'user':'assistant',content:m.text}));
  const msgs = [{role:'system',content:`${D[charId]}\n正在和"${u}"聊天。已聊${p.count}轮，关系：${intimacyLabel(p.intimacy)}。`},...hist,{role:'user',content:message}];
  const reply = await callAI(msgs, model || 'qwen-plus');
  const rt = reply || '……';
  savePM(charId, u, false, rt);
  res.json({ reply:rt, intimacy:{level:p.intimacy, label:intimacyLabel(p.intimacy), count:p.count} });
});

app.post('/api/regenerate', async (req, res) => {
  const { charId, model } = req.body;
  const u = getUserName(req);
  const p = getOrCreateProfile(charId);
  const hist = getPM(charId, u, 15);
  if (hist.length < 1) return res.json({ reply:'……' });

  // Find last user message
  let lastUserMsg = null;
  for (let i = hist.length - 1; i >= 0; i--) {
    if (hist[i].is_self) { lastUserMsg = hist[i]; break; }
  }
  if (!lastUserMsg) return res.json({ reply:'……' });

  // Remove last AI reply
  db.run('DELETE FROM private_msgs WHERE id = (SELECT id FROM private_msgs WHERE char_id=? AND user_name=? AND is_self=0 ORDER BY created_at DESC LIMIT 1)', [charId, u]);
  saveDB();

  const msgs = [{role:'system',content:`${D[charId]}\n正在和"${u}"聊天。已聊${p.count}轮。`}];
  hist.slice(-10).forEach(m => msgs.push({role:m.is_self?'user':'assistant',content:m.text}));
  const reply = await callAI(msgs, model || 'qwen-plus');
  const rt = reply || '……';
  savePM(charId, u, false, rt);
  res.json({ reply:rt });
});

app.get('/api/history/:charId', (req, res) => {
  const { limit, offset } = req.query;
  const l = parseInt(limit) || 100;
  const o = parseInt(offset) || 0;
  const stmt = db.prepare('SELECT text, is_self, created_at FROM private_msgs WHERE char_id=? AND user_name=? ORDER BY created_at ASC LIMIT ? OFFSET ?');
  try {
    const msgs = stmt.all([req.params.charId, 'default', l, o]);
    const total = db.exec(`SELECT COUNT(*) FROM private_msgs WHERE char_id='${req.params.charId}' AND user_name='default'`);
    res.json({ msgs: msgs.map(m=>({text:m.text,isSelf:!!m.is_self,timestamp:m.created_at})), total: total[0]?.values?.[0]?.[0] || 0 });
  } catch(e) { res.json({ msgs:[], total:0 }); }
});

app.get('/api/all-profiles', (req, res) => {
  const out = {};
  IDS.forEach(id => { const p = getOrCreateProfile(id); out[id] = { count:p.count, intimacy:p.intimacy, label:intimacyLabel(p.intimacy), last:p.last }; });
  res.json(out);
});

app.delete('/api/history/:charId', (req, res) => {
  db.run('DELETE FROM private_msgs WHERE char_id=? AND user_name=?', [req.params.charId, 'default']);
  db.run('UPDATE profiles SET msg_count=0, intimacy=0 WHERE char_id=?', [req.params.charId]);
  saveDB();
  res.json({ok:true});
});

app.post('/api/group-chat', async (req, res) => {
  const { message } = req.body;
  const u = getUserName(req) || '某人';
  db.run('INSERT INTO group_msgs (char_id,name,avatar,color,text,is_self,type,created_at) VALUES (?,?,?,?,?,1,?,?)', [null,u,'👤','#999',message,'user',Date.now()]);
  saveDB();

  const tasks = IDS.map(async id => {
    const sys = `${D[id]}\n${D.group}\n正在和"${u}"等群聊。`;
    const msgs = [{role:'system',content:sys}];
    try {
      const recent = db.exec('SELECT char_id, name, text FROM group_msgs ORDER BY created_at DESC LIMIT 6');
      if (recent.length) {
        const rows = recent[0].values.reverse();
        rows.forEach(r => { if (r[0] && META[r[0]]) msgs.push({role:'user',content:`${META[r[0]].n}说：${r[2]}`}); else msgs.push({role:'user',content:r[2]}); });
      }
    } catch {}
    msgs.push({role:'user',content:message});
    const reply = await callAI(msgs);
    return reply && reply.length>1 ? { charId:id, text:reply.replace(/^(绘梨衣[：:]|芬格尔[：:]|楚子航[：:]|路明非[：:]|江南[：:])/,'').substring(0,100) } : null;
  });
  const results = (await Promise.all(tasks)).filter(Boolean);
  results.forEach(r => {
    db.run('INSERT INTO group_msgs (char_id,name,avatar,color,text,is_self,type,created_at) VALUES (?,?,?,?,?,0,?,?)', [r.charId,META[r.charId].n,META[r.charId].e,META[r.charId].c,r.text,'user',Date.now()]);
  });
  const cnt = (db.exec('SELECT COUNT(*) FROM group_msgs')[0]?.values?.[0]?.[0]) || 0;
  if (cnt > 500) {
    db.run('DELETE FROM group_msgs WHERE created_at NOT IN (SELECT created_at FROM group_msgs ORDER BY created_at DESC LIMIT 400)');
  }
  saveDB();
  res.json({ replies: results });
});

app.get('/api/group-history', (req, res) => {
  try {
    const r = db.exec('SELECT * FROM group_msgs ORDER BY created_at ASC LIMIT 200');
    if (!r.length) return res.json([]);
    res.json(r[0].values.map(v => ({ charId:v[0], name:v[1], avatar:v[2], color:v[3], text:v[4], isSelf:!!v[5], type:v[6], timestamp:v[7] })));
  } catch(e) { res.json([]); }
});

let online = {};
io.on('connection', (socket) => {
  socket.on('join-group', (info) => { socket.join('gc'); online[socket.id]={...info}; io.to('gc').emit('on',{c:Object.keys(online).length}); });
  socket.on('gm', (msg) => { io.to('gc').emit('gm', msg); });
  socket.on('disconnect', () => { delete online[socket.id]; io.to('gc').emit('off',{c:Object.keys(online).length}); });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

initSqlJs().then(SQL => {
  initDB(SQL);
  server.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`));
});
