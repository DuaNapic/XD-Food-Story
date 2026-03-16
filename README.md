# 🍱 XD-Food-Story (XD食物语)
> **西电学子的专属 AI 美食探索指南** 🚀

「XD食物语」是一款专为西电校内师生打造的智慧餐饮探索平台。通过创新的 **3D 交互**与 **AI 大模型**技术，彻底解决“今天吃什么”的校园终极难题。

---

## ✨ 核心特性

- **🤖 3D 虚拟助手“西小电”**：基于 `React Three Fiber` 手捏的 3D 机器人，具备“空闲、思考、倾听、微笑”四种动态模式，提供沉浸式 AI 对话体验。
- **🔍 多维智能筛选**：采用 `Jotai` 进行状态管理，支持餐厅位置、最高价格、热量阈值、健康评分等多维度标签实时过滤。
- **🧠 雙引擎 AI 思考**：集成高階 LLM 推理與本地菜單數據庫，不僅能“聊天”，更能結合現實菜單給出精準推薦。
- **📱 極致動效體驗**：全量接入 `Framer Motion` 與 `Tailwind CSS`，從“靈動島”風格的入口到流暢的頁面過渡，提供 App 級的原生手感。
- **🛡️ 企業級安全架構**：
    - **Session 數據隔離**：基於 Session 的收藏夾數據雲端同步。
    - **全方位審計**：後端內置 `Audit Logger` 記錄關鍵操作。
    - **頻率限制**：應用 `Rate Limiting` 防止 AI 接口異常刷取。
- **📊 數據可視化**：利用 `Recharts` 展示菜品的营养特征雷达图与食堂人流趋势。

---

## 🛠️ 技術棧

| 領域 | 核心技術 |
| :--- | :--- |
| **前端 (Frontend)** | React 19 + Vite + TypeScript |
| **狀態管理 (State)** | Jotai (Atom-based State Management) |
| **3D 渲染 (3D Engine)** | React Three Fiber + Three.js + Drei |
| **動畫 (Animation)** | Framer Motion |
| **後端 (Backend)** | Node.js + Express 5 |
| **安全 (Security)** | express-rate-limit + Session Guard |
| **樣式 (Styling)** | Tailwind CSS + Lucide Icons |

---

## 🚀 本地快速啟動

### 1. 克隆倉庫
```bash
git clone <PROJECT_URL>
cd XD-Food-Story
```

### 2. 安裝依賴
```bash
npm install
```

### 3. 環境配置
在項目根目錄創建 `.env` 文件，並配置您的 LLM 密鑰：
```env
# LLM 配置 (支持 DashScope / OpenAI 格式)
LLM_API_KEY=<YOUR_API_KEY>
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_MODEL=qwen-turbo

# 服務器配置
PORT=3001
DATA_FILE_PATH=./server/data/recommended_menus_frontend_ui.json
```

### 4. 啟動項目
本項目採用前後端分離架構，請分別在兩個終端運行：

*   **終端 A (啟動後端服務)**:
    ```bash
    npm run server:dev
    ```
*   **終端 B (啟動前端開發)**:
    ```bash
    npm run dev
    ```

---

## 🎯 參賽願景

校園餐飲的選擇不僅是味蕾的考量，更是效率與情緒價值的平衡。「XD食物语」旨在通過現代 Web 技術，優化校園生活基礎體驗，為“星火杯”等創新創業賽事貢獻一份兼具技術深度與人文關懷的答卷。🎉

---
**Made with ❤️ for Xidianers.**
