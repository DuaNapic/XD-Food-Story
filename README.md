# XD Food Story 食物语 🍜

> **一个为校园美食而生的智能探索平台。**  
> 不只是菜单，是一次有温度的寻味之旅。

---

## ✨ 产品亮点

### 🤖 西小电 · AI 智能助理
- **自然语言点单**：不用刷菜单，直接告诉西小电"我想吃辣的、便宜的、少油的"，它会帮你精准匹配
- **实时流式回复**：基于 SSE 流式传输，西小电边想边说，不是一次性弹出
- **对话上下文记忆**：多轮对话中保留最近 3 轮历史，可以追问、纠偏、换口味
- **推荐置信度排序**：后端结合雷达评分（口味 / 性价比 / 饱腹感 / 健康度 / 颜值 / 等待时长）计算匹配分，把最适合的推到最前面
- **3D 机器人形象**：基于 `@react-three/fiber` 实现全三维西小电，拥有 `idle / thinking / talking / smiling` 四种状态动画，眼睛颜色随状态实时变化，带全身节律摆动与眨眼效果

### 🏪 店铺 / 窗口探索
- **按档口聚合**：将全部菜品按 `{食堂}-{档口}` 维度聚合，自动生成店铺卡片，展示档口名、所在食堂、菜品数量
- **食堂多选过滤**：在店铺列表顶部提供海棠 / 丁香 / 竹园多选 Chip，支持任意组合筛选，实时更新结果计数
- **点击进入详情**：每张店铺卡点击后展示该档口完整菜品列表，支持价格 / 热量 / 健康度二次筛选
- **AI 无打扰区**：店铺页面不展示 AI 入口，保持纯净的人工浏览体验

### 🔍 多维筛选系统
- **食堂 / 价格 / 热量 / 健康度** 四个维度独立筛选
- 移动端自适应横排紧凑布局，桌面端竖排分组卡片
- 每行标签超出时支持横向滑动，不换行、不遮挡
- 店铺详情页隐藏食堂筛选（档口内部自然已锁定食堂）

### ❤️ 收藏夹
- 登录态下一键收藏任意菜品，数据持久化到后端
- 收藏夹页面提供与主页相同的多维筛选，快速定位心仪菜品
- 收藏数量角标实时更新，不用刷页面

### 🃏 智能发现流
- 首页卡片流由后端基于会话种子（Session Seed）随机打散，每次刷新看到不同排列
- 滚动到底部触发预取下一页（IntersectionObserver + 预请求缓存），加载几乎无感
- 每张 FoodCard 展示图片、标签、价格、健康评分，点击拉起抽屉详情

### 🎨 视觉设计
- **品牌 Logo 全局集成**：Logo 植入侧边栏、首屏标题旁、AI 入口及对话窗口标题，色彩系统响应 Logo 的黛蓝主色调
- **玻璃拟态卡片**：高斯模糊背景 + 微透明白色底，在温暖米色页面上呈现轻奢层次感
- **Framer Motion 全场动画**：页面切换、卡片入场、对话窗展开均有弹性物理动画，无跳接感
- **深海浮动 AI 入口**（AIMagicIsland）：常驻底部，附带橘色呼吸灯，点击后以"从角落膨胀展开"的春日动画进入对话

---

## 📐 技术架构

| 层级 | 技术选型 |
|------|---------|
| 前端框架 | React 18 + Vite |
| 状态管理 | Jotai（原子化，零 Provider 配置） |
| 动画 | Framer Motion + CSS transitions |
| 3D 渲染 | @react-three/fiber + @react-three/drei（Three.js） |
| 样式 | Tailwind CSS v3 |
| 后端 | Node.js + Express |
| AI 接入 | DashScope / OpenAI 兼容接口，Server-Sent Events 流式输出 |
| 限流 | express-rate-limit（API 频率保护） |
| 部署 | Vercel（前后端一体） |

---

## 🗂️ 项目结构

```
XD-Food-Story/
├── public/
│   └── logo.png              # 品牌 Logo
├── server/
│   ├── app.js                # Express 应用配置
│   ├── config.js             # 环境变量统一出口
│   ├── index.js              # 服务启动入口
│   ├── routes/               # API 路由（menus / recommend / favorites）
│   └── services/             # 业务逻辑（LLM 调用、收藏 CRUD）
├── src/
│   ├── App.tsx               # 主应用（单文件架构，含全部组件）
│   └── components/
│       └── XiaoD.tsx         # 3D 机器人组件
├── vite.config.ts            # /api 代理配置
└── vercel.json               # 部署路由规则
```

