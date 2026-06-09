const GroupChat = {
  messages: [],
  socket: null,

  init(socket) {
    this.socket = socket;
    this.loadHistory();
    this.bindEvents();
    this.render();
  },

  loadHistory() {
    const stored = localStorage.getItem('dragon_group_chat_v2');
    if (stored) {
      try { this.messages = JSON.parse(stored); } catch { this.messages = []; }
    }
    if (this.messages.length === 0) {
      this.addSystemMessage('欢迎加入龙族聊天群！在这里你可以和所有角色一起聊天。');
      this.addSystemMessage('💡 发送消息后，角色们会用AI自动回复你');
    }
  },

  saveHistory() {
    localStorage.setItem('dragon_group_chat_v2', JSON.stringify(this.messages));
  },

  addSystemMessage(text) {
    this.messages.push({ type: 'system', text, timestamp: Date.now() });
    this.saveHistory();
  },

  addMessage(msg) {
    this.messages.push(msg);
    this.saveHistory();
    if (document.getElementById('group-chat-area') && !document.getElementById('group-chat-area').classList.contains('hidden')) {
      this.renderMessages();
    }
  },

  render() {
    const container = document.getElementById('group-chat-area');
    if (!container) return;
    container.innerHTML = `
      <div class="chat-header">
        <div class="chat-header-info">
          <div class="chat-header-title">🐉 龙族聊天群</div>
          <div class="chat-header-members" id="group-online-count">成员在线</div>
        </div>
      </div>
      <div class="chat-messages" id="group-messages"></div>
      <div class="typing-indicator" id="group-typing"></div>
      <div class="chat-input-area">
        <div class="chat-input-wrapper">
          <input type="text" class="chat-input" id="group-input" placeholder="输入消息..." maxlength="500">
          <button class="chat-send-btn" id="group-send-btn">发送</button>
        </div>
      </div>
    `;

    this.renderMessages();
    this.bindChatEvents();
  },

  renderMessages() {
    const container = document.getElementById('group-messages');
    if (!container) return;

    container.innerHTML = this.messages.map(msg => {
      if (msg.type === 'system') {
        return `<div class="message-system">${escapeHtml(msg.text)}</div>`;
      }

      const isSelf = msg.isSelf;
      const time = formatTime(msg.timestamp);
      const name = msg.nickname || msg.name || '未知';
      const color = msg.color || '#999';
      const identicon = msg.avatar || '👤';

      return `
        <div class="message ${isSelf ? 'message-self' : 'message-other'}">
          ${!isSelf ? `<div class="message-avatar" style="background:${color}">${identicon}</div>` : ''}
          <div class="message-body">
            ${!isSelf ? `<div class="message-name">${escapeHtml(name)}</div>` : ''}
            <div class="message-bubble ${isSelf ? 'bubble-self' : 'bubble-other'}" style="${isSelf ? `background:${color}33` : ''}">
              ${escapeHtml(msg.text)}
            </div>
            <div class="message-time">${time}</div>
          </div>
          ${isSelf ? `<div class="message-avatar" style="background:${color}">${identicon}</div>` : ''}
        </div>
      `;
    }).join('');

    container.scrollTop = container.scrollHeight;
  },

  bindChatEvents() {
    const input = document.getElementById('group-input');
    const sendBtn = document.getElementById('group-send-btn');
    if (!input || !sendBtn) return;

    const sendMessage = () => {
      const text = input.value.trim();
      if (!text) return;

      const profile = UserProfile.get();
      const msg = {
        type: 'user', text,
        nickname: profile.nickname,
        avatar: profile.avatar,
        color: profile.color,
        timestamp: Date.now(),
        isSelf: true
      };

      this.addMessage(msg);
      if (this.socket) {
        this.socket.emit('group-message', msg);
        this.socket.emit('stop-typing', { nickname: profile.nickname });
      }
      input.value = '';
      input.focus();

      this.triggerCharacterReplies(text);
    };

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMessage();
    });

    input.addEventListener('input', () => {
      if (!this.socket) return;
      const profile = UserProfile.get();
      if (input.value.trim()) {
        this.socket.emit('typing', { nickname: profile.nickname });
      } else {
        this.socket.emit('stop-typing', { nickname: profile.nickname });
      }
    });
  },

  async triggerCharacterReplies(userMessage) {
    const profile = UserProfile.get();
    const typingEl = document.getElementById('group-typing');
    if (typingEl) typingEl.textContent = '角色们正在思考...';

    const charNames = { hly: '绘梨衣', fge: '芬格尔', czh: '楚子航', lmf: '路明非', jn: '江南' };
    const charColors = { hly: '#e8739a', fge: '#f5a623', czh: '#4a90d9', lmf: '#7b68ee', jn: '#2c3e50' };
    const charEmojis = { hly: '🌸', fge: '🍔', czh: '🗡️', lmf: '🐉', jn: '✍️' };

    const recentHistory = this.messages.slice(-10).map(m => ({
      charId: m.charId || null,
      text: m.text
    }));

    try {
      const res = await fetch('/api/group-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: recentHistory,
          userName: profile.nickname
        })
      });
      const data = await res.json();

      if (data.replies && data.replies.length > 0) {
        if (typingEl) typingEl.textContent = '';

        for (let i = 0; i < data.replies.length; i++) {
          const reply = data.replies[i];
          await this.showGroupCharReply(reply, charColors, charEmojis, i * 1500);
        }
      } else {
        if (typingEl) typingEl.textContent = '';
      }
    } catch (err) {
      console.error('Group chat API error:', err);
      if (typingEl) typingEl.textContent = '';
    }
  },

  showGroupCharReply(reply, charColors, charEmojis, delay) {
    return new Promise(resolve => {
      setTimeout(() => {
        const msg = {
          type: 'user',
          text: reply.text,
          nickname: reply.name,
          name: reply.name,
          charId: reply.charId,
          avatar: charEmojis[reply.charId] || '👤',
          color: charColors[reply.charId] || '#999',
          timestamp: Date.now(),
          isSelf: false
        };

        if (this.socket) {
          this.socket.emit('char-typing', { charId: reply.charId, name: reply.name });
        }

        this.addMessage(msg);

        if (this.socket) {
          this.socket.emit('group-message', msg);
        }

        setTimeout(resolve, 300);
      }, delay);
    });
  },

  bindEvents() {
    if (!this.socket) return;
    this.socket.on('group-message', (msg) => {
      if (msg.isSelf) return;
      this.addMessage(msg);
    });

    this.socket.on('user-typing', (data) => {
      const el = document.getElementById('group-typing');
      if (el) el.textContent = `${escapeHtml(data.nickname)} 正在输入...`;
    });

    this.socket.on('char-typing', (data) => {
      const el = document.getElementById('group-typing');
      if (el) el.textContent = `${escapeHtml(data.name)} 正在输入...`;
    });

    this.socket.on('user-stop-typing', () => {
      const el = document.getElementById('group-typing');
      if (el) el.textContent = '';
    });

    this.socket.on('user-online', (data) => {
      const el = document.getElementById('group-online-count');
      if (el) el.textContent = `${data.onlineCount} 人在线`;
    });

    this.socket.on('user-offline', (data) => {
      const el = document.getElementById('group-online-count');
      if (el) el.textContent = `${data.onlineCount} 人在线`;
    });
  }
};

function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const hhmm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (d.toDateString() === now.toDateString()) return hhmm;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `昨天 ${hhmm}`;
  return `${pad(d.getMonth()+1)}/${pad(d.getDate())} ${hhmm}`;
}
