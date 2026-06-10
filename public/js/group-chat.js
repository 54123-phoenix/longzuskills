(function() {
const G = {
  messages: [], socket: null, isLoading: false,

  // @mention 自动补全数据
  mentionChars: [
    { id: 'hly', name: '绘梨衣', emoji: '🌸' },
    { id: 'fge', name: '芬格尔', emoji: '🍔' },
    { id: 'czh', name: '楚子航', emoji: '🗡️' },
    { id: 'lmf', name: '路明非', emoji: '🐉' },
    { id: 'jn', name: '江南', emoji: '✍️' }
  ],
  mentionActive: -1,  // 当前高亮项索引

  init(socket) {
    this.socket = socket;
    this.bindEvents();
    fetch('/api/group-history').then(r => r.json()).then(msgs => {
      this.messages = msgs.length > 0 ? msgs : [];
      if (this.messages.length === 0) this.addLocalSystem('🐉 欢迎来到龙族聊天群！');
      this.render();
    }).catch(() => {
      if (this.messages.length === 0) this.addLocalSystem('🐉 欢迎来到龙族聊天群！');
      this.render();
    });
  },

  addLocalSystem(t) { this.messages.push({ type: 'system', text: t, ts: Date.now() }); },

  render() {
    let c = document.getElementById('group-chat-area');
    if (!c) { c = document.createElement('div'); c.id = 'group-chat-area'; document.body.appendChild(c); }
    c.innerHTML = `<div class="chat-header"><div class="chat-header-title">🐉 龙族聊天群</div><div class="chat-header-members" id="goc"></div></div>
      <div class="chat-messages" id="gm"></div>
      <div id="gt-avatars" style="display:flex;gap:4px;padding:4px 24px;min-height:28px;align-items:center;flex-wrap:wrap"></div>
      <div class="chat-input-area"><div class="chat-input-wrapper">
        <input class="chat-input" id="gi" placeholder="输入消息..." maxlength="500">
        <button class="chat-send-btn" id="gs">发送</button></div>
        <div class="mention-dropdown" id="gmd" style="display:none"></div></div></div>`;
    this.renderMsgs();
    const i = document.getElementById('gi'), s = document.getElementById('gs');
    if (i && s) {
      s.onclick = () => this.send(i);
      i.onkeydown = e => {
        const dd = document.getElementById('gmd');
        if (dd && dd.style.display !== 'none') {
          const items = dd.querySelectorAll('.mention-item');
          if (e.key === 'ArrowDown') { e.preventDefault(); this.mentionActive = Math.min(this.mentionActive + 1, items.length - 1); this.highlightMention(items); return; }
          if (e.key === 'ArrowUp') { e.preventDefault(); this.mentionActive = Math.max(this.mentionActive - 1, 0); this.highlightMention(items); return; }
          if (e.key === 'Enter' && this.mentionActive >= 0) { e.preventDefault(); this.selectMentionFromDropdown(items[this.mentionActive], i); return; }
          if (e.key === 'Escape') { e.preventDefault(); this.hideMentionDropdown(); return; }
        }
        if (e.key === 'Enter') this.send(i);
      };
      i.addEventListener('input', () => this.handleMentionInput(i));
    }
  },

  renderMsgs() {
    const c = document.getElementById('gm'); if (!c) return;
    const e = window.escHtml;
    const UP = window.UserProfile;
    c.innerHTML = this.messages.map(m => {
      if (m.type === 'system') return `<div class="message-system">${e(m.text)}</div>`;
      const selfAvatar = UP.isImageAvatar(UP.get().avatar)
        ? `<div class="message-avatar" style="background:${m.color||'#999'}"><img src="${e(UP.get().avatar)}" style="width:100%;height:100%;object-fit:cover;border-radius:8px"></div>`
        : `<div class="message-avatar" style="background:${m.color||'#999'}">${m.avatar||'👤'}</div>`;
      const otherAvatar = m.avatar && (m.avatar.startsWith('/uploads/') || m.avatar.startsWith('data:image/'))
        ? `<div class="message-avatar" style="background:${m.color||'#999'}"><img src="${e(m.avatar)}" style="width:100%;height:100%;object-fit:cover;border-radius:8px"></div>`
        : `<div class="message-avatar" style="background:${m.color||'#999'}">${m.avatar||'👤'}</div>`;
      return `<div class="message ${m.isSelf ? 'message-self' : 'message-other'}">
        ${!m.isSelf ? otherAvatar : ''}
        <div class="message-body">
          ${!m.isSelf ? `<div class="message-name">${e(m.name||'')}</div>` : ''}
          <div class="message-bubble ${m.isSelf?'bubble-self':'bubble-other'}">${e(m.text)}</div>
        </div>
        ${m.isSelf ? selfAvatar : ''}
      </div>`;
    }).join('');
    c.scrollTop = c.scrollHeight;
  },

  async send(input) {
    const text = input.value.trim();
    if (!text || this.isLoading) return;
    const p = window.UserProfile.get();
    const msg = { type: 'user', text, name: p.nickname, avatar: p.avatar, color: p.color, ts: Date.now(), isSelf: true };
    this.messages.push(msg); this.renderMsgs(); input.value = '';
    this.isLoading = true;
    if (this.socket) this.socket.emit('gm', msg);

    const allChars = { hly: '🌸', fge: '🍔', czh: '🗡️', lmf: '🐉', jn: '✍️' };
    const colors = { hly: '#e8739a', fge: '#f5a623', czh: '#4a90d9', lmf: '#7b68ee', jn: '#2c3e50' };

    const el = document.getElementById('gt-avatars');
    if (el) el.innerHTML = `<span style="font-size:12px;color:var(--text-light)">⏳ 角色们正在思考...</span>`;

    try {
      const r = await fetch('/api/group-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, userId: p.nickname })
      });
      const d = await r.json();
      if (el) el.innerHTML = '';
      if (d.replies && d.replies.length > 0) {
        for (const reply of d.replies) {
          const m = { type: 'user', text: '', name: reply.name, avatar: allChars[reply.charId], color: colors[reply.charId], ts: Date.now(), isSelf: false, charId: reply.charId };
          this.messages.push(m); this.renderMsgs();
          if (this.socket) this.socket.emit('gm', m);
          await this.typeMessage(m, reply.text);
        }
      } else if (el) { el.innerHTML = '<span style="font-size:12px;color:var(--text-light)">角色们暂时没有回应</span>'; }
    } catch (e) { if (el) el.innerHTML = ''; console.error('群聊失败', e); }
    this.isLoading = false;
  },

  async typeMessage(msg, fullText) {
    const bubbles = document.querySelectorAll('#gm .message-bubble');
    const last = bubbles[bubbles.length - 1];
    if (!last) return;
    for (let i = 0; i < fullText.length; i++) {
      msg.text = fullText.substring(0, i + 1);
      last.textContent = msg.text;
      const gm = document.getElementById('gm');
      if (gm) gm.scrollTop = gm.scrollHeight;
      await new Promise(r => setTimeout(r, 30));
    }
  },

  // --- @mention 自动补全 ---
  handleMentionInput(input) {
    const val = input.value;
    const cursorPos = input.selectionStart;
    // 找到光标前最近的 @
    const beforeCursor = val.substring(0, cursorPos);
    const atIdx = beforeCursor.lastIndexOf('@');
    if (atIdx === -1) { this.hideMentionDropdown(); return; }
    // 检查@前面是否是空格或开头（确保是新的mention）
    if (atIdx > 0 && beforeCursor[atIdx - 1] !== ' ') { this.hideMentionDropdown(); return; }
    const query = beforeCursor.substring(atIdx + 1).toLowerCase();
    // @后不能有空格
    if (query.includes(' ')) { this.hideMentionDropdown(); return; }
    const filtered = this.mentionChars.filter(c =>
      c.name.includes(query) || c.id.includes(query) || (query === '' || c.name.toLowerCase().includes(query))
    );
    if (filtered.length === 0) { this.hideMentionDropdown(); return; }
    this.mentionActive = 0;
    this.showMentionDropdown(filtered, input, atIdx);
  },

  showMentionDropdown(chars, input, atIdx) {
    const dd = document.getElementById('gmd');
    if (!dd) return;
    dd.style.display = 'block';
    dd.innerHTML = chars.map((c, i) =>
      `<div class="mention-item${i === 0 ? ' active' : ''}" data-id="${c.id}" data-name="${c.name}" data-idx="${i}">
        <span>${c.emoji}</span><span>${c.name}</span>
      </div>`
    ).join('');
    dd.querySelectorAll('.mention-item').forEach(item => {
      item.addEventListener('click', () => this.selectMentionFromDropdown(item, input));
    });
    this._mentionAtIdx = atIdx;
  },

  highlightMention(items) {
    items.forEach((item, i) => {
      item.classList.toggle('active', i === this.mentionActive);
    });
  },

  selectMentionFromDropdown(item, input) {
    const name = item.dataset.name;
    const atIdx = this._mentionAtIdx;
    const val = input.value;
    const cursorPos = input.selectionStart;
    // 替换 @query 为 @name
    const before = val.substring(0, atIdx);
    const after = val.substring(cursorPos);
    input.value = before + '@' + name + ' ' + after;
    this.hideMentionDropdown();
    // 光标放到插入的名字后面
    const newPos = atIdx + name.length + 2;
    input.setSelectionRange(newPos, newPos);
    input.focus();
  },

  hideMentionDropdown() {
    const dd = document.getElementById('gmd');
    if (dd) { dd.style.display = 'none'; dd.innerHTML = ''; }
    this.mentionActive = -1;
    this._mentionAtIdx = -1;
  },
  // --- end @mention ---

  bindEvents() {
    if (!this.socket) return;
    this.socket.on('gm', msg => { if (!msg.isSelf) { this.messages.push(msg); this.renderMsgs(); } });
    this.socket.on('on', d => { const e = document.getElementById('goc'); if (e) e.textContent = d.c + '人在线'; });
    this.socket.on('off', d => { const e = document.getElementById('goc'); if (e) e.textContent = d.c + '人在线'; });
  }
};
window.GroupChat = G;
})();
