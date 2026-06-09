# 🐉 龙族聊天 - Dragon Chat

基于阿里云百炼大模型的龙族角色AI聊天应用，支持群聊和一对一私聊。

## 功能

- **群聊**：微信风格群聊界面，发送消息后5个龙族角色并行回复
- **私聊**：ChatGPT风格一对一聊天，与绘梨衣/芬格尔/楚子航/路明非/江南单独对话
- **深度角色还原**：每个角色拥有完整的行为树+情感模型+语言模式+核心信念
- **用户画像**：聊天轮数越多，亲密度越高（陌生人→认识→熟人→老朋友→灵魂挚友）
- **对话记忆**：聊天历史持久化存储，刷新不丢失
- **新对话**：支持清空历史重新开始

## 运行

```bash
# 1. 安装依赖
npm install

# 2. 配置 API Key
cp .env.example .env
# 编辑 .env 填入你的百炼 API Key
# 获取地址: https://bailian.console.aliyun.com/

# 3. 启动
npm start

# 4. 打开浏览器
# http://localhost:3000
```

## 环境要求

- Node.js >= 18
- 阿里云百炼 API Key

## 技术栈

- 后端: Express + Socket.IO
- 前端: 原生 HTML/CSS/JS
- AI: 阿里云百炼 qwen-plus
- 存储: JSON 文件持久化

## 项目结构

```
├── server.js          # 后端入口
├── package.json
├── .env.example       # 环境变量模板
├── public/
│   ├── index.html     # 前端入口
│   ├── css/style.css  # 样式
│   └── js/
│       ├── app.js         # 主逻辑
│       ├── group-chat.js  # 群聊
│       ├── private-chat.js# 私聊
│       ├── characters.js  # 角色数据
│       └── user-profile.js# 用户画像
└── data.json          # 聊天数据（运行后自动生成）
```

## License

MIT
