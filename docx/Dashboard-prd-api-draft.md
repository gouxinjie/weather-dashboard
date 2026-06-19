# 城市环境与天气大屏 PRD 与接口文档草案

## 1. 文档信息

- 项目中文名：城市环境与天气大屏
- 项目英文名：City Weather Dashboard
- 文档版本：v1.0
- 文档日期：2026-06-12
- 数据源方案：和风天气为主数据源

## 2. 项目背景

城市天气类大屏常见问题是“展示效果强，但信息结构弱”。很多页面只展示实时温度和天气图标，缺少对未来趋势、空气质量、灾害预警和周期统计的统一组织，导致页面更像简单看板，而不是完整的数据产品。

本项目希望围绕单城市构建一个天气与环境大屏，在一个页面中同时回答以下问题：

- 现在天气怎么样
- 接下来 24 小时和未来 7 天会怎么变化
- 空气质量是否健康
- 当前是否有灾害预警
- 近 7 天和近 30 天的天气与降水有什么趋势

除主页面外，项目还提供城市选择抽屉和统计详情页，用于完成城市切换与长周期数据查看。

## 3. 产品目标

### 3.1 核心目标

打造一个以天气为视觉中心的城市环境可视化大屏，用于统一展示实时天气、未来趋势、空气质量、灾害预警、生活指数和日周月统计。

### 3.2 业务目标

- 形成一个完整、可持续更新的天气数据展示作品
- 提供一眼可读的城市天气状态总览
- 提供趋势型信息而不仅是单点实时数据
- 提供可演示、可部署、可扩展的前后端项目模板

### 3.3 成功标准

- 首页能够突出展示天气核心状态
- 能展示未来 24 小时与未来 7 天趋势
- 能展示 AQI 与预警信息
- 能展示周统计与月统计，并明确标记统计样本期
- 首次进入页面能够优先定位当前城市，失败时自动回退默认城市
- 能稳定使用免费接口完成 MVP

## 4. 目标用户

- 普通查看用户：关注当前天气、空气和出行建议
- 展示型用户：用于展厅、作品集、演示屏
- 管理视角用户：快速了解城市天气风险和环境状态

## 5. 产品范围

### 5.1 本期范围

- 单城市天气与环境大屏
- 实时天气
- 24 小时天气趋势
- 7 天天气预报
- 分钟级降水
- 实时空气质量
- 实时预警
- 生活指数
- 周统计与月统计
- 当前月统计按“截至最新采样日”展示
- 首次进入页面自动定位当前城市
- 城市选择抽屉
- 统计详情页

### 5.2 暂不纳入本期

- 多城市对比
- 多用户系统
- 登录与权限系统
- 精细 GIS 图层
- 多年历史气候分析
- 复杂后台管理系统

## 6. 数据源策略

### 6.1 主数据源

主数据源使用和风天气。通过单一数据源覆盖城市搜索、实时天气、逐小时预报、每日预报、分钟级降水、空气质量、预警、生活指数和最近 10 天历史回看。

### 6.2 接口调用策略

- 前端不直接调用第三方接口
- Node.js 后端负责请求和风天气
- 后端统一字段命名与响应结构
- 后端负责缓存与聚合
- SQLite 负责存储每日快照与统计结果
- 对前端公开的业务接口统一使用 `locationId`
- 对第三方接口所需的坐标由服务端根据 `locationId` 自行解析
- 首次定位由浏览器提供坐标，后端负责解析为城市与 `locationId`

### 6.3 数据分层

- 第三方原始数据层：和风天气原始响应
- 服务聚合层：后端转换后的统一业务对象
- 本地统计层：按日、周、月聚合后的业务统计
- 前端展示层：页面组件直接消费统一接口

## 7. 页面结构

项目采用“1 个主页面 + 1 个城市选择抽屉 + 1 个统计详情页”的结构。

### 7.0 页面组成

- 主页面：城市环境与天气大屏
- 抽屉：城市选择 / 搜索抽屉
- 页面：统计详情页

### 7.0.1 主页面定位

- 主页面为默认首页
- 承载天气主模块、空气质量、预警、趋势和统计摘要
- 适合大屏展示与实时查看

### 7.0.2 城市选择抽屉定位

- 不单独占用页面路由
- 从主页面入口打开
- 用于城市搜索、切换、定位和默认城市设置

### 7.0.3 统计详情页定位

- 单独页面承载长周期统计和更高信息密度内容
- 用于查看近 30 天温度、降水、AQI 和统计说明
- 作为主页面统计摘要的下钻页面

