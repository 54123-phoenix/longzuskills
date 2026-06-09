const storage = require('./storage');
const ai = require('./ai');

function getOrCreateProfile(charId, userId) {
  const u = userId || 'default';
  let p = storage.get(`SELECT msg_count, trust, respect, closeness, dependency, last_chat FROM profiles WHERE char_id='${storage.quote(charId)}' AND user_id='${storage.quote(u)}'`);
  if (p) return { count: p.msg_count, trust: p.trust, respect: p.respect, closeness: p.closeness, dependency: p.dependency, last: p.last_chat };
  try { storage.run('INSERT OR IGNORE INTO profiles (char_id, user_id, msg_count, trust, respect, closeness, dependency) VALUES (?,?,0,0,0,0,0)', [charId, u]); storage.save(); } catch(e) {}
  return { count: 0, trust: 0, respect: 0, closeness: 0, dependency: 0, last: null };
}

function updateProfile(charId, userId, dims) {
  const d = dims || {};
  storage.run('UPDATE profiles SET msg_count=?, trust=?, respect=?, closeness=?, dependency=?, last_chat=? WHERE char_id=? AND user_id=?', [d.count || 0, d.trust || 0, d.respect || 0, d.closeness || 0, d.dependency || 0, Date.now(), charId, userId || 'default']);
  storage.save();
}

function dimLabels(dims) {
  const labels = [];
  if (dims.trust >= 80) labels.push('完全信赖');
  else if (dims.trust >= 50) labels.push('比较信任');
  else if (dims.trust >= 20) labels.push('开始信任');
  if (dims.closeness >= 80) labels.push('形影不离');
  else if (dims.closeness >= 50) labels.push('亲近');
  if (dims.respect >= 80) labels.push('敬佩');
  else if (dims.respect >= 50) labels.push('认可');
  if (dims.dependency >= 80) labels.push('依赖');
  else if (dims.dependency >= 50) labels.push('愿意求助');
  if (labels.length === 0) labels.push('陌生人');
  return labels;
}

async function analyzeMessage(charId, userMessage, aiReply) {
  const sysPrompt = `分析用户的最新消息，判断应该增加哪些关系维度。返回纯JSON。

维度说明：
- trust(信任): 用户分享个人信息、表达脆弱、透露秘密、寻求情感支持 → +1~3
- respect(尊重): 用户征求建议、请教问题、认可对方观点、认真讨论 → +1~3
- closeness(亲密): 用户闲聊日常、分享心情、开玩笑、表达关心 → +1~2
- dependency(依赖): 用户求助、表达需要对方、说"帮我""陪我""你在哪" → +1~3

输出格式：{"trust":0,"respect":0,"closeness":0,"dependency":0}
只返回JSON，不要任何解释。`;

  try {
    const msgs = [
      { role: 'system', content: sysPrompt },
      { role: 'user', content: userMessage }
    ];
    const res = await ai.call(msgs, { model: 'qwen-plus', temperature: 0.1, maxTokens: 100, retries: 0 });
    const parsed = JSON.parse(res?.match(/\{[\s\S]*\}/)?.[0] || '{}');
    return {
      trust: Math.max(0, Math.min(3, parseInt(parsed.trust) || 0)),
      respect: Math.max(0, Math.min(3, parseInt(parsed.respect) || 0)),
      closeness: Math.max(0, Math.min(2, parseInt(parsed.closeness) || 0)),
      dependency: Math.max(0, Math.min(3, parseInt(parsed.dependency) || 0))
    };
  } catch (e) {
    // Fallback: keyword-based if LLM fails
    return keywordFallback(userMessage, aiReply);
  }
}

function keywordFallback(userMessage) {
  const t = userMessage || '';
  const dims = { trust: 0, respect: 0, closeness: 0, dependency: 0 };
  if (/(秘密|告诉你一件事|不敢跟别人说|其实我|有件事|憋了很久)/.test(t)) dims.trust += 2;
  if (/(你怎么看|建议|觉得呢|请教|帮我分析|你认为)/.test(t)) dims.respect += 2;
  if (/(今天|吃了|睡了|好累|开心|难过|想你了|哈哈|😂|无聊|日常)/.test(t)) dims.closeness += 1;
  if (/(帮帮我|救我|求你|怎么办|陪我|你在哪|我需要你)/.test(t)) dims.dependency += 2;
  return dims;
}

// Soft post-processing: add flavor, don't break conversation
function enforceConstraints(charId, text) {
  if (!text) return '……';
  let result = text;

  // Strip role name prefixes (LLM sometimes prepends)
  result = result.replace(/^(绘梨衣[：:]|芬格尔[：:]|楚子航[：:]|路明非[：:]|江南[：:])\s*/g, '');

  if (charId === 'hly') {
    // 软修正：末尾没省略号就加一个，但不超过100字时才加
    if (!result.endsWith('…') && !result.endsWith('...') && result.length < 80) {
      if (result.endsWith('。') || result.endsWith('！') || result.endsWith('？')) {
        result = result.slice(0, -1) + '……';
      } else if (!result.match(/[。！？…\.]$/)) {
        result += '……';
      }
    }
    // 过长的才截断
    if (result.length > 120) result = result.substring(0, 117) + '……';
  }

  if (charId === 'czh') {
    // 楚子航：超过30字才做软截断，优先保留完整语义
    if (result.length > 30) {
      const cut = result.substring(0, 28);
      const lastDot = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('，'), cut.lastIndexOf(' '));
      if (lastDot > 15) result = cut.substring(0, lastDot + 1);
    }
  }

  return result;
}