---

## 🚀 本地运行

```bash
# 安装依赖
npm install

# 同时启动前端（Vite dev server）和后端
npm run dev          # 前端 → localhost:5173
node server/index.js # 后端 → localhost:3001
```

### 环境变量（`.env`）

```env
LLM_API_KEY=your_api_key
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_MODEL=qwen-plus
LLM_ENABLE_THINKING=false
LLM_TIMEOUT_MS=30000
SERVER_TIMEZONE=Asia/Shanghai
```

---

## 🔄 本轮全方位更新日志

### 一、店铺 / 窗口系统（全新功能）
- 新增独立的"店铺/窗口"导航入口（Store 图标，侧边栏第3项）
- 后端菜品数据在前端内存中按 `{食堂}-{档口}` 键聚合，生成 `shopsData`，按菜品数量排序
- 店铺卡片网格展示：图标、菜品数徽标、档口名、所在食堂（MapPin）
- 卡片悬浮有上浮 + 橙色光晕装饰角，视觉生动
- 点进店铺显示完整档口信息头部 + 菜品图预览叠叠圆 + `FilterSection` 二次筛选 + FoodCard 网格
- 返回导览也有带圆形背景按钮，体验流畅

### 二、食堂多选过滤器
- 在店铺导览页标题下方植入 `海棠 / 丁香 / 竹园` Chip 多选组件
- 点击切换选中状态（橙色激活），支持同时选中多个食堂联合展示
- 选中状态下显示"重置全部"快捷链接
- 底部实时统计"已筛选出 X 家"
- 修复了精确匹配导致的回流 Bug（改为 `some(f => canteen.includes(f))` 子字符串匹配）

### 三、移动端布局优化
- 菜品卡片和店铺卡片：`grid-cols-1` → `grid-cols-2`，手机一行两个
- 间距从 `gap-6` 精简为 `gap-3`（手机）/ `gap-6`（平板+）
- 筛选栏：手机端改为横排 + 自动标签宽度收缩（`w-[36px]` 标签 + 滚动选项行），告别纵向叠高
- 按钮手机端字号/内边距缩小（`px-2.5 py-0.5 text-[11.5px]`），保持可点击性

### 四、品牌视觉系统
- Logo（`/logo.png`）全局植入：侧边栏头部、Hero 标题旁、AI 魔法岛入口、对话窗标题
- Hero 大标题渐变从石灰色系调为黛蓝系（`from-[#1A365D]`），与 Logo 色调呼应
- 删除冗余的 `ChefHat` 图标导入

### 五、西小电 3D 体验优化
- **预热渲染**：App 根节点挂载不可见的 `XiaoD` 实例，提前暖机 GPU 上下文和 Environment Map，消除对话框首次打开的 1-2 秒黑屏延迟

### 六、店铺筛选页隐藏食堂维度
- `FilterSection` 接入 `currentView` 原子状态，当处于 `shops` 详情视图时自动过滤掉"食堂"分组，保持筛选逻辑语义正确

### 七、稳定性修复
- 修复 App.tsx 中 Hooks 声明顺序错误导致的块级作用域引用 Bug
- 修复 `shopsData` 中 `item.image_url` 误引导致的 TypeError（改为 `getImageUrl(item.image_key)`）
- 修复收藏页筛选栏被错误地放在页面外导致不渲染的逻辑问题

---

## 📖 数据格式说明

每道菜品的完整数据字段：

| 字段 | 含义 |
|------|------|
| `title` | 菜名 |
| `price` | 价格（元） |
| `shop_text` | 档口名 |
| `location_text` | 食堂名 |
| `badge` | 标签（如"招牌""新品"） |
| `meal_time` | 供应时段（早/午/晚） |
| `spiciness` | 辣度 |
| `radar` | 雷达评分（口味/性价比/饱腹/健康/等候/颜值，满分 100） |
| `ai_insight` | AI 一句话推荐语 |
| `image_key` | 图片存储键，通过 `/api/image/{key}` 取图 |

---

## 📃 License

本项目为挑战杯参赛作品，仅供学习与展示使用。

---

*Made with ❤️ and late nights by XD Team.*