### 7.0.4 主页面布局

主页面采用“顶部状态栏 + 中间天气主模块 + 两侧辅助模块 + 底部统计带”的结构，天气模块为视觉中心。

### 7.1 首次进入定位规则

- 页面首次进入时优先尝试获取浏览器地理定位
- 定位成功后，前端将坐标发送给后端解析当前城市
- 后端返回当前城市对应的 `locationId`、城市名称和时区
- 页面使用该 `locationId` 加载首页聚合数据
- 若定位失败、超时或被拒绝，则回退到默认城市
- 若本地已有最近一次成功城市，则优先使用最近一次成功城市
- 用户手动切换城市后，应覆盖自动定位结果并写入本地缓存

### 7.2 顶部状态栏

显示内容：

- 城市名称
- 当前日期时间
- 数据更新时间
- 当前天气摘要
- 当前 AQI 等级
- 当前预警状态

### 7.2 中间天气主模块

显示内容：

- 当前温度
- 体感温度
- 当前天气现象
- 高温 / 低温
- 风向风力
- 湿度
- 能见度
- 气压
- 当前降水量
- 紫外线强度

### 7.3 中间下方 24 小时趋势

显示内容：

- 24 小时温度折线
- 24 小时降水概率柱图
- 24 小时天气现象变化
- 日出日落时间

### 7.4 左侧天气统计模块

显示内容：

- 今日天气摘要
- 本周平均气温
- 本周总降水
- 本周雨天数
- 本月平均气温（截至最新采样日）
- 本月累计降水（截至最新采样日）
- 本月天气类型占比（已采样天数）

### 7.5 左下 7 天天气预报

显示内容：

- 日期
- 白天 / 夜间天气
- 最高温 / 最低温
- 日降水量
- 风力

### 7.6 右侧空气质量模块

显示内容：

- AQI
- 空气质量等级
- 首要污染物
- PM2.5
- PM10
- NO2
- SO2
- O3
- CO
- 24 小时 AQI 趋势

### 7.7 右侧预警模块

显示内容：

- 是否存在预警
- 预警类型
- 预警等级
- 发布时间
- 有效时间
- 说明
- 防护建议

### 7.8 右下生活指数模块

显示内容：

- 穿衣指数
- 洗车指数
- 运动指数
- 感冒指数
- 紫外线指数
- 出行建议

### 7.9 底部统计带

显示内容：

- 近 7 天温度趋势
- 近 7 天降水趋势
- 近 30 天累计降水
- 近 30 天天气类型占比
- 本月极端天气提示

### 7.10 城市选择抽屉

显示内容：

- 城市搜索框
- 当前定位城市
- 最近访问城市
- 热门城市
- 默认城市设置入口

交互要求：

- 点击主页面顶部城市名或定位图标后打开
- 支持搜索后直接切换城市
- 支持一键回到当前定位城市
- 切换成功后关闭抽屉并刷新主页面数据

### 7.11 统计详情页

显示内容：

- 近 30 天温度趋势
- 近 30 天降水趋势
- 近 30 天 AQI 趋势
- 近 30 天天气类型占比
- 周统计明细
- 月统计明细
- 样本期说明
- 数据更新时间与数据来源说明

交互要求：

- 由主页面统计摘要卡进入
- 页面顶部支持返回主页面
- 所有图表支持查看具体日期与指标值

## 8. UI 设计要求

### 8.1 风格定位

整体采用“气象指挥台 + 城市报时牌”风格，不使用蓝紫霓虹大屏模板。

### 8.2 视觉关键词

- atmospheric
- urban forecast
- signal board
- weather command

### 8.3 色彩建议

- 背景：`#0F1417`
- 卡片底：`#171D21`
- 分割线：`#283138`
- 主文字：`#F2E9D8`
- 次文字：`#9DA5A6`
- 晴天高亮：`#F4B942`
- 降雨高亮：`#4FA3A5`
- 风险高亮：`#D96C3F`
- 正常状态：`#88B04B`

### 8.4 布局建议

- 左侧：24%
- 中间：52%
- 右侧：24%

## 9. 数据指标设计

### 9.1 实时天气指标

- current_temp
- feels_like
- weather_text
- weather_icon
- temp_max_today
- temp_min_today
- wind_dir
- wind_scale
- wind_speed
- humidity
- pressure
- visibility
- precipitation_now
- uv_index

### 9.2 空气质量指标

