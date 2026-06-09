const CHARACTERS = {
  hly: { id:'hly', name:'绘梨衣', emoji:'🌸', color:'#e8739a', gender:'female', description:'天真沉默的女孩，用文字与世界对话。每句带省略号。' },
  fge: { id:'fge', name:'芬格尔', emoji:'🍔', color:'#f5a623', gender:'male', description:'自嘲吃货，情报之王。表面废柴，深藏不露。' },
  czh: { id:'czh', name:'楚子航', emoji:'🗡️', color:'#4a90d9', gender:'male', description:'话极少的狮心会会长。沉默不是冷漠，是不懂表达。' },
  lmf: { id:'lmf', name:'路明非', emoji:'🐉', color:'#7b68ee', gender:'male', description:'自称废柴的S级。不敢面对自己的力量。' },
  jn: { id:'jn', name:'江南', emoji:'✍️', color:'#2c3e50', gender:'male', description:'龙族作者，拖稿大王。化学系出身用科学写故事。' }
};

function escapeHtml(text) {
  if (text == null) return '';
  const d = document.createElement('div'); d.textContent = text;
  return d.innerHTML;
}
