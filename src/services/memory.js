const storage = require('./storage');

function getOrCreateProfile(charId, userId) {
  const u = userId || 'default';
  let p = storage.get(`SELECT msg_count, trust, respect, closeness, dependency, last_chat FROM profiles WHERE char_id='${storage.quote(charId)}' AND user_id='${storage.quote(u)}'`);
  if (p) return { count: p.msg_count, trust: p.trust, respect: p.respect, closeness: p.closeness, dependency: p.dependency, last: p.last_chat };
  try {
    storage.run('INSERT OR IGNORE INTO profiles (char_id, user_id, msg_count, trust, respect, closeness, dependency) VALUES (?,?,0,0,0,0,0)', [charId, u]);
    storage.save();
  } catch(e) { /* already exists */ }
  return { count: 0, trust: 0, respect: 0, closeness: 0, dependency: 0, last: null };
}

function updateProfile(charId, userId, dims) {
  const d = dims || {};
  storage.run(
    'UPDATE profiles SET msg_count=?, trust=?, respect=?, closeness=?, dependency=?, last_chat=? WHERE char_id=? AND user_id=?',
    [d.count || 0, d.trust || 0, d.respect || 0, d.closeness || 0, d.dependency || 0, Date.now(), charId, userId || 'default']
  );
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

function analyzeMessage(charId, userMessage, aiReply) {
  const dims = { trust: 0, respect: 0, closeness: 0, dependency: 0 };
  const text = (userMessage || '') + (aiReply || '');

  // Trust: sharing secrets, asking personal, vulnerability
  if (/秘密|告诉你|不敢|害怕|脆弱|受伤|过去/.test(userMessage)) dims.trust += 2;
  if (/相信|信赖|托付|依靠/.test(aiReply)) dims.trust += 1;

  // Respect: seeking advice, acknowledging, debating
  if (/怎么\w{1,3}|建议|觉得|你认为|请教|帮忙/.test(userMessage)) dims.respect += 2;
  if (/不错|厉害|佩服|认可/.test(aiReply)) dims.respect += 1;

  // Closeness: casual chat, sharing daily, jokes, emotions
  if (/今天|吃|玩|无聊|开心|难过|想|喜欢/.test(userMessage)) dims.closeness += 1;
  if (userMessage.length > 20 || /[😂😊🌸🐉🗡️🍔✍️]/.test(userMessage)) dims.closeness += 1;

  // Dependency: asking for help, checking in frequently
  if (/帮|救|求|托|麻烦|怎么办/.test(userMessage)) dims.dependency += 2;
  if (/你不在|找你|来|陪/.test(userMessage)) dims.dependency += 1;

  return dims;
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

// Memory graph
function setMemory(charId, userId, key, value, confidence) {
  const exist = storage.get(`SELECT id FROM memories WHERE char_id='${storage.quote(charId)}' AND user_id='${userId||'default'}' AND key='${storage.quote(key)}'`);
  if (exist) {
    storage.run('UPDATE memories SET value=?, confidence=?, updated_at=? WHERE id=?', [value, confidence || 0.5, Date.now(), exist.id]);
  } else {
    storage.run('INSERT INTO memories (char_id, user_id, key, value, confidence, source, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)', [charId, userId || 'default', key, value, confidence || 0.5, 'chat', Date.now(), Date.now()]);
  }
  storage.save();
}

function getMemories(charId, userId, limit) {
  return storage.all('SELECT key, value, confidence FROM memories WHERE char_id=? AND user_id=? ORDER BY updated_at DESC LIMIT ?', [charId, userId || 'default', limit || 20]);
}

function getAllMemories(userId) {
  return storage.all('SELECT char_id, key, value, confidence FROM memories WHERE user_id=? ORDER BY updated_at DESC LIMIT 50', [userId || 'default']);
}

// Relationship graph
function setRelation(a, b, relation, strength) {
  storage.run('INSERT OR REPLACE INTO relations (char_id_a, char_id_b, relation, strength, updated_at) VALUES (?,?,?,?,?)', [a, b, relation, strength || 0, Date.now()]);
  storage.save();
}

function getRelations(charId) {
  return storage.all('SELECT char_id_a, char_id_b, relation, strength FROM relations WHERE char_id_a=? OR char_id_b=?', [charId, charId]);
}

// Group messages
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
  getOrCreateProfile, updateProfile, dimLabels, analyzeMessage,
  saveMessage, getHistory, getHistoryTotal, deleteHistory,
  setMemory, getMemories, getAllMemories,
  setRelation, getRelations,
  saveGroupMsg, getGroupHistory, cleanupGroup
};
