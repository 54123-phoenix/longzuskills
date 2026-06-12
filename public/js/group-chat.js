(function() {
const G = {
  messages: [], socket: null, isLoading: false,

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
        <input class="chat-input" id="gi" placeholder="输入消息，用 @角色名 点名..." maxlength="500">
        <button class="chat-send-btn" id="gs">发送</button></div></div>`;
    this.renderMsgs();
    const i = document.getElementById('gi'), s = document.getElementById('gs');
    if (i && s) { s.onclick = () => this.send(i); i.onkeydown = e => { if (e.key === 'Enter') this.send(i); }; }
    this.initMention(i);
    this.initPullRefresh();
  },

  renderMsgs() {
    const c = document.getElementById('gm'); if (!c) return;
    const e = window.escHtml;
    const UP = window.UserProfile;
    let lastTs = 0;
    c.innerHTML = this.messages.map(m => {
      if (m.type === 'system') return `<div class="message-system">${e(m.text)}</div>`;
      // Time grouping
      let timeHeader = '';
      if (m.ts) {
        const gap = m.ts - lastTs;
        if (!lastTs || gap > 180000) {
          timeHeader = `<div class="time-group-header">${this.formatTime(m.ts)}</div>`;
        }
        lastTs = m.ts;
      }
      const mentionHtml = (m.text || '').replace(/@(\w+)/g, '<span class="mention-tag">@$1</span>');
      const contentHtml = m.type === 'voice'
        ? `<div class="voice-msg-wrapper"><div class="voice-msg-btn" onclick="this.classList.toggle('playing')"><span class="voice-icon">🎤</span><span class="voice-duration">${m.duration||'0:03'}</span><span class="voice-waveform">${'<span class="wave-bar"></span>'.repeat(5)}</span></div></div>`
        : m.type === 'image'
          ? `<img src="${e(m.url)}" class="chat-image" onclick="window.LZPrivate?window.LZPrivate.previewImage('${e(m.url)}'):(document.getElementById('image-preview-img').src='${e(m.url)}',document.getElementById('image-preview-overlay').style.display='flex',document.getElementById('image-preview-overlay').onclick=function(){this.style.display='none'})">`
          : mentionHtml;
      const selfAvatar = UP.isImageAvatar(UP.get().avatar)
        ? `<div class="message-avatar" style="background:${m.color||'#999'}"><img src="${e(UP.get().avatar)}" style="width:100%;height:100%;object-fit:cover;border-radius:8px"></div>`
        : `<div class="message-avatar" style="background:${m.color||'#999'}">${m.avatar||'👤'}</div>`;
      const otherAvatar = m.avatar && (m.avatar.startsWith('/uploads/') || m.avatar.startsWith('data:image/'))
        ? `<div class="message-avatar" style="background:${m.color||'#999'}"><img src="${e(m.avatar)}" style="width:100%;height:100%;object-fit:cover;border-radius:8px"></div>`
        : `<div class="message-avatar" style="background:${m.color||'#999'}">${m.avatar||'👤'}</div>`;
      return `${timeHeader}<div class="message ${m.isSelf ? 'message-self' : 'message-other'}" data-idx="${this.messages.indexOf(m)}">
        ${!m.isSelf ? otherAvatar : ''}
        <div class="message-body">
          ${!m.isSelf ? `<div class="message-name">${e(m.name||'')}</div>` : ''}
          <div class="message-bubble ${m.isSelf?'bubble-self':'bubble-other'}">${contentHtml}</div>
        </div>
        ${m.isSelf ? selfAvatar : ''}
      </div>`;
    }).join('');
    c.scrollTop = c.scrollHeight;
  },

  formatTime(ts) {
    const d = new Date(ts);
    const now = new Date();
    const pad = n => String(n).padStart(2,'0');
    const hhmm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    if (d.toDateString() === now.toDateString()) return hhmm;
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate()-1);
    if (d.toDateString() === yesterday.toDateString()) return `昨天 ${hhmm}`;
    return `${pad(d.getMonth()+1)}/${pad(d.getDate())} ${hhmm}`;
  },

  // @mention 自动补全
  initMention(input) {
    if (!input) return;
    let dropdown = null;
    const allChars = window.CHARACTERS || {};
    const charList = Object.values(allChars);

    input.addEventListener('input', () => {
      const val = input.value;
      const cursorPos = input.selectionStart;
      const textBeforeCursor = val.substring(0, cursorPos);
      const atMatch = textBeforeCursor.match(/@([^\s@，,。；;、！!？?…]*)$/);
      
      if (atMatch) {
        const query = atMatch[1].toLowerCase();
        const matches = charList.filter(c => 
          c.name.toLowerCase().includes(query) || c.id.toLowerCase().includes(query)
        );
        if (matches.length > 0) {
          if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.className = 'mention-dropdown';
            input.parentElement.appendChild(dropdown);
          }
          dropdown.innerHTML = matches.map(c => 
            `<div class="mention-item" data-id="${c.id}">${c.emoji} ${c.name}</div>`
          ).join('');
          dropdown.querySelectorAll('.mention-item').forEach(item => {
            item.onclick = () => {
              const beforeAt = textBeforeCursor.substring(0, atMatch.index);
              input.value = beforeAt + '@' + item.dataset.id + ' ' + val.substring(cursorPos);
              input.focus();
              dropdown.remove();
              dropdown = null;
            };
          });
          return;
        }
      }
      if (dropdown) { dropdown.remove(); dropdown = null; }
    });

    input.addEventListener('keydown', (e) => {
      if (!dropdown) return;
      if (e.key === 'Escape') { dropdown.remove(); dropdown = null; }
    });

    document.addEventListener('click', (e) => {
      if (dropdown && !dropdown.contains(e.target) && e.target !== input) {
        dropdown.remove(); dropdown = null;
      }
    });
  },

  async send(input) {
    const text = input.value.trim();
    if (!text || this.isLoading) return;
    const p = window.UserProfile.get();
    const imgMatch = text.match(/^https?:\/\/.*\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i);
    const msg = imgMatch
      ? { type: 'image', url: text, name: p.nickname, avatar: p.avatar, color: p.color, ts: Date.now(), isSelf: true }
      : { type: 'user', text, name: p.nickname, avatar: p.avatar, color: p.color, ts: Date.now(), isSelf: true };
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
          const m = { type: 'user', text: reply.text, name: reply.name, avatar: allChars[reply.charId], color: colors[reply.charId], ts: Date.now(), isSelf: false, charId: reply.charId };
          this.messages.push(m); this.renderMsgs();
          if (this.socket) this.socket.emit('gm', m);
          await new Promise(r => setTimeout(r, 200));
        }
      } else if (el) { el.innerHTML = '<span style="font-size:12px;color:var(--text-light)">角色们暂时没有回应</span>'; }
    } catch (e) { if (el) el.innerHTML = ''; console.error('群聊失败', e); }
    this.isLoading = false;
  },

  bindEvents() {
    if (!this.socket) return;
    this.socket.on('gm', msg => { if (!msg.isSelf) { this.messages.push(msg); this.renderMsgs(); } });
    this.socket.on('on', d => { const e = document.getElementById('goc'); if (e) e.textContent = d.c + '人在线'; });
    this.socket.on('off', d => { const e = document.getElementById('goc'); if (e) e.textContent = d.c + '人在线'; });
  },

  // Pull-to-refresh for group chat
  initPullRefresh() {
    const c = document.getElementById('gm');
    if (!c) return;
    let startY = 0, pulling = false;
    const onTouchStart = (e) => {
      if (c.scrollTop === 0) { startY = e.touches[0].clientY; pulling = true; }
    };
    const onTouchMove = (e) => {
      if (!pulling) return;
      const diff = e.touches[0].clientY - startY;
      if (diff > 60 && !c.dataset.loading) {
        c.dataset.loading = '1';
        const indicator = document.createElement('div');
        indicator.className = 'pull-indicator';
        indicator.textContent = '🔄 加载更早消息...';
        c.insertBefore(indicator, c.firstChild);
        fetch('/api/group-history?offset=' + this.messages.filter(m => m.type !== 'system').length).then(r => r.json()).then(msgs => {
          if (msgs.length > 0) {
            this.messages = [...msgs, ...this.messages];
            this.renderMsgs();
          }
          c.dataset.loading = '';
          const ind = c.querySelector('.pull-indicator');
          if (ind) ind.remove();
        }).catch(() => { c.dataset.loading = ''; const ind = c.querySelector('.pull-indicator'); if (ind) ind.remove(); });
      }
    };
    const onTouchEnd = () => { pulling = false; };
    c.addEventListener('touchstart', onTouchStart, { passive: true });
    c.addEventListener('touchmove', onTouchMove, { passive: true });
    c.addEventListener('touchend', onTouchEnd, { passive: true });
  }
};
window.GroupChat = G;
})();
