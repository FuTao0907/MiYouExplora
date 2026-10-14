# 米游探索度记录

个人使用的探索度记录网页应用，记录《原神》各地区及各子区域的探索进度。数据模型与游戏解耦，后续可扩展星穹铁道、绝区零等。

## 界面

* **主页面**：按地区（蒙德、璃月、稻妻、须弥…）显示探索度百分比与状态，点击地区卡片进入详情。

* **地区详情页**：一张表格，行为子区域，列为各分项的「总数 / 已完成（已搜集）」，直接在表格里录入。

* **编辑权限**：默认**只读模式**（其他人打开只能看，输入框与导出/导入均禁用）；右上角点「解锁编辑」输入密码后进入编辑模式，可录入、写描述、导出。同一浏览器会话内解锁状态保持，点「锁定」恢复只读。密码校验在**服务端**（生产环境为 EdgeOne 控制台设置的环境变量 `EDIT_PASSWORD`，不再下发到前端文件）；开发模式密码见 `.env.development` 的 `VITE_DEV_PASSWORD`。

* **云端自动保存**：编辑模式下录入/写描述后，约 1.2 秒防抖自动保存到云端（EdgeOne Blob），状态条显示「保存中… / 已保存到云端 / 保存失败」，失败可一键重试。无需手动导出替换重新部署。

* **展开行描述**：表格每行最左侧的 ▸ 按钮可展开该子区域的描述区，用于记录备注（如剩余宝箱位置、任务进度）；编辑模式下为输入框，只读模式下仅展示。

| 表头列          | 说明             |
| ------------ | -------------- |
| 子区域名称        | 该地区下的子区域       |
| 宝箱总数 / 已搜集   | 宝箱目标数量 / 已搜集数量 |
| 限时挑战总数 / 已完成 | 挑战目标数量 / 完成数量  |
| 仙灵总数 / 已完成   | 仙灵目标数量 / 完成数量（纳塔为「幻写灵」，见下） |

> 纳塔的探索分项为「幻写灵」（原神 5.0 起纳塔地区以幻写灵取代传统仙灵），games.json 中纳塔子区域的第三分项为 `phantasm / 幻写灵`，界面表头显示「幻写灵总数」。

## 探索度计算

地区探索度 = 各分项完成比例的平均值，**分母取地区板块目标（games.json 中 `region.targets`，对应游戏内探索面板的权威统计）**，分子取该地区全部子区域录入的已搜集数量之和；target 为 0 的分项不参与计算。探索度由录入数据自动计算，不单独存储。

* 未开始：探索度 ≤ 0
* 已完成：探索度 ≥ 100
* 进行中：其余情况

## 技术栈（全栈）

* Vite 6 + Vue 3 前端（SPA）
* EdgeOne Pages Functions 服务端（`functions/` 目录，文件即路由）
* EdgeOne Blob 存储（`@edgeone/pages-blob`，零配置，写后即读）保存录入数据
* 依赖管理使用 yarn（见 package.json）
* **Java 学习副本**（`java-backend/`）：用 JDK HttpServer + Gson 在本地重写同一套 API，用于学习 Java 后端；生产仍用 EdgeOne JS 版，前端可切换联调（详见 `java-backend/README.md`）

## 本地开发

```
yarn install      # 安装依赖
yarn dev          # 开发服务器（默认 http://localhost:5173）
yarn build        # 构建生产产物到 dist/
yarn preview      # 本地预览构建产物（默认 http://localhost:4173）
```

开发模式（`yarn dev`）不依赖云端：进度数据读静态 `public/data/progress.json`，编辑保存在内存（不落盘），解锁密码用 `.env.development` 中的 `VITE_DEV_PASSWORD`。需要完整调试 Functions/Blob 时，可用 EdgeOne CLI（`npm install -g edgeone`，`edgeone pages init/link/dev`）。

## 架构与数据流

```
浏览器（Vue SPA）
 ├─ /data/games.json     固定值（游戏/地区/子区域/目标数）——静态文件
 ├─ GET  /api/progress   读取云端进度（EdgeOne Blob；首次为空时前端回退种子数据）
 ├─ PUT  /api/progress   写入进度（需 x-edit-password 头；写前自动备份旧版到 progress.prev）
 ├─ POST /api/auth       校验编辑密码（环境变量 EDIT_PASSWORD）
 └─ POST /api/progress/restore  从云端备份恢复
```

数据模型与游戏解耦：`games.json` 的 `games[]` 数组可追加新游戏（星穹铁道/绝区零等），`progress.json` 按地区/子区域分键存储，未来加游戏或功能无需改架构。

## 数据文件

| 文件            | 位置                          | 说明                                    |
| ------------- | --------------------------- | ------------------------------------- |
| games.json    | `public/data/games.json`    | 固定值：游戏、地区、子区域、分项及目标数量（写死在项目中，改后需重新部署） |
| progress.json | `public/data/progress.json` | 种子/备份数据（生产环境首次部署时云端为空，前端回退此文件；此后以云端为准，导出可作备份） |
| images/       | `public/images/`            | 各地区实景图（个人使用；`games.json` 中 `region.image` 引用，如 `/images/mondstadt.jpg`） |
| functions/    | `functions/api/...`         | 服务端函数（路由见上「架构与数据流」） |

### games.json 结构（v2）

