(function() {
const PC = {
  current: null, histories: {}, streaming: false, profiles: {},
  model: localStorage.getItem('dm') || 'deepseek-chat',
  unreadCounts: {}, forwardedMsg: null,

  init() { this.loadProfiles(); Object.keys(window.CHARACTERS).forEach(id => { this.histories[id] = []; this.unreadCounts[id] = 0; }); this.sidebar(); },

  async loadProfiles() {
    try { const r = await fetch('/api/all-profiles?userId=default'); this.profiles = await r.json(); } catch(e) {}
    this.sidebar();
  },

  async loadHistory(id, offset) {
    try {
      const r = await fetch(`/api/history/${id}?limit=30&offset=${offset||0}&userId=default`);
      const d = await r.json();
      if (offset) { this.histories[id] = [...d.msgs, ...this.histories[id]]; }
      else { this.histories[id] = d.msgs || []; }
    } catch(e) { if(!offset) this.histories[id]=[]; }
  },

  sidebar() {
    const c = document.getElementById('private-chat-list');
    if (!c) return;
    const chars = window.CHARACTERS;
    let totalUnread = 0;
    c.innerHTML = `<div class="sidebar-section-title">💬 私聊</div>
      ${Object.values(chars).map(ch => {
        const prof = this.profiles[ch.id] || { count:0, trust:0, respect:0, closeness:0, dependency:0, labels:['陌生人'] };
        const top = [prof.trust, prof.closeness, prof.respect, prof.dependency];
        const score = Math.floor(top.reduce((a,b)=>a+b,0)/4);
        const unread = this.unreadCounts[ch.id] || 0;
        totalUnread += unread;
        return `<div class="private-chat-item ${this.current===ch.id?'active':''}" data-c="${ch.id}">
          <div class="private-chat-avatar" style="background:${ch.avatar?'transparent':ch.color};position:relative">${ch.avatar?`<img src="${window.escHtml(ch.avatar)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:ch.emoji}${unread>0?`<span class="unread-badge">${unread>99?'99+':unread}</span>`:''}</div>
          <div class="private-chat-info">
            <div class="private-chat-name">${ch.name}
              <span style="font-size:10px;color:${score>50?'#e8739a':score>20?'#f5a623':'#999'};margin-left:4px">${prof.labels[0]||'...'}</span>
            </div>
            <div class="private-chat-preview">${prof.count>0?prof.count+'轮 · 均'+score:'点击开始'}</div>
          </div>
        </div>`;
      }).join('')}
    `;
    c.querySelectorAll('.private-chat-item').forEach(el => el.onclick = () => {
      this.unreadCounts[el.dataset.c] = 0;
      this.open(el.dataset.c);
    });
    // Badge dot on mobile tab
    const dot = document.getElementById('badge-dot');
    if (dot) { dot.style.display = totalUnread > 0 && window.isMobile && window.isMobile() ? 'block' : 'none'; }
  },

  async open(id) {
    this.current = id;
    const ch = window.CHARACTERS[id]; if (!ch) return;
    await this.loadHistory(id);
    this.ch = this.histories[id] || [];
    const prof = this.profiles[id] || { count:0, trust:0, respect:0, closeness:0, dependency:0, labels:['陌生人'] };
    const score = Math.floor((prof.trust+prof.respect+prof.closeness+prof.dependency)/4);
    const dims = [
      { k:'信任', v:prof.trust, h:'透露秘密' },
      { k:'尊重', v:prof.respect, h:'认可观点' },
      { k:'亲密', v:prof.closeness, h:'主动交谈' },
      { k:'依赖', v:prof.dependency, h:'寻求帮助' }
    ];
    const dimHTML = dims.map(d =>
      `<div style="margin:4px 0;display:flex;align-items:center;gap:8px;font-size:11px">
        <span style="width:32px;color:var(--text-light)">${d.k}</span>
        <div style="flex:1;height:3px;background:var(--border);border-radius:2px;overflow:hidden">
          <div style="width:${d.v}%;height:100%;background:var(--primary);transition:width 0.5s"></div>
        </div>
        <span style="width:28px;text-align:right;color:var(--text-dim)">${d.v}</span>
        <span style="font-size:10px;color:var(--text-light)">${d.v>=80?d.h:d.v>=30?'进行中':'未触发'}</span>
      </div>`
    ).join('');
    const isMob = window.isMobile && window.isMobile();
    const main = document.getElementById('main-content');
    main.innerHTML = `<div class="private-chat-container">
      <div class="private-chat-header">
        <div class="private-chat-header-left">
          ${isMob?'<button class="mobile-back-btn" id="mob-back">←</button>':''}
          <div class="private-chat-header-avatar" style="background:${ch.avatar?'transparent':ch.color}">${ch.avatar?`<img src="${window.escHtml(ch.avatar)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:ch.emoji}</div>
          <div><div class="private-chat-header-name">${ch.name}
            <span class="role-badge ${id}">${['hly','fge','czh','lmf','jn'].indexOf(id)+1}/5</span>
            <span style="font-size:12px;color:#999;margin-left:6px">${prof.labels.join('·')||'陌生人'} · ${prof.count}轮</span></div></div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:11px;color:var(--text-light)">模型</span>
          <select id="ms" onchange="window.LZPrivate.model=this.value;localStorage.setItem('dm',this.value)">
            <option value="deepseek-chat" ${this.model==='deepseek-chat'?'selected':''}>💎 DeepSeek</option>
            <option value="deepseek-reasoner" ${this.model==='deepseek-reasoner'?'selected':''}>🧠 推理增强</option>
          </select>
          <button class="btn btn-secondary btn-sm" id="nc">🔄新</button>
        </div>
      </div>
      <div style="padding:8px 24px;border-bottom:1px solid var(--border);background:var(--card-bg)">${dimHTML}</div>
      <div class="private-chat-messages" id="pm">
        ${this.ch.length===0 ? `<div class="private-chat-welcome">
          <div class="welcome-avatar" style="background:${ch.avatar?'transparent':ch.color}">${ch.avatar?`<img src="${window.escHtml(ch.avatar)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:ch.emoji}</div>
          <div class="welcome-text">和 ${ch.name} 对话</div>
          <div class="private-chat-stats">均分${score} · ${prof.labels.join(',')}</div>
          <div class="intimacy-bar"><div class="intimacy-fill" style="width:${score}%"></div></div></div>` : ''}
      </div>
      <div class="chat-input-area"><div class="chat-input-wrapper">
        <button class="voice-input-btn" id="voice-input-btn" title="语音消息">🎤</button>
        <input class="chat-input" id="pi" placeholder="给 ${ch.name} 发送..." maxlength="500" ${this.streaming?'disabled':''}>
        <button class="chat-send-btn" id="ps" ${this.streaming?'disabled':''}>发送</button></div></div></div>`;

    if (isMob) {
      document.getElementById('mob-back').onclick = () => {
        const tabChats = document.getElementById('tab-chats');
        if (tabChats) tabChats.click();
      };
    }

    const i = document.getElementById('pi'), s = document.getElementById('ps');
    if (i && s) { s.onclick = () => { const t=i.value.trim(); if(t) this.sendMsg(id,t,i); }; i.onkeydown = e => { if(e.key==='Enter'){ const t=i.value.trim(); if(t) this.sendMsg(id,t,i); } }; }
    document.getElementById('nc')?.addEventListener('click', async () => {
      await fetch(`/api/history/${id}?userId=default`,{method:'DELETE'}); this.histories[id]=[]; this.ch=[];
      await this.loadProfiles(); this.open(id);
    });
    // Voice input button (send a simulated voice message)
    document.getElementById('voice-input-btn')?.addEventListener('click', () => {
      const durations = ['0:03','0:05','0:08','0:12'];
      const d = durations[Math.floor(Math.random()*durations.length)];
      this.ch.push({ text: '', isSelf: true, timestamp: Date.now(), type: 'voice', duration: d });
      this.render();
      this.fetchReply(id);
    });
    if (this.ch.length > 0) this.render();
    this.sidebar();
    this.initPullRefresh(id);
    this.initLongPress();
  },

  sendMsg(id, text, input) {
    // Check if text looks like an image URL
    const imgMatch = text.match(/^https?:\/\/.*\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i);
    if (imgMatch) {
      this.ch.push({ text: '', isSelf: true, timestamp: Date.now(), type: 'image', url: text });
    } else {
      this.ch.push({ text, isSelf: true, timestamp: Date.now() });
    }
    input.value = '';
    this.render();
    this.fetchReply(id);
  },

  render() {
    const c = document.getElementById('pm'); if (!c) return;
    const ch = window.CHARACTERS[this.current];
    const e = window.escHtml, id = this.current;
    // Time grouping: show timestamp header if gap > 3 minutes
    let lastTs = 0;
    c.innerHTML = this.ch.map((m,i) => {
      let timeHeader = '';
      if (m.timestamp) {
        const gap = m.timestamp - lastTs;
        if (!lastTs || gap > 180000) {
          timeHeader = `<div class="time-group-header">${this.formatTime(m.timestamp)}</div>`;
        }
        lastTs = m.timestamp;
      }
      const mentionHtml = (m.text || '').replace(/@(\w+)/g, '<span class="mention-tag">@$1</span>');
      const contentHtml = m.type === 'voice'
        ? `<div class="voice-msg-wrapper"><div class="voice-msg-btn" onclick="this.classList.toggle('playing')"><span class="voice-icon">🎤</span><span class="voice-duration">${m.duration||'0:03'}</span><span class="voice-waveform">${'<span class="wave-bar"></span>'.repeat(5)}</span></div></div>`
        : m.type === 'image'
          ? `<img src="${e(m.url)}" class="private-chat-image" onclick="window.LZPrivate.previewImage('${e(m.url)}')">`
          : mentionHtml;

      if (m.isSelf) {
        return `${timeHeader}<div class="private-msg private-msg-self" data-idx="${i}" data-ts="${m.timestamp||0}">
          <div class="private-msg-content">
            <div class="private-msg-bubble private-bubble-self">${contentHtml}</div>
            <div class="msg-actions" style="justify-content:flex-end">
              <button class="msg-action-btn" onclick="window.LZPrivate.editMsg(${i})">✏️</button>
              <button class="msg-action-btn" onclick="window.LZPrivate.regenerate(${i})">🔄</button>
            </div>
          </div></div>`;
      } else {
        const reactions = m.reactions && m.reactions.length > 0
          ? `<div class="emoji-reaction-bar">${m.reactions.map(r => `<span class="emoji-reaction-btn active">${r}</span>`).join('')}</div>`
          : '';
        return `${timeHeader}<div class="private-msg private-msg-other" data-char="${id}" data-idx="${i}" data-ts="${m.timestamp||0}">
          <div class="private-msg-avatar" style="background:${ch.avatar?'transparent':ch.color}">${ch.avatar?`<img src="${e(ch.avatar)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:ch.emoji}</div>
          <div class="private-msg-content">
            <div class="private-msg-name">${ch.name}</div>
            <div class="private-msg-bubble private-bubble-other">${contentHtml}</div>
            ${reactions}
            <div class="msg-actions"><button class="msg-action-btn" onclick="window.LZPrivate.regenerate(${i})">🔄</button></div>
          </div></div>`;
      }
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

  editMsg(idx) {
    const msg = this.ch[idx]; if (!msg || !msg.isSelf) return;
    const bubble = document.querySelector(`[data-idx="${idx}"] .private-bubble-self`);
    if (!bubble) return;
    const original = msg.text;
    bubble.contentEditable = 'true';
    bubble.focus();
    const sel = window.getSelection();
    if (sel) { const range = document.createRange(); range.selectNodeContents(bubble); sel.removeAllRanges(); sel.addRange(range); }
    const finish = () => {
      bubble.contentEditable = 'false';
      const newText = bubble.textContent.trim() || original;
      bubble.textContent = window.escHtml(newText);
      if (newText !== original) { msg.text = newText; this.ch = this.ch.slice(0, idx + 1); this.render(); this.fetchReply(this.current); }
    };
    bubble.onblur = finish;
    bubble.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); finish(); } };
  },

  async regenerate(idx) {
    const msg = this.ch[idx]; if (!msg) return;
    const cutIdx = msg.isSelf ? idx + 1 : idx;
    this.ch = this.ch.slice(0, cutIdx); this.render();
    this.showTyping();
    try {
      const r = await fetch('/api/regenerate', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ charId:this.current, model:this.model, userId:'default' }) });
      const d = await r.json();
      if (d.reply) { this.ch.push({ text:d.reply, isSelf:false, timestamp:Date.now() }); this.render(); }
    } catch(e) {}
    this.hideTyping();
  },

  showTyping() {
    const c = document.getElementById('pm');
    if (!c) return;
    const el = document.createElement('div');
    el.className = 'typing-indicator-new';
    el.id = 'typing-indicator-el';
    el.innerHTML = `<span>${(window.CHARACTERS[this.current]||{}).name||''} 正在输入</span><span class="typing-dots-wechat"><span></span><span></span><span></span></span>`;
    c.appendChild(el);
    c.scrollTop = c.scrollHeight;
  },

  hideTyping() {
    const el = document.getElementById('typing-indicator-el');
    if (el) el.remove();
  },

  async fetchReply(id) {
    this.streaming = true;
    const i = document.getElementById('pi'), s = document.getElementById('ps');
    if(i) { i.disabled=true; s.disabled=true; }
    this.showTyping();
    try {
      const r = await fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ charId:id, message:this.ch[this.ch.length-1].text, userId:'default', model:this.model }) });
      const d = await r.json();
      this.hideTyping();
      if (d.reply) { this.ch.push({ text:d.reply, isSelf:false, timestamp:Date.now() }); this.render(); }
      if (d.profile) {
        const old = this.profiles[id] || {};
        const deltas = [];
        if (old.trust !== d.profile.trust && d.profile.trust > 0) deltas.push(`信任+${d.profile.trust - (old.trust||0)}`);
        if (old.respect !== d.profile.respect && d.profile.respect > 0) deltas.push(`尊重+${d.profile.respect - (old.respect||0)}`);
        if (old.closeness !== d.profile.closeness && d.profile.closeness > 0) deltas.push(`亲密+${d.profile.closeness - (old.closeness||0)}`);
        if (old.dependency !== d.profile.dependency && d.profile.dependency > 0) deltas.push(`依赖+${d.profile.dependency - (old.dependency||0)}`);
        if (deltas.length > 0) {
          const existing = document.querySelector('.growth-delta'); if (existing) existing.remove();
          const toast = document.createElement('div'); toast.className = 'growth-delta'; toast.innerHTML = deltas.join(' ');
          document.body.appendChild(toast); setTimeout(() => toast.remove(), 3500);
        }
        this.profiles[id] = d.profile; this.sidebar();
      }
    } catch(e) { this.hideTyping(); }
    this.streaming = false;
    if(i) { i.disabled=false; s.disabled=false; i.focus(); }
  },

  // Long-press context menu
  initLongPress() {
    document.addEventListener('touchstart', (e) => {
      const msgEl = e.target.closest('.private-msg');
      if (!msgEl) return;
      const idx = parseInt(msgEl.dataset.idx);
      if (isNaN(idx)) return;
      const msg = this.ch[idx];
      if (!msg) return;

      let longPressTimer = setTimeout(() => {
        e.preventDefault();
        this.showActionSheet(idx, msg);
      }, 600);

      const cancel = () => { clearTimeout(longPressTimer); };
      msgEl.addEventListener('touchend', cancel, { once: true });
      msgEl.addEventListener('touchmove', cancel, { once: true });
    }, { passive: true });
  },

  showActionSheet(idx, msg) {
    const existing = document.querySelector('.action-sheet-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'action-sheet-overlay';

    const isOther = !msg.isSelf;
    overlay.innerHTML = `<div class="action-sheet">
      <div class="action-sheet-title">${isOther ? '收到消息' : '已发送消息'}</div>
      <div class="action-sheet-btn" data-action="copy">📋 复制</div>
      ${isOther ? `<div class="action-sheet-btn" data-action="react">😊 快速反应</div>` : ''}
      <div class="action-sheet-btn" data-action="forward">↗️ 转发</div>
      <div class="action-sheet-btn danger" data-action="delete">🗑️ 删除</div>
      <div class="action-sheet-cancel" data-action="cancel">取消</div>
    </div>`;
    document.body.appendChild(overlay);

    overlay.querySelectorAll('[data-action]').forEach(btn => {
      btn.onclick = () => {
        const action = btn.dataset.action;
        if (action === 'copy') {
          navigator.clipboard.writeText(msg.text || '');
        } else if (action === 'react') {
          this.showEmojiReactionPicker(idx, msg, overlay);
          return;
        } else if (action === 'forward') {
          this.showForwardDialog(idx, msg);
        } else if (action === 'delete') {
          this.ch.splice(idx, 1);
          this.render();
        }
        overlay.remove();
      };
    });

    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  },

  showEmojiReactionPicker(idx, msg, sheet) {
    const emojis = ['😊','😂','❤️','😢','😡','👍'];
    const picker = document.createElement('div');
    picker.className = 'emoji-reaction-picker';
    picker.style.position = 'fixed';
    picker.style.bottom = '160px';
    picker.style.left = '50%';
    picker.style.transform = 'translateX(-50%)';
    picker.innerHTML = emojis.map(e => `<span data-emoji="${e}">${e}</span>`).join('');
    document.body.appendChild(picker);

    picker.querySelectorAll('span').forEach(el => {
      el.onclick = () => {
        const emoji = el.dataset.emoji;
        if (!msg.reactions) msg.reactions = [];
        if (!msg.reactions.includes(emoji)) msg.reactions.push(emoji);
        this.render();
        picker.remove();
        if (sheet) sheet.remove();
      };
    });

    setTimeout(() => { if (picker.parentNode) picker.remove(); }, 5000);
  },

  showForwardDialog(idx, msg) {
    const chars = window.CHARACTERS;
    const overlay = document.createElement('div');
    overlay.className = 'action-sheet-overlay';
    overlay.innerHTML = `<div class="action-sheet">
      <div class="action-sheet-title">转发消息到...</div>
      <div class="forward-chat-list">
        ${Object.values(chars).filter(c => c.id !== this.current).map(c =>
          `<div class="forward-chat-item" data-target="${c.id}">
            <span>${c.emoji}</span>
            <span>${c.name}</span>
          </div>`
        ).join('')}
        <div class="forward-chat-item" data-target="__group__">
          <span style="font-size:20px">🐉</span>
          <span>龙族聊天群</span>
        </div>
      </div>
      <div class="action-sheet-cancel" style="cursor:pointer" onclick="this.closest('.action-sheet-overlay').remove()">取消</div>
    </div>`;
    document.body.appendChild(overlay);

    overlay.querySelectorAll('.forward-chat-item').forEach(item => {
      item.onclick = async () => {
        const target = item.dataset.target;
        if (target === '__group__') {
          if (window.GroupChat && window.GroupChat.messages) {
            window.GroupChat.messages.push({
              type: 'user', text: `[转发] ${msg.text || '(语音/图片)'}`,
              name: (window.UserProfile.get()||{}).nickname || '我',
              avatar: (window.UserProfile.get()||{}).avatar || '🐉',
              color: (window.UserProfile.get()||{}).color || '#7b68ee',
              ts: Date.now(), isSelf: true
            });
            window.GroupChat.renderMsgs();
          }
        } else {
          if (!this.histories[target]) this.histories[target] = [];
          const forwarded = { ...msg, timestamp: Date.now() };
          forwarded.text = msg.text ? `[转发] ${msg.text}` : msg.text;
          this.histories[target].push(forwarded);
        }
        overlay.remove();
      };
    });

    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  },

  // Image preview
  previewImage(url) {
    const overlay = document.getElementById('image-preview-overlay');
    const img = document.getElementById('image-preview-img');
    if (overlay && img) {
      img.src = url;
      overlay.style.display = 'flex';
      overlay.onclick = () => { overlay.style.display = 'none'; };
    }
  },

  // Pull-to-refresh
  initPullRefresh(id) {
    const c = document.getElementById('pm');
    if (!c) return;
    let startY = 0, pulling = false;
    const onTouchStart = (e) => {
      if (c.scrollTop === 0) {
        startY = e.touches[0].clientY;
        pulling = true;
      }
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
        this.loadHistory(id, this.ch.length).then(() => {
          this.render();
          c.dataset.loading = '';
          const ind = c.querySelector('.pull-indicator');
          if (ind) ind.remove();
        });
      }
    };
    const onTouchEnd = () => { pulling = false; };
    c.addEventListener('touchstart', onTouchStart, { passive: true });
    c.addEventListener('touchmove', onTouchMove, { passive: true });
    c.addEventListener('touchend', onTouchEnd, { passive: true });
  }
};
window.LZPrivate = PC;
window.PrivateChat = PC;
})();
