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

  // 角色回复概率：模拟真实群聊，不是每个人都插嘴
  const replyChance = { hly: 0.60, fge: 0.80, czh: 0.30, lmf: 0.50, jn: 0.45 };
  const ids = characters.getIds();
  const selected = ids.filter(id => Math.random() < (replyChance[id] || 0.5));
  // 保底：至少 2 人回复（但不能全沉默）
  const pool = selected.length >= 1 ? selected : ids.sort(() => Math.random() - 0.5).slice(0, 2);

  const tasks = pool.map(async (id, i) => {
    if (i > 0) await new Promise(r => setTimeout(r, 200));
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
    const reply = await ai.call(msgs, { model: 'deepseek-chat', temperature: 0.9, maxTokens: 200, retries: 3 });
    if (ai.isQuotaError(reply) || ai.isApiError(reply)) {
      console.error(`Group AI failed for ${id}: ${reply.message}`);
    }
    const replyStr = typeof reply === 'string' ? reply : '';
    return replyStr && replyStr.length > 1
      ? { charId: id, name: characters.getMeta(id).n, text: memory.enforceConstraints(id, replyStr).substring(0, 100) }
      : null;
  });

  const results = (await Promise.all(tasks)).filter(Boolean);
  if (results.length > 0) {
    const storage = require('../services/storage');
    results.forEach(r => {
      memory.saveGroupMsg({
        charId: r.charId, name: characters.getMeta(r.charId).n,
        avatar: characters.getMeta(r.charId).e, color: characters.getMeta(r.charId).c,
        text: r.text, isSelf: false, type: 'user'
      });
    });
    storage.flushImmediate();
  }
  memory.cleanupGroup(500);
  res.json({ replies: results });
});

router.get('/group-history', (req, res) => {
  res.json(memory.getGroupHistory(200));
});

module.exports = router;