```
{
  "version": 2,
  "settings": {},
  "games": [
    {
      "id": "genshin",
      "name": "原神",
      "sort": 1,
      "regions": [
        {
          "id": "mondstadt",
          "name": "蒙德",
          "sort": 1,
          "targets": { "chest": 755, "challenge": 33, "seelie": 83 },
          "areas": [
            {
              "id": "falling_star_valley",
              "name": "坠星山谷",
              "sort": 1,
              "items": [
                { "id": "chest", "name": "宝箱", "target": 0 },
                { "id": "challenge", "name": "限时挑战", "target": 0 },
                { "id": "seelie", "name": "仙灵", "target": 0 }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

> 编辑密码已从 games.json 移除（不再随静态文件下发），生产环境请设置在 EdgeOne 控制台环境变量 `EDIT_PASSWORD`。

### progress.json 结构（v2）

```
{
  "version": 2,
  "updated_at": "2026-10-13",
  "regions": {
    "mondstadt": {
      "areas": {
        "falling_star_valley": {
          "updated_at": "2026-10-13",
          "items": { "chest": 0, "challenge": 0, "seelie": 0 },
          "note": "展开行描述（可选，留空则只读模式显示「暂无描述」）"
        }
      }
    }
  }
}
```

## 需要核对的数据（重要）

* **分项目标数量（target）**：分两层——
  * **地区板块目标（`region.targets`，探索度分母）**：按网上权威统计（游戏内探索面板口径）填写，8 个地区：蒙德宝箱 755/挑战 33/仙灵 83、璃月 1383/67/118、稻妻 916/43/70、须弥 1219/54/45、枫丹 794/111/68、纳塔 830/42/幻写灵 66、挪德卡莱 752（挑战/仙灵无来源为 0）、至冬 345/11/31。部分板块数存在版本口径差异（如璃月另有旧总数 1155、蒙德除雪山 521 vs 518、至冬 345 vs 342），此处取调研报告的当前口径，明细见 `games-data-research-2026-10-13.md` 板块级清单与冲突并列。
  * **子区域目标（`area.items[].target`）**：能拆分的已填 19 个子区域的 24 个分项（如龙脊雪山 234/16/32、层岩巨渊 248/20/37、鹤观 169/16/6、渊下宫 185、至冬五区等）；拆不到子区域的保持 0——录入不受影响（输入框已放开，上限取地区板块目标），子区域表格对应总数列显示"—"。

* **子区域划分**：内置 8 个地区共 69 个官方子区域——蒙德 7 区（坠星山谷、苍风高地、风啸山坡、明冠山地、龙脊雪山、风息山、空之神殿）、璃月 9 区（碧水原、琼玑野、珉林、璃沙郊、云来海、层岩巨渊、沉玉谷·上谷、沉玉谷·南陵、来歆山）、稻妻 7 区（含渊下宫）、须弥 13 区（含沙漠 6 区）、枫丹 9 区（含诺思托伊区、旧日之海）、纳塔 9 区、挪德卡莱 10 区（含月之高地、月荡海、月之暗面）、至冬 5 区。子区域划分以官方（观测枢地图/版本公告）为准：不保留孤云阁、明蕴镇（官方非独立探索子区域），"霜月"为独立地图而非子区域（其下月之高地/月荡海/月之暗面三区单独列出），蒙德旧称"明冠峡"按官方改为"明冠山地"。后续新版本开放新区域时直接编辑 games.json 追加即可（无需改代码）。

## 使用流程（全栈：编辑即保存）

1. 打开线上应用，右上角「解锁编辑」输入密码（生产密码见 EdgeOne 控制台环境变量 `EDIT_PASSWORD`）。
2. 点击地区进入表格，在「已搜集 / 已完成」列录入数量（输入即实时更新探索度，约 1.2 秒后自动保存到云端）；▸ 展开行可写描述。
3. 保存状态显示在右上角状态条：保存中… / 已保存到云端 / 保存失败（可重试）。
4. 定期（如每大版本）点「导出 progress.json」下载存档，提交到 Git 仓库作为长期备份——云端 Blob 无版本历史，误改后可在编辑模式下「从备份恢复」（恢复到上一次保存前的版本），但 Git 存档仍是最可靠的兜底。

## 部署（EdgeOne Pages，腾讯云，免费）

> **前置（重要）**：当前项目本地尚未初始化 Git 仓库，而 Functions 的发布方式是「代码推送到远端仓库 → 平台自动构建发布函数」。首次全栈部署前需：
> ```
> git init
> git add -A
> git commit -m "feat: 全栈化（EdgeOne Functions + Blob）"
> git remote add origin <你的 GitHub/其他远端仓库地址>
> git push -u origin main
> ```
> （`.gitignore` 已配置，`node_modules` / `dist` / `.env*` 不会入库；`.env.development` 里的开发密码只在本机 dev 生效。）

1. 代码推送到 Git 仓库；在腾讯云 EdgeOne Pages 控制台创建项目并关联该仓库，构建命令 `yarn build`，输出目录 `dist`，安装命令 `yarn install`（或直接使用仓库根 `edgeone.json`，平台自动读取）。
2. **设置环境变量**：控制台「项目设置 → 环境变量」添加 `EDIT_PASSWORD`（编辑密码，值需 ≤1000 字节），保存后**重新部署**一次使其生效。
3. **Blob 存储零配置**：`functions/` 内通过 `@edgeone/pages-blob` 的 `getStore('miyou-exploration')` 直接使用，无需在控制台开通/绑定。
4. 部署完成后访问分配的域名。EdgeOne 免费套餐含国内节点，访问速度优于 Cloudflare 免费版；免费额度（Edge Functions 300 万次/月、Blob 1GB）对本应用用量绰绰有余。

> 本地 `yarn dev` 走静态数据、生产走 API 的切换由 `import.meta.env.PROD` 自动判断，无需手动配置。