function saveMessage(charId, userId, isSelf, text) {
  storage.run('INSERT INTO private_msgs (char_id, user_id, is_self, text, created_at) VALUES (?,?,?,?,?)', [charId, userId || 'default', isSelf ? 1 : 0, text, Date.now()]);
  storage.save();
}

function getHistory(charId, userId, limit, offset) {
  const l = limit || 100, o = offset || 0;
  return storage.all('SELECT text, is_self, created_at FROM private_msgs WHERE char_id=? AND user_id=? ORDER BY created_at ASC LIMIT ? OFFSET ?', [charId, userId || 'default', l, o]);
}

function getHistoryTotal(charId, userId) {
  const r = storage.exec(`SELECT COUNT(*) FROM private_msgs WHERE char_id='${storage.quote(charId)}' AND user_id='${userId||'default'}'`);
  return r[0]?.values?.[0]?.[0] || 0;
}

function deleteHistory(charId, userId) {
  storage.run('DELETE FROM private_msgs WHERE char_id=? AND user_id=?', [charId, userId || 'default']);
  storage.run('UPDATE profiles SET msg_count=0, trust=0, respect=0, closeness=0, dependency=0 WHERE char_id=? AND user_id=?', [charId, userId || 'default']);
  storage.save();
}

function setMemory(charId, userId, key, value, confidence) {
  const exist = storage.get(`SELECT id FROM memories WHERE char_id='${storage.quote(charId)}' AND user_id='${userId||'default'}' AND key='${storage.quote(key)}'`);
  if (exist) { storage.run('UPDATE memories SET value=?, confidence=?, updated_at=? WHERE id=?', [value, confidence || 0.5, Date.now(), exist.id]); }
  else { storage.run('INSERT INTO memories (char_id, user_id, key, value, confidence, source, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)', [charId, userId || 'default', key, value, confidence || 0.5, 'chat', Date.now(), Date.now()]); }
  storage.save();
}

function getMemories(charId, userId, limit) {
  return storage.all('SELECT key, value, confidence FROM memories WHERE char_id=? AND user_id=? ORDER BY updated_at DESC LIMIT ?', [charId, userId || 'default', limit || 20]);
}

function getAllMemories(userId) {
  return storage.all('SELECT char_id, key, value, confidence FROM memories WHERE user_id=? ORDER BY updated_at DESC LIMIT 50', [userId || 'default']);
}

function setRelation(a, b, relation, strength) {
  storage.run('INSERT OR REPLACE INTO relations (char_id_a, char_id_b, relation, strength, updated_at) VALUES (?,?,?,?,?)', [a, b, relation, strength || 0, Date.now()]);
  storage.save();
}

function getRelations(charId) {
  return storage.all('SELECT char_id_a, char_id_b, relation, strength FROM relations WHERE char_id_a=? OR char_id_b=?', [charId, charId]);
}

function saveGroupMsg(msg) {
  storage.run('INSERT INTO group_msgs (char_id, name, avatar, color, text, is_self, type, created_at) VALUES (?,?,?,?,?,?,?,?)', [msg.charId || null, msg.name, msg.avatar, msg.color, msg.text, msg.isSelf ? 1 : 0, msg.type || 'user', Date.now()]);
  storage.save();
}

function getGroupHistory(limit) {
  const r = storage.exec('SELECT * FROM group_msgs ORDER BY created_at ASC LIMIT ' + (limit || 200));
  if (!r.length) return [];
  return r[0].values.map(v => ({ charId: v[0], name: v[1], avatar: v[2], color: v[3], text: v[4], isSelf: !!v[5], type: v[6], timestamp: v[7] }));
}

function cleanupGroup(max) {
  const cnt = (storage.exec('SELECT COUNT(*) FROM group_msgs')[0]?.values?.[0]?.[0]) || 0;
  if (cnt > max) storage.run('DELETE FROM group_msgs WHERE created_at NOT IN (SELECT created_at FROM group_msgs ORDER BY created_at DESC LIMIT ' + (max - 100) + ')');
  storage.save();
}

module.exports = {
  getOrCreateProfile, updateProfile, dimLabels, analyzeMessage, enforceConstraints, keywordFallback,
  saveMessage, getHistory, getHistoryTotal, deleteHistory,
  setMemory, getMemories, getAllMemories,
  setRelation, getRelations,
  saveGroupMsg, getGroupHistory, cleanupGroup
};
