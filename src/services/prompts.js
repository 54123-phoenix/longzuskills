const characters = require('./characters');
const memory = require('./memory');
const ai = require('./ai');

function buildCharPrompt(charId, userId, memories) {
  const ch = characters.getChar(charId);
  if (!ch) return '';
  const p = memory.getOrCreateProfile(charId, userId);
  const label = characters.INTIMACY_LABELS(p.intimacy);

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

  return `${ch.system}\n正在和"${userId}"聊天。已聊${p.count}轮，关系阶段：${label}。${memSection}${relSection}`;
}

function buildGroupPrompt(charId, userId) {
  const ch = characters.getChar(charId);
  if (!ch) return '';
  return `${ch.system}\n${characters.GROUP_PROMPT}\n正在和"${userId}"等群聊。`;
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