- aqi_now
- aqi_category
- primary_pollutant
- pm2p5
- pm10
- so2
- no2
- o3
- co

### 9.3 日统计指标

- daily_max_temp
- daily_min_temp
- daily_avg_temp
- daily_precipitation
- daily_weather_type
- daily_aqi_avg

### 9.4 周统计指标

- weekly_avg_temp
- weekly_total_precipitation
- weekly_rainy_days
- weekly_aqi_avg

### 9.5 月统计指标

- monthly_avg_temp
- monthly_total_precipitation
- monthly_rainy_days
- monthly_weather_type_ratio
- monthly_sample_days
- monthly_expected_days
- monthly_stats_mode

## 10. 数据口径

- 日统计按自然日计算
- 周统计按自然周计算，周一为起始
- 月统计按自然月计算
- 所有统计统一使用系统配置时区
- 周、月统计由每日落库数据聚合生成
- 若部分空气质量数据缺失，则使用可用样本均值

### 10.1 当前月统计口径

- 当前月统计默认展示“截至最新采样日”的月内累计结果，不宣称为完整自然月最终值
- 当前月接口必须返回 `sampleDays`、`expectedDays`、`isPartialMonth` 与 `statsMode`
- 当 `sampleDays < expectedDays` 时，前端必须显示“统计样本期不足”或等价提示
- 若需要完整自然月报表，应在月结束后生成单独的封账统计，不与当前月累计混用

### 10.2 空气质量统计口径

- `daily_aqi_avg` 仅基于 `air_now_snapshots` 的实测 AQI 样本聚合，不混用空气质量预报值
- `weekly_aqi_avg` 与 `monthly_aqi_avg` 基于日级平均值继续聚合
- AQI 日均值使用当日有效样本的算术平均
- 若单日有效样本数低于预期样本数的 75%，则该日标记为 `partial`
- 周、月统计接口必须返回样本完整度字段，供前端提示数据可信度

## 11. 技术方案

### 11.1 前端

- React
- Vite
- TypeScript
- ECharts
- SCSS
- React Router

### 11.2 后端

- Node.js
- TypeScript
- Express 或 Fastify

### 11.3 存储

- SQLite

### 11.4 同步策略

- 实时天气：10 分钟刷新
- 24 小时趋势：30 分钟刷新
- 7 天预报：60 分钟刷新
- AQI：15 分钟刷新
- 预警：5 分钟刷新
- 生活指数：每天刷新
- 周/月统计：每日 00:10 聚合

### 11.5 页面初始化流程

1. 页面加载时读取本地缓存城市
2. 若存在缓存城市，则直接请求首页聚合接口
3. 若不存在缓存城市，则请求浏览器定位
4. 定位成功后调用“当前城市解析接口”
5. 后端返回 `locationId` 与城市基础信息
6. 前端调用首页聚合接口并缓存该城市
7. 若定位失败，则加载默认城市

### 11.6 路由建议

- `/`：主页面大屏
- `/stats`：统计详情页

### 11.7 城市切换流程

1. 用户点击主页面顶部城市入口
2. 打开城市选择抽屉
3. 用户搜索或选择城市
4. 前端获取选中城市 `locationId`
5. 刷新首页聚合接口与相关模块数据
6. 将该城市写入本地缓存与最近访问列表

### 11.8 单用户模式说明

- 当前 MVP 为单用户本地部署版本
- 公开业务接口不要求传递 `userId`
- 城市、数据源密钥、默认城市等配置由服务端本地配置文件或环境变量管理
- 若后续扩展多用户版本，再为接口补充用户域和鉴权机制

## 12. 数据库设计建议

### 12.1 核心表

- cities
- weather_now_snapshots
- weather_hourly_snapshots
- weather_daily_snapshots
- minutely_precip_snapshots
- air_now_snapshots
- air_hourly_snapshots
- weather_alerts
- weather_indices
- weather_stats_daily
- weather_stats_weekly
- weather_stats_monthly
- sync_logs
- app_settings

### 12.2 表用途

- `cities`：存储城市基础信息与 LocationID
- `weather_now_snapshots`：存储实时天气快照
- `weather_hourly_snapshots`：存储逐小时天气预报
- `weather_daily_snapshots`：存储每日预报
- `minutely_precip_snapshots`：存储分钟级降水
- `air_now_snapshots`：存储实时空气质量
- `air_hourly_snapshots`：存储空气质量小时预报
- `weather_alerts`：存储当前及历史预警
- `weather_indices`：存储生活指数
- `weather_stats_daily`：存储按日聚合统计
- `weather_stats_weekly`：存储按周聚合统计
- `weather_stats_monthly`：存储按月聚合统计
- `sync_logs`：存储同步日志
- `app_settings`：存储默认城市、最近一次成功城市和系统配置

