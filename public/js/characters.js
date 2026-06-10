(function() {
const CHARACTERS = {
  hly: { id:'hly', name:'绘梨衣', emoji:'🌸', color:'#e8739a', gender:'female', description:'天真沉默的女孩，用文字与世界对话。每句带省略号。', avatar: null },
  fge: { id:'fge', name:'芬格尔', emoji:'🍔', color:'#f5a623', gender:'male', description:'自嘲吃货，情报之王。表面废柴，深藏不露。', avatar: null },
  czh: { id:'czh', name:'楚子航', emoji:'🗡️', color:'#4a90d9', gender:'male', description:'话极少的狮心会会长。沉默不是冷漠，是不懂表达。', avatar: null },
  lmf: { id:'lmf', name:'路明非', emoji:'🐉', color:'#7b68ee', gender:'male', description:'自称废柴的S级。不敢面对自己的力量。', avatar: null },
  jn: { id:'jn', name:'江南', emoji:'✍️', color:'#2c3e50', gender:'male', description:'龙族作者，拖稿大王。化学系出身用科学写故事。', avatar: null }
};
window.CHARACTERS = CHARACTERS;

// Load custom avatars from server
async function loadAvatars() {
  try {
    const r = await fetch('/api/character-avatars');
    const avatars = await r.json();
    Object.keys(avatars).forEach(id => {
      if (CHARACTERS[id]) {
        CHARACTERS[id].avatar = avatars[id].url;
      }
    });
  } catch(e) {
    // Silently fail - will use emoji fallback
  }
}

// Immediately start loading avatars
loadAvatars();

window.escHtml = function(text) {
  if (text == null) return '';
  const d = document.createElement('div'); d.textContent = text;
  return d.innerHTML;
};

// Helper: render a character avatar (image or emoji)
window.renderCharAvatar = function(ch, size) {
  size = size || 36;
  const esc = window.escHtml;
  if (ch.avatar) {
    return `<img src="${esc(ch.avatar)}" alt="${esc(ch.name)}" style="width:${size}px;height:${size}px;object-fit:cover;border-radius:inherit">`;
  }
  return esc(ch.emoji);
};

// Check if a character has a custom avatar
window.hasCharAvatar = function(ch) {
  return ch && ch.avatar && ch.avatar.startsWith('/uploads/');
};
})();
