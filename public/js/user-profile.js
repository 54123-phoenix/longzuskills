const UserProfile = {
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
  render() {
    const p = this.get();
    const c = document.getElementById('user-profile');
    if (!c) return;
    c.innerHTML = `<div class="user-profile-avatar" style="background:${p.color}">${p.avatar}</div>
      <div class="user-profile-info">
        <div class="user-profile-name">${p.nickname}</div>
        <div class="user-profile-status">在线</div>
      </div>
      <div class="user-profile-edit">✏️</div>`;
    c.onclick = () => this.settings();
  },
  settings() {
    const p = this.get();
    const o = document.createElement('div');
    o.className = 'modal-overlay';
    o.innerHTML = `<div class="modal-content">
      <h2>设置个人资料</h2>
      <div class="form-group"><label>昵称</label>
        <input type="text" id="pn" value="${p.nickname}" maxlength="12"></div>
      <div class="form-group"><label>头像</label>
        <div class="emoji-picker">
          ${['😀','😎','🐉','🌸','🍔','🗡️','✍️','🦊','🐱','🐼','🌟','🔥','💪','🎮','📚','🌙','☀️','🍀'].map(e =>
            `<span class="emoji-option ${p.avatar===e?'selected':''}" data-e="${e}">${e}</span>`
          ).join('')}
        </div></div>
      <div class="form-group"><label>颜色</label>
        <div class="color-picker">
          ${['#7b68ee','#4a90d9','#e8739a','#f5a623','#2c3e50','#27ae60','#e74c3c','#8e44ad'].map(c =>
            `<span class="color-option ${p.color===c?'selected':''}" data-c="${c}" style="background:${c}"></span>`
          ).join('')}
        </div></div>
      <div class="form-actions">
        <button class="btn btn-secondary" id="pcancel">取消</button>
        <button class="btn btn-primary" id="psave">保存</button>
      </div>
    </div>`;
    document.body.appendChild(o);
    o.querySelectorAll('.emoji-option').forEach(el => el.onclick = () => {
      o.querySelectorAll('.emoji-option').forEach(e => e.classList.remove('selected')); el.classList.add('selected');
    });
    o.querySelectorAll('.color-option').forEach(el => el.onclick = () => {
      o.querySelectorAll('.color-option').forEach(e => e.classList.remove('selected')); el.classList.add('selected');
    });
    document.getElementById('psave').onclick = () => {
      const n = document.getElementById('pn').value.trim() || '龙族新兵';
      const a = o.querySelector('.emoji-option.selected')?.dataset.e || p.avatar;
      const cl = o.querySelector('.color-option.selected')?.dataset.c || p.color;
      this.update({ nickname: n, avatar: a, color: cl });
      document.body.removeChild(o);
      this.render();
    };
    document.getElementById('pcancel').onclick = () => document.body.removeChild(o);
  }
};