### 12.3 数据存储策略

- `weather_now_snapshots`、`air_now_snapshots`、`weather_alerts` 属于快照型数据，按时间持续新增
- `weather_hourly_snapshots`、`weather_daily_snapshots`、`air_hourly_snapshots` 属于预测型数据，按抓取时间保存一份预测快照
- `weather_stats_daily`、`weather_stats_weekly`、`weather_stats_monthly` 属于聚合统计结果，按统计周期更新或重算
- 月统计不是简单的数值累加写回，而是基于日级数据重新聚合生成
- 当天的实时数据不会只保留一个最终值，而是保留时间序列快照，便于后续做趋势、补算和校验
- 前端页面读取的是“最新有效快照 + 本地聚合结果”，不是直接读取第三方原始响应

## 13. MVP 范围

### 13.1 必做

- 顶部状态栏
- 中间天气主模块
- 24 小时趋势
- 7 天天气预报
- 实时空气质量
- 实时预警
- 周统计卡片
- 月统计卡片（带样本期提示）
- 城市选择抽屉
- 统计详情页

### 13.2 可延后

- 生活指数
- 底部 30 天趋势细分图
- 精细城市地图层
- 多城市切换

## 14. 非功能需求

- 首页首屏加载不超过 2 秒
- 所有接口必须有 loading / error 状态
- 所有接口必须返回统一结构
- 所有缓存失效策略必须可配置
- 数据更新时间必须在页面显式展示

## 15. 风险与应对

### 15.1 免费额度风险

- 风险：频繁刷新导致免费额度消耗过快
- 应对：后端缓存与轮询控制

### 15.2 月统计数据不足

- 风险：新部署项目初期没有完整月度数据
- 应对：在界面上显示“统计样本期不足”

### 15.3 预警为空

- 风险：大多数时间没有预警数据
- 应对：设计明确空状态卡片

## 16. 里程碑

### 第一阶段

- 搭建前后端工程
- 接入城市搜索、实时天气、逐小时、每日预报

### 第二阶段

- 接入 AQI、预警、生活指数
- 完成首页主体布局

### 第三阶段

- 完成周/月统计聚合
- 完成 UI 细化与动效

### 第四阶段

- 完成缓存、日志、部署与优化

## 17. 验收标准

- 能展示当前天气核心信息
- 能展示未来 24 小时趋势
- 能展示未来 7 天预报
- 能展示 AQI 与预警
- 能展示周统计与月统计
- 页面视觉中心明确为天气主模块

---

## 18. 接口文档草案

### 18.1 统一响应格式

成功响应：

```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "data": {}
}
```

失败响应：

```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "错误描述（中文）",
  "data": null
}
```

### 18.2 鉴权与公共参数

- 当前单用户版本的业务接口不要求 `userId`
- 公开业务接口统一使用 `locationId`
- 第三方接口所需坐标由服务端根据 `locationId` 从 `cities` 表解析
- 若未来扩展多用户版本，再为接口补充 `userId` 与鉴权信息

### 18.3 当前城市定位说明

- 浏览器负责获取 `lat` 与 `lon`
- 前端不直接请求和风天气 GeoAPI
- 后端通过定位解析接口将坐标转换为当前城市 `locationId`
- 页面初始化优先使用定位成功结果，其次使用本地缓存城市，最后回退默认城市

---

## 19. 城市搜索接口

### 接口

`GET /api/cities/search`

### 说明

根据城市关键字搜索城市并返回和风天气 `LocationID`。

### 请求参数

- `keyword: string` 必填，城市关键字

### 返回字段

- `id`
- `name`
- `adm1`
- `adm2`
- `country`
- `lat`
- `lon`
- `tz`
- `utcOffset`
- `type`

### 返回示例

```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "data": {
    "list": [
      {
        "id": "101010100",
        "name": "北京",
        "adm1": "北京市",
        "adm2": "北京",
        "country": "中国",
        "lat": "39.90499",
        "lon": "116.40529",
        "tz": "Asia/Shanghai",
        "utcOffset": "+08:00",
        "type": "city"
      }
    ]
  }
}
```

---

## 20. 当前城市解析接口

### 接口

`POST /api/location/resolve-current`

