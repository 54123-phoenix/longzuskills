# 🐉 龙族聊天（Dragon Chat）

基于阿里云百炼大模型（Qwen）的《龙族》角色 AI 聊天应用，支持群聊和私聊，内置角色人格、多维关系成长系统和长期记忆。

---

## 功能列表

- **群聊模式** — 你在群中发言，路明非、绘梨衣、楚子航、芬格尔、江南五位角色会各自以自身人设回应你
- **私聊模式** — 点击侧边栏角色头像进入一对一私聊，对话更加深入
- **角色人格** — 每位角色拥有独立的 system prompt，严格遵守原作人设和表达风格（绘梨衣只说 3-8 字带省略号，楚子航回复不超过 15 字等）
- **多维关系系统** — 每次对话会分析信任、尊重、亲密、依赖四个维度并动态变化，影响角色对你的态度和措辞
- **长期记忆** — AI 自动从对话中提取关键事实，存储并在后续对话中引用（如你提过喜欢什么、来自哪里）
- **角色关系图** — 角色之间预设关系网络（如绘梨衣 ↔ 路明非 = 恋人/唯一信任者），AI 会基于此互动
- **对话历史** — 所有私聊对话持久化到 SQLite，支持历史回溯和清空
- **重新生成** — 对角色回复不满意可点击按钮重新生成（会回滚最后一条 AI 回复）
- **暗色模式** — 支持亮色/暗色主题切换，偏好保存到 localStorage
- **用户名片** — 可自定义昵称、头像、颜色，在群聊中展示
- **模型切换** — 支持 qwen-turbo（极速）、qwen-plus（平衡）、qwen-max（最强）三档模型

---

## 环境要求

- **Node.js** >= 18
- **阿里云百炼 API Key**（用于调用 Qwen 大模型）

---

## 安装步骤

```bash
# 1. 克隆项目或进入项目目录
cd dragon-chat

# 2. 安装依赖
npm install

# 3. 复制环境变量模板
cp .env.example .env

# 4. 编辑 .env 文件，填入你的 API Key
```

---

## 配置 API Key

1. 访问 [阿里云百炼控制台](https://bailian.console.aliyun.com/)
2. 登录阿里云账号（没有则先注册）
3. 在左侧菜单找到 **模型广场 → API-KEY 管理**
4. 创建一个新的 API Key 并复制
5. 打开项目根目录下的 `.env` 文件，将 `sk-your-api-key-here` 替换为你的 Key：

```
DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> 百炼新用户有免费额度（qwen-turbo 100 万 tokens / qwen-plus 100 万 tokens），足够日常使用。

---

## 运行

```bash
npm start
```

启动后访问：**http://localhost:3000**

首次打开会进入龙族聊天群，左侧边栏可切换角色私聊。建议先在群聊中随便说句话，看五位角色各自如何回应。

---

## 生产部署

### 使用 PM2 守护进程

```bash
npm install -g pm2
pm2 start server.js --name dragon-chat
pm2 save
pm2 startup   # 设置开机自启
```

### Nginx 反向代理（可选）

```nginx
server {
    listen 80;
    server_name chat.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
    }
}
```

---

## 故障排查

| 问题 | 原因 | 解决方法 |
|------|------|---------|
| `Error: listen EADDRINUSE :::3000` | 端口 3000 被占用 | 修改 `.env` 文件中 `PORT=3001` 或终止占用进程 |
| `ECONNREFUSED` / 页面无法连接 | 服务未启动或端口不对 | 确认 `node server.js` 正在运行，并访问正确的端口 |
| 角色不回复 / 回复为空 | API Key 无效或未配置 | 检查 `.env` 中 `DASHSCOPE_API_KEY` 是否正确，确认百炼账户有额度 |
| 角色回复缓慢 | 默认使用 qwen-plus 模型 | 切换到 qwen-turbo（极速模式）可显著提速 |
| 角色回复不符合人设 | 模型温度导致随机性 | 这是正常波动，可点击重新生成按钮获取新回复 |
| `data.db` 损坏 | SQLite 文件异常 | 删除 `src/data.db`，重启服务会自动重建（对话历史会丢失） |

---

## 项目结构

```
dragon-chat/
├── server.js                    # 入口文件，Express + WebSocket 服务
├── package.json                 # 项目配置和依赖
├── .env.example                 # 环境变量模板
├── .gitignore
├── public/                      # 前端静态资源
│   ├── index.html               # 主页面
│   ├── css/
│   │   └── style.css            # 全局样式（含暗色模式）
│   └── js/
│       ├── app.js               # 主入口：Socket 连接、主题切换、路由
│       ├── characters.js        # 角色元数据（id/名称/头像/颜色）
│       ├── group-chat.js        # 群聊 UI 组件
│       ├── private-chat.js      # 私聊 UI 组件
│       └── user-profile.js      # 用户名片组件
└── src/                         # 后端源码
    ├── routes/
    │   ├── chat.js              # 私聊 API（/api/chat、/api/regenerate、/api/history 等）
    │   └── group.js             # 群聊 API（/api/group-chat、/api/group-history）
    ├── services/
    │   ├── ai.js                # 百炼大模型调用封装（chat/completions）
    │   ├── characters.js        # 角色定义（system prompt、预设关系）
    │   ├── memory.js            # 对话历史、多维档案、长期记忆、角色关系图
    │   ├── prompts.js           # prompt 构建器（拼接系统提示 + 关系维度 + 记忆）
    │   └── storage.js           # SQL.js 数据库封装（SQLite in wasm）
    └── websocket.js             # Socket.IO：群聊在线状态广播
```

---

## 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | 原生 HTML/CSS/JavaScript，无框架 |
| **实时通信** | Socket.IO |
| **后端** | Node.js + Express |
| **AI 模型** | 通义千问（Qwen）via 阿里云百炼 DashScope API |
| **数据库** | SQLite（sql.js，纯 wasm 无需安装） |
| **进程守护** | PM2 |

---

## License

MIT
