# SmartSite Expansion Intelligence
### Cotti Coffee NYC — Site Selection & Route Optimization Platform

一款专为库迪咖啡纽约扩张团队设计的智能选址分析工具，集成真实地铁客流数据、竞品分析、业态评分与路线优化。

---

## 核心功能

| 功能 | 说明 | 数据来源 |
|------|------|---------|
| **路线优化** | 多店铺访问顺序自动优化（最近邻算法） | 内置 |
| **竞品分析** | 0.2英里内 Starbucks/Dunkin/Blank Street/Luckin | Foursquare API |
| **选址评分** | 5维度综合评分（人流/竞争/业态/交通/时段） | MTA真实数据 + OSM |
| **人流监控** | 基于MTA站点历史客流的24小时/周趋势图 | MTA公开数据 |
| **地铁规划** | A→B换乘建议 + 最近站出入口 | MTA站点数据 |
| **业态热力图** | 500m内商圈/学校/办公/交通枢纽分布红框 | OpenStreetMap |

---

## 快速开始

### 前置要求
- Node.js >= 18
- npm >= 9

### 安装 & 启动

```bash
npm install
npm run dev
# 访问 http://localhost:5173
```

### Foursquare API 配置（竞品数据）

```bash
# 复制并填写 API Key
cp .env.example .env
# 编辑 .env，填入 VITE_FOURSQUARE_API_KEY=your_key
```

免费注册：[foursquare.com/developers](https://foursquare.com/developers/)（100,000次/月免费）

未配置时自动使用 OpenStreetMap 数据作为竞品数据源。

---

## 技术栈

- **前端**: React 18 + Vite 5
- **地图**: Leaflet.js + React-Leaflet + OpenStreetMap
- **地理编码**: Nominatim API（免费）
- **竞品数据**: Foursquare Places API v3（免费层）/ Overpass API 备用
- **人流数据**: MTA历史客流数据（内置，43个站点，无需API Key）
- **存储**: LocalForage（浏览器端，含24h缓存）

---

## 数据说明

### MTA地铁客流（实时生效，无需配置）

内置43个NYC地铁站历史周均客流数据，用于：
- 人流量评分中的客流加成（最高40分）
- 交通便利性评分（距离 × 站点等级）
- 每日/每周访客量估算（站点客流 × 3%到店率）

代表站点：
- Times Sq-42 St：61万/周（超高客流枢纽）
- Fulton St：29万/周（高客流站，覆盖 World Trade Center 区域）
- Grand Central：49万/周（超高客流枢纽）

### 评分维度权重

```
人流量       30分  = POI密度(0-60) + MTA客流加成(0-40)
竞争环境     20分  = 竞品数量反向评分
业态生态     20分  = 业态多样性 + 商业价值权重
交通便利性   15分  = 步行距离 + 站点等级
时段覆盖     15分  = 工作日/周末覆盖能力
```

---

## 部署

项目已通过 Vercel 自动部署，push 到 main 分支即可触发更新。

```bash
git push origin main
```

**Vercel 环境变量配置：**
在 Vercel Dashboard → Settings → Environment Variables 中添加：
```
VITE_FOURSQUARE_API_KEY = your_key
```

---

## 常见问题

**地址解析失败**：确保地址包含 "New York" 或 "NYC"

**竞品显示为0**：需先点击"☕ 竞品"按钮加载数据，或配置 Foursquare Key 提升准确率

**清除所有数据**：浏览器控制台运行 `localforage.clear()`

---

**版本**: 1.0.0 | **项目名**: SmartSite Expansion Intelligence