### 说明

根据浏览器返回的坐标解析当前城市，并返回城市基础信息与 `locationId`。

### 请求参数

- `lat: string` 必填
- `lon: string` 必填

### 返回字段

- `id`
- `name`
- `adm1`
- `adm2`
- `country`
- `lat`
- `lon`
- `tz`
- `utcOffset`
- `type`

### 返回示例

```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": "101010100",
    "name": "北京",
    "adm1": "北京市",
    "adm2": "北京",
    "country": "中国",
    "lat": "39.90499",
    "lon": "116.40529",
    "tz": "Asia/Shanghai",
    "utcOffset": "+08:00",
    "type": "city"
  }
}
```

---

## 21. 首页总览接口

### 接口

`GET /api/screen/overview`

### 说明

返回首页首屏所需的聚合数据，包括城市信息、实时天气、实时空气质量和预警摘要。
该接口聚合自实时天气、当日每日预报、生活指数、实时空气质量和预警数据，用于支撑首页首屏主模块。

### 请求参数

- `locationId: string` 必填

### 返回字段

#### location

- `id`
- `name`
- `adm1`
- `adm2`
- `lat`
- `lon`
- `tz`

#### weatherNow

- `obsTime`
- `temp`
- `feelsLike`
- `icon`
- `text`
- `windDir`
- `windScale`
- `windSpeed`
- `humidity`
- `precip`
- `pressure`
- `vis`
- `cloud`

#### todaySummary

- `tempMax`
- `tempMin`
- `uvIndex`
- `sunrise`
- `sunset`
- `statsMode`

#### airNow

- `aqi`
- `category`
- `primaryPollutant`
- `pm2p5`
- `pm10`
- `no2`
- `so2`
- `o3`
- `co`

#### alertSummary

- `hasAlert`
- `count`
- `highestSeverity`

### 返回示例

```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "data": {
    "location": {
      "id": "101010100",
      "name": "北京",
      "adm1": "北京市",
      "adm2": "北京",
      "lat": "39.90499",
      "lon": "116.40529",
      "tz": "Asia/Shanghai"
    },
    "weatherNow": {
      "obsTime": "2026-06-12T10:10+08:00",
      "temp": "28",
      "feelsLike": "30",
      "icon": "101",
      "text": "多云",
      "windDir": "东南风",
      "windScale": "3",
      "windSpeed": "18",
      "humidity": "62",
      "precip": "0.0",
      "pressure": "1004",
      "vis": "12",
      "cloud": "55"
    },
    "todaySummary": {
      "tempMax": "31",
      "tempMin": "21",
      "uvIndex": "6",
      "sunrise": "04:46",
      "sunset": "19:42",
      "statsMode": "current_day_summary"
    },
    "airNow": {
      "aqi": "72",
      "category": "良",
      "primaryPollutant": "PM2.5",
      "pm2p5": "52",
      "pm10": "76",
      "no2": "18",
      "so2": "5",
      "o3": "92",
      "co": "0.7"
    },
    "alertSummary": {
      "hasAlert": false,
      "count": 0,
      "highestSeverity": null
    }
  }
}
```

---

## 22. 24 小时天气趋势接口

### 接口

`GET /api/screen/hourly`

### 说明

返回未来 24 小时逐小时天气趋势。

### 请求参数

- `locationId: string` 必填

### 返回字段

- `fxTime`
- `temp`
- `icon`
- `text`
- `pop`
- `windDir`
- `windScale`
- `windSpeed`
- `humidity`
- `pressure`
- `cloud`

### 返回示例

```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "data": {
    "list": [
      {
        "fxTime": "2026-06-12T11:00+08:00",
        "temp": "29",
        "icon": "101",
        "text": "多云",
        "pop": "10",
        "windDir": "东南风",
        "windScale": "3",
        "windSpeed": "16",
        "humidity": "60",
        "pressure": "1003",
        "cloud": "58"
      }
    ]
  }
}
```

---

## 23. 分钟级降水接口

### 接口

`GET /api/screen/minutely`

### 说明

返回未来 2 小时分钟级降水预报。

### 请求参数

- `locationId: string` 必填

### 返回字段

- `summary`
- `list[].fxTime`
- `list[].precip`
- `list[].type`

---

## 24. 7 天天气预报接口

### 接口

`GET /api/screen/daily`

### 说明

返回未来 7 天每日天气预报。

### 请求参数

- `locationId: string` 必填
- `days: number` 选填，默认 `7`

### 返回字段

