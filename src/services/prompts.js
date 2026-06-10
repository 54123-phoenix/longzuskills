const characters = require('./characters');
const memory = require('./memory');
const ai = require('./ai');

function buildCharPrompt(charId, userId, memories) {
  const ch = characters.getChar(charId);
  if (!ch) return '';
  const p = memory.getOrCreateProfile(charId, userId);
  const labels = memory.dimLabels(p);

  let dimSection = '';
  if (p.count > 0) {
    dimSection = `\n\n【关系维度】\n信任:${'█'.repeat(Math.floor(p.trust/5))} (${p.trust}%) - ${p.trust >= 80 ? '会透露秘密' : p.trust >= 30 ? '开始坦诚' : '保持戒备'}\n尊重:${'█'.repeat(Math.floor(p.respect/5))} (${p.respect}%) - ${p.respect >= 80 ? '认可你的判断' : p.respect >= 30 ? '会考虑你的意见' : '不屑一顾'}\n亲密:${'█'.repeat(Math.floor(p.closeness/5))} (${p.closeness}%) - ${p.closeness >= 80 ? '主动找你说话' : p.closeness >= 30 ? '不排斥你' : '保持距离'}\n依赖:${'█'.repeat(Math.floor(p.dependency/5))} (${p.dependency}%) - ${p.dependency >= 80 ? '有困难会找你' : p.dependency >= 30 ? '偶尔求助' : '独自承担'}`;
  }

  let memSection = '';
  if (memories && memories.length > 0) {
    const memLines = memories.filter(m => m.confidence > 0.3).slice(0, 10).map(m => `- ${m.key}: ${m.value} (确信度:${Math.floor(m.confidence*100)}%)`).join('\n');
    if (memLines) memSection = `\n\n【关于${userId}的长期记忆】\n${memLines}`;
  }

  const relations = memory.getRelations(charId);
  let relSection = '';
  if (relations && relations.length > 0) {
    const relLines = relations.map(r => {
      const other = r.char_id_a === charId ? r.char_id_b : r.char_id_a;
      const otherCh = characters.getChar(other);
      return `- 与${otherCh?.name || other}: ${r.relation} (强度:${Math.floor(r.strength*100)}%)`;
    }).join('\n');
    if (relLines) relSection = `\n\n【与其他角色的关系】\n${relLines}`;
  }

  return `${ch.system}\n正在和"${userId}"聊天。已聊${p.count}轮。${dimSection}${memSection}${relSection}`;
}

function buildGroupPrompt(charId, userId) {
  const ch = characters.getChar(charId);
  if (!ch) return '';
  const meta = characters.getAllMeta();
  const relLines = Object.entries(ch.relations || {})
    .map(([id, r]) => { const other = meta[id]; return other ? `- ${other.n}：${r.type}（亲密度${r.strength}）` : ''; })
    .filter(Boolean).join('\n');
  const relSection = relLines ? `\n\n【群内关系】你知道群里有这些人，可以和他们互动：\n${relLines}\n可以@他们、接过他们的话、或对他们的发言流露态度。` : '';
  return `${ch.system}${relSection}\n${characters.GROUP_PROMPT}\n正在和"${userId}"等群聊。`;
}

async function extractAndSaveMemories(charId, userId, recentMessages) {
  try {
    const memories = await ai.extractMemories(recentMessages);
    for (const mem of memories) {
      if (mem.key && mem.value && mem.confidence > 0.3) {
        memory.setMemory(charId, userId, mem.key, mem.value, mem.confidence);
        // Also set relationship strength for character-charId pairs
        if (charId !== userId) {
          const rel = memory.getRelations(charId).find(r => r.char_id_b === userId || r.char_id_a === userId);
          if (rel) {
            memory.setRelation(charId, userId, rel.relation || '聊天伙伴', Math.min(1, rel.strength + 0.01));
          } else {
            memory.setRelation(charId, userId, '聊天伙伴', 0.1);
          }
        }
      }
    }
  } catch (e) { /* memory extraction is best-effort */ }
}

module.exports = { buildCharPrompt, buildGroupPrompt, extractAndSaveMemories };
