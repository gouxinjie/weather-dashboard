# City Weather Dashboard

城市环境与天气大屏，面向单城市天气与环境信息展示场景，采用前后端分离架构，聚合和风天气数据，提供实时天气、趋势预报、空气质量、灾害预警与统计分析能力。

## 项目特点

- 单城市天气与环境大屏展示
- 首页聚合实时天气、24 小时趋势、7 天预报、AQI、预警、生活指数
- 统计页展示近 30 天温度、降水、AQI 与周/月统计
- 前端不直连第三方天气服务，统一由后端聚合转发
- 后端使用 SQLite 做快照落库、缓存读取与统计重算

## 技术栈

- 前端：React + Vite + TypeScript + React Router + Zustand + ECharts + SCSS
- 后端：Node.js + Express + TypeScript + SQLite
- 数据源：和风天气

## 目录结构

```text
weather-dashboard/
├── src/                  # 前端源码
├── server/               # 后端源码
├── scripts/              # 开发辅助脚本
├── 主页.png               # 首页设计图
├── 详情页.png             # 统计页设计图
├── package.json          # 根目录脚本
└── README.md
```

## 快速开始

### 1. 安装依赖

根目录依赖：

```bash
npm install
```

后端依赖：

```bash
cd server
npm install
```

### 2. 配置环境变量

在 `server` 目录下创建 `.env` 文件，可基于 `.env.example` 复制后修改。推荐至少配置以下字段：

```env
QWEATHER_API_KEY=你的和风天气Key
QWEATHER_API_HOST=你的专属API Host
PORT=3201
DEFAULT_LOCATION_ID=101020100
DEFAULT_CITY_NAME=上海
DB_PATH=./data/weather.db
LOG_LEVEL=info
SNAPSHOT_RETENTION_DAYS=90
```

说明：

- 前端开发服务默认运行在 `http://localhost:3200`
- 后端开发服务默认运行在 `http://localhost:3201`
- 前端通过 `/api` 代理到后端，因此建议后端端口保持为 `3201`

### 3. 启动开发环境

在项目根目录执行：

```bash
npm run dev
```

该命令会同时启动：

- 前端：`http://localhost:3200`
- 后端：`http://localhost:3201`

如果需要单独启动：

```bash
npm run dev:client
npm run dev:server
```

## 构建

前端构建：

```bash
npm run build
```

后端构建：

```bash
npm run server:build
```

## 主要接口

- `GET /api/cities/search`：城市搜索
- `POST /api/location/resolve-current`：解析当前定位城市
- `GET /api/screen/home`：首页聚合数据
- `GET /api/screen/hourly`：24 小时天气趋势
- `GET /api/screen/daily`：7 天天气预报
- `GET /api/screen/air/now`：实时空气质量
- `GET /api/screen/alerts`：灾害预警
- `GET /api/screen/indices`：生活指数
- `GET /api/screen/stats/detail`：统计详情

## 页面预览

### 首页设计图

![首页设计图](./主页.png)

### 统计页设计图

![统计页设计图](./详情页.png)

## 开发说明

- 当前仓库已配置双远端推送，可同时推送到 GitHub 与 Gitee
- `server/.env`、`server/data/`、`node_modules/`、构建产物已在 `.gitignore` 中忽略
- 如需接入生产环境，建议补充反向代理、日志采集、限流与密钥管理

## 开源协议

本项目基于 [MIT License](./LICENSE) 开源。
