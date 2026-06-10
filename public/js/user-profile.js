(function() {
const UP = {
  _data: null,
  default: { nickname: '龙族新兵', avatar: '🐉', color: '#7b68ee' },

  load() {
    const s = localStorage.getItem('up');
    if (s) try { this._data = JSON.parse(s); } catch {}
    if (!this._data) this._data = { ...this.default };
    return this._data;
  },

  get() { if (!this._data) this.load(); return this._data; },

  update(u) { this._data = { ...this.get(), ...u }; localStorage.setItem('up', JSON.stringify(this._data)); },

  isImageAvatar(avatar) { return avatar && (avatar.startsWith('/uploads/') || avatar.startsWith('data:image/')); },

  renderAvatar(avatar, color) {
    if (this.isImageAvatar(avatar)) {
      return `<img src="${window.escHtml(avatar)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`;
    }
    return window.escHtml(avatar || '🐉');
  },

  render() {
    const p = this.get();
    const c = document.getElementById('user-profile');
    if (!c) return;
    const avatarHTML = this.isImageAvatar(p.avatar)
      ? `<img src="${window.escHtml(p.avatar)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
      : p.avatar;
    c.innerHTML = `<div class="user-profile-avatar" style="background:${p.isImage ? 'transparent' : p.color}">${avatarHTML}</div>
      <div class="user-profile-info">
        <div class="user-profile-name">${window.escHtml(p.nickname)}</div>
        <div class="user-profile-status">在线</div>
      </div>
      <div class="user-profile-edit">✏️</div>`;
    c.onclick = () => this.settings();
  },

  settings() {
    const p = this.get();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal-content" style="max-width:480px">
      <h2>设置个人资料</h2>

      <div class="form-group"><label>昵称</label>
        <input type="text" id="pn" value="${window.escHtml(p.nickname)}" maxlength="12"></div>

      <div class="form-group"><label>头像</label>
        <div class="emoji-picker" id="emoji-grid">
          ${['😀','😎','🐉','🌸','🍔','🗡️','✍️','🦊','🐱','🐼','🌟','🔥','💪','🎮','📚','🌙','☀️','🍀'].map(e =>
            `<span class="emoji-option ${p.avatar===e?'selected':''}" data-e="${e}">${e}</span>`
          ).join('')}
        </div>
        <div style="margin-top:10px;display:flex;align-items:center;gap:10px">
          <span style="font-size:12px;color:var(--text-light)">或上传图片</span>
          <label class="upload-btn">
            📁 选择图片
            <input type="file" id="avatar-file" accept="image/*" style="display:none">
          </label>
          <span id="avatar-preview-name" style="font-size:11px;color:var(--text-light)"></span>
        </div>
      </div>

      <div class="form-group"><label>颜色</label>
        <div class="color-picker" id="color-grid">
          ${['#7b68ee','#4a90d9','#e8739a','#f5a623','#2c3e50','#27ae60','#e74c3c','#8e44ad'].map(c =>
            `<span class="color-option ${p.color===c?'selected':''}" data-c="${c}" style="background:${c}"></span>`
          ).join('')}
        </div></div>

      <div class="form-group"><label>聊天背景</label>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <label class="upload-btn">
            🖼️ 上传背景
            <input type="file" id="bg-file" accept="image/*" style="display:none">
          </label>
          <button class="btn btn-secondary btn-sm" id="bg-reset">🚫 清除背景</button>
          <span id="bg-preview-name" style="font-size:11px;color:var(--text-light)"></span>
        </div>
        <div id="bg-preview" style="margin-top:8px;height:60px;border-radius:6px;background-size:cover;background-position:center;border:1px solid var(--border);${localStorage.getItem('bg')?'background-image:url('+localStorage.getItem('bg')+')':'display:none'}"></div>
      </div>

      <div class="form-actions">
        <button class="btn btn-secondary" id="pcancel">取消</button>
        <button class="btn btn-primary" id="psave">保存</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);

    overlay.querySelectorAll('.emoji-option').forEach(el => el.onclick = () => {
      overlay.querySelectorAll('.emoji-option').forEach(e => e.classList.remove('selected'));
      el.classList.add('selected');
    });
    overlay.querySelectorAll('.color-option').forEach(el => el.onclick = () => {
      overlay.querySelectorAll('.color-option').forEach(e => e.classList.remove('selected'));
      el.classList.add('selected');
    });

    let pendingAvatar = null;
    const avatarFile = overlay.querySelector('#avatar-file');
    avatarFile.onchange = async () => {
      const f = avatarFile.files[0];
      if (!f) return;
      overlay.querySelector('#avatar-preview-name').textContent = f.name;
      try {
        const dataUrl = await fileToDataUrl(f);
        pendingAvatar = dataUrl;
      } catch (e) { console.error('读取图片失败', e); }
    };

    const bgFile = overlay.querySelector('#bg-file');
    bgFile.onchange = async () => {
      const f = bgFile.files[0];
      if (!f) return;
      overlay.querySelector('#bg-preview-name').textContent = f.name;
      try {
        const dataUrl = await fileToDataUrl(f);
        const preview = overlay.querySelector('#bg-preview');
        preview.style.display = 'block';
        preview.style.backgroundImage = `url(${dataUrl})`;
        preview.dataset.bg = dataUrl;
      } catch (e) { console.error('读取背景失败', e); }
    };

    overlay.querySelector('#bg-reset').onclick = () => {
      localStorage.removeItem('bg');
      document.body.style.backgroundImage = '';
      document.body.style.backgroundSize = '';
      const preview = overlay.querySelector('#bg-preview');
      preview.style.display = 'none';
      preview.dataset.bg = '';
      overlay.querySelector('#bg-preview-name').textContent = '已清除';
    };

    document.getElementById('psave').onclick = async () => {
      const nickname = document.getElementById('pn').value.trim() || '龙族新兵';
      const emoji = overlay.querySelector('.emoji-option.selected')?.dataset.e || p.avatar;
      const color = overlay.querySelector('.color-option.selected')?.dataset.c || p.color;
      const bgPreview = overlay.querySelector('#bg-preview');
      const newBg = bgPreview.dataset.bg;

      let avatar = pendingAvatar ? await uploadImage(pendingAvatar) : (pendingAvatar === undefined ? emoji : emoji);
      if (!avatar) avatar = '🐉';

      this.update({ nickname, avatar, color });
      if (newBg) {
        localStorage.setItem('bg', newBg);
        document.body.style.backgroundImage = `url(${newBg})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundAttachment = 'fixed';
        document.body.style.backgroundPosition = 'center';
      } else if (newBg === '') {
        localStorage.removeItem('bg');
        document.body.style.backgroundImage = '';
        document.body.style.backgroundSize = '';
        document.body.style.backgroundAttachment = '';
      }

      document.body.removeChild(overlay);
      this.render();
      applyBackground();
    };
    document.getElementById('pcancel').onclick = () => document.body.removeChild(overlay);

    overlay.onclick = (e) => { if (e.target === overlay) document.body.removeChild(overlay); };
  }
};

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadImage(dataUrl) {
  try {
    const r = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataUrl })
    });
    const d = await r.json();
    return d.url || dataUrl;
  } catch (e) {
    console.error('上传失败,使用本地图片', e);
    return dataUrl;
  }
}

function applyBackground() {
  const bg = localStorage.getItem('bg');
  if (bg) {
    document.body.style.backgroundImage = `url(${bg})`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundAttachment = 'fixed';
    document.body.style.backgroundPosition = 'center';
    document.body.classList.add('bg-image');
    document.querySelector('.main-content')?.classList.add('has-bg');
    document.querySelector('.chat-messages')?.classList.add('has-bg');
    document.querySelector('.private-chat-messages')?.classList.add('has-bg');
  } else {
    document.body.style.backgroundImage = '';
    document.body.style.backgroundSize = '';
    document.body.style.backgroundAttachment = '';
    document.body.classList.remove('bg-image');
    document.querySelector('.main-content')?.classList.remove('has-bg');
  }
}

window.UserProfile = UP;
window.applyBackground = applyBackground;
})();