- `fxDate`
- `sunrise`
- `sunset`
- `tempMax`
- `tempMin`
- `iconDay`
- `textDay`
- `iconNight`
- `textNight`
- `precip`
- `humidity`
- `pressure`
- `uvIndex`
- `windDirDay`
- `windScaleDay`

---

## 25. 实时空气质量接口

### 接口

`GET /api/screen/air/now`

### 说明

返回实时空气质量。

### 请求参数

- `locationId: string` 必填

### 返回字段

- `pubTime`
- `aqi`
- `level`
- `category`
- `primaryPollutant`
- `pm2p5`
- `pm10`
- `no2`
- `so2`
- `o3`
- `co`
- `healthAdvice`

---

## 26. 空气质量小时趋势接口

### 接口

`GET /api/screen/air/hourly`

### 说明

返回未来 24 小时空气质量趋势。

### 请求参数

- `locationId: string` 必填

### 返回字段

- `fxTime`
- `aqi`
- `category`
- `primaryPollutant`

---

## 27. 预警接口

### 接口

`GET /api/screen/alerts`

### 说明

返回当前城市所有生效中的气象预警。

### 请求参数

- `locationId: string` 必填

### 返回字段

- `id`
- `senderName`
- `publishedAt`
- `effectiveTime`
- `expireTime`
- `eventType`
- `severity`
- `headline`
- `description`
- `instruction`

---

## 28. 生活指数接口

### 接口

`GET /api/screen/indices`

### 说明

返回生活指数列表。

### 请求参数

- `locationId: string` 必填
- `days: string` 选填，默认 `1d`

### 返回字段

- `date`
- `type`
- `name`
- `level`
- `category`
- `text`

---

## 29. 周统计接口

### 接口

`GET /api/screen/stats/weekly`

### 说明

返回当前周聚合统计结果，由本地数据库聚合生成。

### 请求参数

- `locationId: string` 必填

### 返回字段

- `weekStart`
- `weekEnd`
- `avgTemp`
- `totalPrecipitation`
- `rainyDays`
- `weatherTypeRatio`
- `aqiAvg`
- `sampleDays`
- `expectedDays`
- `statsStatus`

---

## 30. 月统计接口

### 接口

`GET /api/screen/stats/monthly`

### 说明

返回当前月聚合统计结果，由本地数据库聚合生成。

### 请求参数

- `locationId: string` 必填

### 返回字段

- `month`
- `avgTemp`
- `totalPrecipitation`
- `rainyDays`
- `weatherTypeRatio`
- `aqiAvg`
- `sampleDays`
- `expectedDays`
- `isPartialMonth`
- `statsMode`
- `statsStatus`

---

## 31. 聚合首页接口建议

### 接口

`GET /api/screen/home`

### 说明

用于首页一次性拉取所有模块关键数据，减少前端首屏并发请求。

### 请求参数

- `locationId: string` 必填

### 返回结构

- `overview`
- `hourly`
- `minutely`
- `daily`
- `airNow`
- `airHourly`
- `alerts`
- `indices`
- `weeklyStats`
- `monthlyStats`

### 31.1 统计详情页接口建议

统计详情页建议组合以下接口：

- `GET /api/screen/stats/weekly`
- `GET /api/screen/stats/monthly`
- `GET /api/screen/daily?days=30`
- `GET /api/screen/air/hourly`

若后续需要减少统计详情页并发请求，可新增：

- `GET /api/screen/stats/detail?locationId=...`

用于一次性返回近 30 天温度、降水、AQI 和统计说明。

## 32. 错误码建议

- `CITY_NOT_FOUND`
- `LOCATION_RESOLVE_FAILED`
- `INVALID_LOCATION_ID`
- `INVALID_COORDINATES`
- `THIRD_PARTY_API_ERROR`
- `THIRD_PARTY_RATE_LIMITED`
- `CACHE_MISS`
- `STATS_NOT_READY`
- `INTERNAL_SERVER_ERROR`

## 33. 开发说明

- 所有第三方请求必须由后端发起
- 所有请求结果建议缓存
- 所有统计接口优先读本地聚合表
- 页面所有模块都应显示数据更新时间
- 周/月统计属于本地业务统计，不直接依赖第三方现成字段
- 首页主天气卡默认只依赖 `GET /api/screen/overview`
- `GET /api/screen/home` 为首页推荐唯一首屏接口，其他接口可作为模块级刷新接口
- 当前城市定位结果应写入本地缓存，减少重复定位请求
