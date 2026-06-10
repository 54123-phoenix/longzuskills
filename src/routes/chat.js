const express = require('express');
const router = express.Router();
const characters = require('../services/characters');
const memory = require('../services/memory');
const prompts = require('../services/prompts');
const ai = require('../services/ai');
const { rateLimit } = require('../middleware/rateLimit');

function buildRelReason(dim, change, message) {
  const short = message.length > 20 ? message.substring(0, 20) + '…' : message;
  const reasons = {
    trust: `主动分享: "${short}"`,
    respect: `认真讨论: "${short}"`,
    closeness: `日常交流: "${short}"`,
    dependency: `寻求帮助: "${short}"`
  };
  return reasons[dim] || `${short}`;
}

const MEMORY_EXTRACT_INTERVAL = 5;

router.post('/chat', rateLimit(20, 60000), async (req, res) => {
  const { charId, message, model, userId } = req.body;
  if (!characters.getChar(charId) || !message) return res.json({ reply: '……' });
  const uid = userId || 'default';

  const profile = memory.getOrCreateProfile(charId, uid);
  profile.count++;
  memory.saveMessage(charId, uid, true, message);

  // Build messages for AI
  const memories = memory.getMemories(charId, uid, 15);
  const sysPrompt = prompts.buildCharPrompt(charId, uid, memories);
  const hist = memory.getHistory(charId, uid, 10).map(m => ({ role: m.is_self ? 'user' : 'assistant', content: m.text }));
  const msgs = [{ role: 'system', content: sysPrompt }, ...hist, { role: 'user', content: message }];

  const reply = await ai.call(msgs, { model: model || 'qwen-plus', temperature: 0.85, maxTokens: 250, retries: 2 });
  const replyText = memory.enforceConstraints(charId, reply) || '……';
  memory.saveMessage(charId, uid, false, replyText);

  const deltas = memory.keywordFallback(message);
  const dimNames = { trust: '信任', respect: '尊重', closeness: '亲密', dependency: '依赖' };
  for (const [dim, val] of Object.entries(deltas)) {
    if (val !== 0) {
      const reason = buildRelReason(dim, val, message);
      memory.recordRelationEvent(charId, uid, dim, val, reason);
    }
  }
  profile.trust = Math.min(100, profile.trust + deltas.trust);
  profile.respect = Math.min(100, profile.respect + deltas.respect);
  profile.closeness = Math.min(100, profile.closeness + deltas.closeness);
  profile.dependency = Math.min(100, profile.dependency + deltas.dependency);
  memory.updateProfile(charId, uid, profile);

  // Extract long-term memories & episodes
  const recentTexts = hist.slice(-5).map(m => `${m.role === 'user' ? uid : charId}: ${m.content}`).join('\n');
  const shouldExtract = recentTexts && profile.count % MEMORY_EXTRACT_INTERVAL === 0;
  if (shouldExtract) {
    prompts.extractAndSaveEpisodes(charId, uid, [recentTexts]);
    prompts.extractAndSaveMemories(charId, uid, [recentTexts]);
  }

  res.json({
    reply: replyText,
    profile: {
      count: profile.count,
      trust: profile.trust, respect: profile.respect,
      closeness: profile.closeness, dependency: profile.dependency,
      labels: memory.dimLabels(profile)
    }
  });
});

router.post('/regenerate', async (req, res) => {
  const { charId, model, userId } = req.body;
  const uid = userId || 'default';
  const profile = memory.getOrCreateProfile(charId, uid);

  // Remove last AI message
  const hist = memory.getHistory(charId, uid, 20);
  let lastUser = null;
  for (let i = hist.length - 1; i >= 0; i--) {
    if (hist[i].is_self) { lastUser = hist[i]; break; }
  }
  const storage = require('../services/storage');
  storage.run('DELETE FROM private_msgs WHERE char_id=? AND user_id=? AND is_self=0 AND created_at = (SELECT MAX(created_at) FROM private_msgs WHERE char_id=? AND user_id=? AND is_self=0)', [charId, uid, charId, uid]);
  storage.save();

  if (!lastUser) return res.json({ reply: '……' });

  const memories = memory.getMemories(charId, uid, 15);
  const sysPrompt = prompts.buildCharPrompt(charId, uid, memories);
  const newHist = memory.getHistory(charId, uid, 10).map(m => ({ role: m.is_self ? 'user' : 'assistant', content: m.text }));
  const msgs = [{ role: 'system', content: sysPrompt }, ...newHist];

  const reply = await ai.call(msgs, { model: model || 'qwen-plus', temperature: 0.9, maxTokens: 250, retries: 2 });
  const replyText = memory.enforceConstraints(charId, reply) || '……';
  memory.saveMessage(charId, uid, false, replyText);
  res.json({ reply: replyText });
});

router.get('/history/:charId', (req, res) => {
  const { limit, offset, userId } = req.query;
  const uid = userId || req.headers['x-user-id'] || 'default';
  const msgs = memory.getHistory(req.params.charId, uid, parseInt(limit) || 100, parseInt(offset) || 0);
  const total = memory.getHistoryTotal(req.params.charId, uid);
  res.json({ msgs: msgs.map(m => ({ text: m.text, isSelf: !!m.is_self, timestamp: m.created_at })), total });
});

router.delete('/history/:charId', (req, res) => {
  const uid = req.query.userId || req.headers['x-user-id'] || 'default';
  memory.deleteHistory(req.params.charId, uid);
  res.json({ ok: true });
});

router.get('/all-profiles', (req, res) => {
  const uid = req.query.userId || req.headers['x-user-id'] || 'default';
  const ids = characters.getIds();
  const out = {};
  ids.forEach(id => {
    const p = memory.getOrCreateProfile(id, uid);
    out[id] = {
      count: p.count,
      trust: p.trust, respect: p.respect,
      closeness: p.closeness, dependency: p.dependency,
      labels: memory.dimLabels(p),
      last: p.last
    };
  });
  res.json(out);
});

// Memory API
router.get('/memories/:charId', (req, res) => {
  const uid = req.query.userId || req.headers['x-user-id'] || 'default';
  const memories = memory.getMemories(req.params.charId, uid, 30);
  res.json(memories);
});

router.get('/all-memories', (req, res) => {
  const uid = req.query.userId || req.headers['x-user-id'] || 'default';
  const memories = memory.getAllMemories(uid);
  const chars = characters.getAll();
  const enriched = memories.map(m => ({
    ...m,
    charName: chars[m.char_id]?.name || m.char_id
  }));
  res.json(enriched);
});

module.exports = router;
