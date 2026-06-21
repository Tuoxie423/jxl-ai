
# JXL-AI

一个有趣的 AI 互动 Web 应用，包含聊天、问答、游戏等多种功能。

## 项目简介

JXL-AI 是一个基于 Node.js 的互动 Web 应用，提供 AI 聊天机器人、投稿图像、互动游戏等功能。项目包含多个页面模块，可以与 AI 角色进行对话互动，体验有趣的 AI 功能。

首页：

![index](media\index.png)



## 网址

[点击访问](https://tuoxie.asia/)
链接：https://tuoxie.asia/





## 功能特性

- **AI 聊天** - 与 AI 角色进行实时对话互动

  ![chat](media\chat.gif)



- **图像上传** - 上传一些搞怪抽象图片

  ![upload](media\upload.png)



- **证书发放** - 整活证书生成 

- **互动游戏** - 包含瞄准游戏等多种趣味互动

## 技术栈

- Node.js 后端
- Express.js Web 服务器
- SQLite 数据库 (data/app.db)
- 原生 HTML/CSS/JavaScript 前端

## 项目结构

```
├── server.mjs          # Node.js 服务器入口
├── package.json      # 项目依赖配置
├── data/
│   └── app.db        # SQLite 数据库
└── public/
    ├── index.html   # 主页面（游戏、生成器等）
    ├── chat.html   # AI 聊天页面
    ├── intro.html  # 介绍页面
    ├── bestiary.html # 图像上传/图鉴页面
    └── assets/     # 静态资源（图片素材）
```

## 安装说明

1. 确保已安装 Node.js (v14+)
2. 安装项目依赖：

```bash
npm install
```

3. 启动服务器：

```bash
node server.mjs
```

4. 在浏览器中访问 `http://localhost:3000`测试

## 页面说明

| 页面 | 路径 | 功能描述 |
|------|------|----------|
| 首页 | `/` |首页|
| 聊天 | `/chat.html` | 与 AI 角色对话 |
| 动画 | `/intro.html` | 角色欢迎动画 |
| 图鉴 | `/bestiary.html` | 上传图像并展示 |

## 配置说明

- 服务器默认端口：`3000`
- 数据库文件：`data/app.db`
- 上传目录：`public/uploads/`
- 配置文件放在主目录下：`config.yaml`

## 依赖包

- express - Web 框架
- multer - 文件上传处理
- better-sqlite3 - SQLite 数据库

## 许可证

MIT License

## 作者

- GitHub: https://github.com/tuoxie423
- Gitee: https://gitee.com/tuoxie423