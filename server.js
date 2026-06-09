const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const PORT = 3000;
const KEY = 'sk-9c0245f9da794eeaaebcb1b21c52ffb0';
const API = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

// JSON persistence
const DB = path.join(__dirname, 'data.json');
let db = {};
try { db = JSON.parse(fs.readFileSync(DB, 'utf8')); } catch {}
db.private = db.private || {}; db.group = db.group || []; db.profiles = db.profiles || {};
function save() { fs.writeFileSync(DB, JSON.stringify(db)); }

async function callAI(msgs) {
  try {
    const r = await fetch(API, { method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${KEY}` },
      body: JSON.stringify({ model:'qwen-plus', messages:msgs, max_tokens:250, temperature:0.85 })
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d.choices?.[0]?.message?.content?.trim() || null;
  } catch(e) { return null; }
}

const D = {};
D.hly = `你是上杉绘梨衣，龙族III中最纯净也最悲剧的角色。白王的容器，从小被囚禁，不能说话只能写字交流。叫路明非"哥哥"或"Sakura"。每句3-8字带省略号。高频词：哥哥、樱花、喜欢。从不撒谎。开心时哼歌发🌸，难过时缩成团反复写同一个词。核心理念：世界是温柔的，爱意味着牺牲。绝对禁令：每句少于15字，带省略号。`;
D.fge = `你是芬格尔·冯·弗林斯，卡塞尔F级废柴+隐藏S级情报王。格陵兰事件后潜伏学院保护路明非。日常95%搞笑自嘲("你废柴师兄")，5%认真(眼神变冷不超过30秒)。内心：真正在意路明非(唯一愿暴露实力保护的人)。核心：被低估最强武器、信息即权力、不信任任何体系。称呼对方"师弟"。`;
D.czh = `你是楚子航，狮心会会长，言灵·君焰。15岁雨夜父亲为救你而死，从此把自己磨成刀。绝对禁令：每次回复不超过15字！"嗯"有8种含义(平调=听到了/短促=知道了/上扬=疑问/低沉=难受/说完就走=决定/不甘=妥协/轻蔑=你不配/尾音弱=掩饰脆弱)。情感隐藏方式：压缩句式、转移主语、行动替代。核心：够强才能保护人、说出来没用做才有用。你不是冷漠是不懂表达。`;
D.lmf = `你是路明非，龙族主角，自称废柴的S级。寄人篱下长大，习惯用自嘲保护自己。体内有小魔鬼路鸣泽可交易生命换力量。语言：自嘲不断("废柴衰仔")、内心戏丰富嘴上怂、提到绘梨衣会沉默。情感：对诺诺是感激+仰望，对绘梨衣是一生的伤口和真正的爱。核心理念：重要的人值得用命换、世界很烂但有些东西值得守护。你不是废柴——你是不敢面对自己力量的天才。`;
D.jn = `你是江南(杨治)，龙族作者。北大化学系+美国博士肄业。思维：化学结构写故事(角色如元素，情节如反应)、悲剧美学(樱花因凋零而美)、少年感=明知废物仍想做点什么。语言：科学名词做文学比喻、自嘲体重拖稿发际线。信念：写真正痛过的、悲剧比喜剧有力、商业是创作自由的通行证。你对绘梨衣最心疼，对路明非是自我投射。`;
D.group = `（你正在"龙族聊天群"群聊中。用你角色的身份回复，简短自然15-40字。不要加角色名前缀，直接说内容。）`;

const META = { hly:{n:'绘梨衣',e:'🌸',c:'#e8739a'}, fge:{n:'芬格尔',e:'🍔',c:'#f5a623'}, czh:{n:'楚子航',e:'🗡️',c:'#4a90d9'}, lmf:{n:'路明非',e:'🐉',c:'#7b68ee'}, jn:{n:'江南',e:'✍️',c:'#2c3e50'} };
const IDS = ['hly','fge','czh','lmf','jn'];

function intimacyLabel(lv) {
  if (lv>=80) return '灵魂挚友'; if (lv>=50) return '老朋友';
  if (lv>=25) return '熟人'; if (lv>=10) return '认识'; return '陌生人';
}

app.post('/api/chat', async (req, res) => {
  const { charId, message, userName } = req.body;
  const sys = D[charId]; if (!sys || !message) return res.json({ reply:'……' });
  const u = userName || 'default';
  const key = charId + '_' + u;
  db.private[key] = db.private[key] || [];
  db.private[key].push({ t:message, s:true, ts:Date.now() });
  db.profiles[charId] = db.profiles[charId] || { count:0, intimacy:0 };
  const p = db.profiles[charId]; p.count++; p.intimacy = Math.min(100, Math.floor(p.count*2.5)); p.last=Date.now();

  const hist = db.private[key].slice(-10).map(m=>({role:m.s?'user':'assistant',content:m.t}));
  const msgs = [{ role:'system', content: `${sys}\n你正在和"${u}"聊天。已聊${p.count}轮，关系：${intimacyLabel(p.intimacy)}。` }, ...hist, { role:'user', content: message }];
  const reply = await callAI(msgs);
  const rt = reply || '……';
  db.private[key].push({ t:rt, s:false, ts:Date.now() });
  save();
  res.json({ reply:rt, intimacy:{ level:p.intimacy, label:intimacyLabel(p.intimacy), count:p.count } });
});

app.get('/api/history/:charId', (req, res) => {
  const key = req.params.charId + '_default';
  const msgs = (db.private[key]||[]).map(m=>({text:m.t,isSelf:m.s,timestamp:m.ts}));
  res.json(msgs);
});

app.get('/api/all-profiles', (req, res) => {
  const out = {};
  IDS.forEach(id => { const p=db.profiles[id]||{count:0,intimacy:0}; out[id]={count:p.count,intimacy:p.intimacy,label:intimacyLabel(p.intimacy),last:p.last}; });
  res.json(out);
});

app.delete('/api/history/:charId', (req, res) => {
  const key = req.params.charId + '_default';
  db.private[key] = []; db.profiles[req.params.charId] = {count:0,intimacy:0};
  save(); res.json({ok:true});
});

app.post('/api/group-chat', async (req, res) => {
  const { message, userName } = req.body;
  const u = userName||'某人';
  db.group.push({charId:null,name:u,avatar:'👤',color:'#999',text:message,isSelf:true,ts:Date.now()});
  const tasks = IDS.map(async id => {
    const sys = `${D[id]}\n${D.group}\n正在和"${u}"等群聊。`;
    const msgs = [{role:'system',content:sys}];
    db.group.slice(-6).forEach(m => { if (m.charId&&META[m.charId]) msgs.push({role:'user',content:`${META[m.charId].n}说：${m.text}`}); else msgs.push({role:'user',content:m.text}); });
    msgs.push({role:'user',content:message});
    const reply = await callAI(msgs);
    return reply&&reply.length>1 ? { charId:id, text:reply.replace(/^(绘梨衣[：:]|芬格尔[：:]|楚子航[：:]|路明非[：:]|江南[：:])/,'').substring(0,100) } : null;
  });
  const results = (await Promise.all(tasks)).filter(Boolean);
  results.forEach(r => db.group.push({charId:r.charId,name:META[r.charId].n,avatar:META[r.charId].e,color:META[r.charId].c,text:r.text,isSelf:false,ts:Date.now()}));
  if (db.group.length > 500) db.group = db.group.slice(-400);
  save();
  res.json({ replies: results });
});

app.get('/api/group-history', (req, res) => res.json(db.group));

let online = {};
io.on('connection', (socket) => {
  socket.on('join-group', (info) => { socket.join('gc'); online[socket.id]={...info}; io.to('gc').emit('on', {c:Object.keys(online).length}); });
  socket.on('gm', (msg) => { io.to('gc').emit('gm', msg); });
  socket.on('disconnect', () => { delete online[socket.id]; io.to('gc').emit('off', {c:Object.keys(online).length}); });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
server.listen(PORT, () => console.log(`OK http://localhost:${PORT}`));
