# 🐉 龙族聊天（Dragon Chat）

基于阿里云百炼大模型（Qwen）的《龙族》角色 AI 聊天应用，支持群聊和私聊。

> **核心设计**: 从"聊天网站"演进为"数字人格蒸馏器"——12层 Prompt 构建 + 76条原著种子数据

---

## 功能列表

### 聊天功能
- **群聊模式** — 路明非、绘梨衣、楚子航、芬格尔、江南五位角色各自以人设回应
- **私聊模式** — 点击侧边栏角色头像进入一对一私聊
- **打字动画** — 角色回复逐字显示，真实聊天感
- **消息编辑** — 内联编辑已发送消息，触发角色重新回复
- **重新生成** — 对角色回复不满意可点击按钮重新生成
- **暗色模式** — 亮色/暗色主题切换
- **用户名片** — 自定义昵称、头像（emoji/图片上传）、颜色
- **聊天背景** — 自定义背景图片，半透明毛玻璃效果
- **模型切换** — qwen-turbo（极速）/ qwen-plus（平衡）/ qwen-max（最强）

### AI 人格蒸馏引擎（12层 Prompt）

| 层 | 内容 | 作用 |
|----|------|------|
| system | 角色人设 | 基本身份和性格 |
| dna | 核心欲望/恐惧/应对/时期/语言约束 | 最深层的角色 DNA |
| inner thought | 内心独白机制 | 角色先想后说，零额外 API |
| quote | 3条随机原著对白 | 模仿真实语气措辞 |
| event | 2个关键经历 | 角色能回忆自己的过去 |
| lore | 2条世界观百科 | 龙族设定准确性 |
| state | 心情/压力/精力/好感 | 角色内心状态影响回应 |
| relationship | 信任/尊重/亲密/依赖% | 数字化的关系进度 |
| relEvent | 关系变化原因 | 不只是数字，知道为什么 |
| episode | 最近7天经历+时间标签 | 角色有时间感 |
| belief | 对用户的理解/信念 | 角色"理解"用户而非"记住"用户 |
| memory | 长期事实+角色间关系 | 基础记忆层 |

### 种子数据（76条）
- **33条原著对白** — 5个角色的经典台词
- **27个关键事件** — 高架桥之夜、夏弥之死等
- **16条龙族百科** — 世界观/角色/事件/地点

### 安全与性能
- 全参数化 SQL 查询，零注入风险
- API 限流（20次/分钟）
- 写盘防抖（2秒窗口），减少 IO
- 记忆提取节流（每5轮触发）
- episode/belief/memory 三提取并行 fire-and-forget

---

## 环境要求

- **Node.js** >= 18
- **阿里云百炼 API Key**（用于调用 Qwen 大模型）

---

## 安装步骤

```bash
cd dragon-chat
npm install
cp .env.example .env
# 编辑 .env 填入 DASHSCOPE_API_KEY
```

---

## 运行

```bash
npm start
```

访问 **http://localhost:3000**

---

## 项目结构

```
dragon-chat/
├── server.js                     # Express + WebSocket 服务
├── public/                       # 前端静态资源
│   ├── index.html
│   ├── css/style.css
│   ├── js/
│   │   ├── app.js                # Socket + 主题切换
│   │   ├── characters.js         # 角色元数据
│   │   ├── group-chat.js         # 群聊 UI
│   │   ├── private-chat.js       # 私聊 UI
│   │   └── user-profile.js       # 用户名片 + 头像/背景上传
│   └── uploads/                  # 用户上传图片
├── src/
│   ├── routes/
│   │   ├── chat.js               # 私聊 API + 蒸馏管道
│   │   ├── group.js              # 群聊 API
│   │   └── upload.js             # 图片上传 API
│   ├── services/
│   │   ├── ai.js                 # 百炼 API + 3种提取器
│   │   ├── characters.js         # 角色定义 + DNA (欲望/恐惧/语言/关系)
│   │   ├── memory.js             # 8张表 CRUD + 状态分析
│   │   ├── prompts.js            # 12层 Prompt 构建器
│   │   ├── seed.js               # 76条种子数据
│   │   └── storage.js            # SQLite (sql.js) + 防抖写盘
│   ├── middleware/
│   │   └── rateLimit.js          # API 限流
│   └── websocket.js              # Socket.IO
├── docs/contracts/               # 各版本设计合约
├── tests/                        # 测试目录
└── data.db                       # SQLite 数据库
```

---

## 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | 原生 HTML/CSS/JS，无框架 |
| **实时通信** | Socket.IO |
| **后端** | Node.js + Express |
| **AI 模型** | 通义千问（Qwen）via 阿里云百炼 |
| **数据库** | SQLite（sql.js，纯 wasm） |
| **部署** | PM2 + Nginx |

---

## License

MIT
