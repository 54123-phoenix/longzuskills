const express = require('express');
const router = express.Router();
const characters = require('../services/characters');
const memory = require('../services/memory');
const prompts = require('../services/prompts');
const ai = require('../services/ai');

router.post('/group-chat', async (req, res) => {
  const { message, userId } = req.body;
  const uid = userId || '某人';

  memory.saveGroupMsg({ name: uid, avatar: '👤', color: '#999', text: message, isSelf: true, type: 'user' });

  const ids = characters.getIds();
  const tasks = ids.map(async id => {
    const sysPrompt = prompts.buildGroupPrompt(id, uid);
    const msgs = [{ role: 'system', content: sysPrompt }];
    const recentGroup = memory.getGroupHistory(8);
    recentGroup.forEach(m => {
      if (m.charId && characters.getMeta(m.charId)) {
        msgs.push({ role: 'user', content: `${characters.getMeta(m.charId).n}说：${m.text}` });
      } else {
        msgs.push({ role: 'user', content: m.text });
      }
    });
    msgs.push({ role: 'user', content: message });
    const reply = await ai.call(msgs, { model: 'qwen-plus', temperature: 0.9, maxTokens: 200, retries: 1 });
    return reply && reply.length > 1
      ? { charId: id, name: characters.getMeta(id).n, text: memory.enforceConstraints(id, reply).substring(0, 100) }
      : null;
  });

  const results = (await Promise.all(tasks)).filter(Boolean);
  results.forEach(r => {
    memory.saveGroupMsg({
      charId: r.charId, name: characters.getMeta(r.charId).n,
      avatar: characters.getMeta(r.charId).e, color: characters.getMeta(r.charId).c,
      text: r.text, isSelf: false, type: 'user'
    });
  });
  memory.cleanupGroup(500);
  res.json({ replies: results });
});

router.get('/group-history', (req, res) => {
  res.json(memory.getGroupHistory(200));
});

module.exports = router;
