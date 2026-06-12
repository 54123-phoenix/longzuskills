(function() {
let socket = null;

  document.addEventListener('DOMContentLoaded', () => {
  const UP = window.UserProfile;
  UP.load(); UP.render();
  window.applyBackground();

  if (localStorage.getItem('dark')==='1') document.body.classList.add('dark');
  const tm = document.getElementById('theme-btn');
  if (tm) {
    tm.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
    tm.onclick = () => {
      const d = document.body.classList.toggle('dark');
      localStorage.setItem('dark', d?'1':'0');
      tm.textContent = d ? '☀️' : '🌙';
    };
  }

  socket = io();
  socket.on('connect', () => {
    const p = UP.get();
    socket.emit('join-group', { nickname: p.nickname, avatar: p.avatar, color: p.color });
    window.GroupChat.init(socket);
    window.PrivateChat.init();
    document.getElementById('group-chat-entry').onclick = showGroup;
    showGroup();
    initMobileTabs();
  });

  socket.on('connect_error', () => {
    document.getElementById('main-content').innerHTML =
      `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-light);font-size:16px;padding:20px">⚠️ 无法连接服务器<br><span style="font-size:12px;margin-top:6px;display:block"><code>node server.js</code></span></div>`;
  });
});

function initMobileTabs() {
  const tabGroup = document.getElementById('tab-group');
  const tabChats = document.getElementById('tab-chats');
  const tabMenu = document.getElementById('tab-menu');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  function setActiveTab(tab) {
    document.querySelectorAll('.mobile-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  }

  tabGroup.onclick = () => {
    setActiveTab(tabGroup);
    closeSidebar();
    showGroup();
  };

  tabChats.onclick = () => {
    setActiveTab(tabChats);
    closeSidebar();
    // Open first private chat if none open
    if (!window.PrivateChat.current) {
      const first = document.querySelector('.private-chat-item');
      if (first) first.click();
    } else {
      window.PrivateChat.open(window.PrivateChat.current);
    }
  };

  tabMenu.onclick = () => {
    setActiveTab(tabMenu);
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
  };

  overlay.onclick = closeSidebar;

  // Detect mobile
  function isMobile() { return window.innerWidth < 768; }
  window.isMobile = isMobile;

  // When a private chat item is clicked, switch to chats tab on mobile
  document.addEventListener('click', function(e) {
    const item = e.target.closest('.private-chat-item');
    if (item && isMobile()) {
      setActiveTab(tabChats);
      closeSidebar();
    }
  });

  // When group chat entry is clicked, switch to group tab on mobile
  document.getElementById('group-chat-entry').onclick = function() {
    if (isMobile()) {
      setActiveTab(tabGroup);
      closeSidebar();
    }
    showGroup();
  };

  // Handle resize
  window.addEventListener('resize', function() {
    if (!isMobile()) {
      closeSidebar();
      sidebar.style.position = '';
      sidebar.style.left = '';
      sidebar.style.width = '';
      sidebar.style.height = '';
      sidebar.style.zIndex = '';
      sidebar.style.paddingTop = '';
    } else {
      sidebar.style.position = 'fixed';
    }
  });
}

function showGroup() {
  document.querySelectorAll('.sidebar-item, .private-chat-item').forEach(e => e.classList.remove('active'));
  document.getElementById('group-chat-entry')?.classList.add('active');
  const main = document.getElementById('main-content');
  let area = document.getElementById('group-chat-area');
  if (!area) { window.GroupChat.render(); area = document.getElementById('group-chat-area'); }
  main.innerHTML = '';
  if (area) main.appendChild(area);
}
})();
