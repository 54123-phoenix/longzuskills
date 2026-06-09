let socket = null;
let currentModel = localStorage.getItem('dm') || 'qwen-plus';
const MODELS = { 'qwen-turbo':'⚡ 极速', 'qwen-plus':'🚀 平衡', 'qwen-max':'💎 最强' };

document.addEventListener('DOMContentLoaded', () => {
  UserProfile.load();
  UserProfile.render();

  // Dark mode
  if (localStorage.getItem('dark')==='1') document.body.classList.add('dark');
  const tm = document.getElementById('theme-btn');
  tm.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
  tm.title = document.body.classList.contains('dark') ? '亮色模式' : '暗色模式';
  tm.onclick = () => {
    const d = document.body.classList.toggle('dark');
    localStorage.setItem('dark', d?'1':'0');
    tm.textContent = d ? '☀️' : '🌙';
    tm.title = d ? '亮色模式' : '暗色模式';
  };

  socket = io();
  socket.on('connect', () => {
    const p = UserProfile.get();
    socket.emit('join-group', { nickname: p.nickname, avatar: p.avatar, color: p.color });
    GroupChat.init(socket);
    PrivateChat.init();
    document.getElementById('group-chat-entry').onclick = showGroup;
    showGroup();
  });
  socket.on('connect_error', () => {
    document.getElementById('main-content').innerHTML =
      `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-light);font-size:16px;padding:20px">⚠️ 无法连接服务器<br><span style="font-size:12px;margin-top:6px;display:block"><code>node server.js</code></span></div>`;
  });
});

function showGroup() {
  document.querySelectorAll('.sidebar-item, .private-chat-item').forEach(e => e.classList.remove('active'));
  document.getElementById('group-chat-entry')?.classList.add('active');
  const main = document.getElementById('main-content');
  let area = document.getElementById('group-chat-area');
  if (!area) { GroupChat.render(); area = document.getElementById('group-chat-area'); }
  main.innerHTML = '';
  if (area) main.appendChild(area);
}
