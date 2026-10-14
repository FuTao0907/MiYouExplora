# Java 学习副本（java-backend）

用 **纯 JDK（com.sun.net.httpserver）+ Gson** 把线上 EdgeOne Functions 的四个 API 在本地用 Java 重写一遍，用于学习 Java 后端基础。**生产环境仍运行 EdgeOne 的 JS 版**，本副本只在本机运行、和前端联调学习。

## 为什么用这个技术栈（而不是 Spring Boot）

- **零依赖框架**：直接用 JDK 自带 HTTP 服务器，你能看到「请求 → 路由 → 处理 → 响应」的完整过程，没有框架帮你隐藏细节；
- 只有一个第三方库 **Gson**（JSON 序列化/解析），避免手写 JSON 的枯燥；
- 等学完这层，再去学 Spring Boot 会轻松很多——框架做的事这里都能对上号。

## 和线上 JS 版的对应关系

| 路由 | 线上（EdgeOne Functions） | 本副本（Java） |
|---|---|---|
| POST /api/auth | functions/api/auth/index.js | handler/AuthHandler.java |
| GET /api/progress | functions/api/progress/index.js onRequestGet | handler/ProgressGetHandler.java |
| PUT /api/progress | functions/api/progress/index.js onRequestPut | handler/ProgressPutHandler.java |
| POST /api/progress/restore | functions/api/progress/restore/index.js | handler/RestoreHandler.java |
| 存储 | EdgeOne Blob（store.get/setJSON） | ProgressStore.java（本地文件 data/progress.json + 自动备份 .prev） |
| 密码 | 环境变量 EDIT_PASSWORD | 环境变量 EDIT_PASSWORD（未设置时开发默认 genshin2026） |

## 运行

```powershell
# 1. 编译（产出到 java-backend\out\）
powershell -File scripts\build.ps1

# 2. 启动（默认端口 8080）
powershell -File scripts\run.ps1
```

看到 `服务器已启动: http://localhost:8080` 即成功。改端口：`$env:PORT = "9000"; powershell -File scripts\run.ps1`

## 用 curl 直接测 API

```powershell
# 校验密码（正确 → {"ok":true}）
curl.exe -X POST http://localhost:8080/api/auth -H "Content-Type: application/json" -d '{\"password\":\"genshin2026\"}'

# 读进度（首次运行 → {"exists":false}）
curl.exe http://localhost:8080/api/progress

# 写入进度（带密码头；写前自动备份旧版到 data\progress.json.prev）
curl.exe -X PUT http://localhost:8080/api/progress -H "Content-Type: application/json" -H "x-edit-password: genshin2026" -d '{\"version\":2,\"updated_at\":\"2026-10-14\",\"regions\":{\"mondstadt\":{\"areas\":{\"falling_star_valley\":{\"items\":{\"chest\":1,\"challenge\":0,\"seelie\":0}}}}}}'

# 从备份恢复
curl.exe -X POST http://localhost:8080/api/progress/restore -H "x-edit-password: genshin2026"
```

## 让前端连到 Java 副本（联调）

1. 先启动 Java 后端（上面 run.ps1）；
2. 在主项目 `.env.development` 里加一行（默认已注释说明，放开即可）：
   ```
   VITE_API_BASE=http://localhost:8080
   ```
3. 重启 `yarn dev`，打开页面：解锁 → 录入 → 保存。此时数据读写都打到 Java 后端，落在 `java-backend\data\progress.json`，与线上云端互不影响。

> 前端代码（src/api/data.js）通过 `import.meta.env.VITE_API_BASE` 判断：设置了就走 Java 副本地址；不设置时开发模式照旧读静态文件、生产模式照旧走 EdgeOne API。`VITE_API_BASE` 只在本地开发生效（Vite 只把 VITE_ 前缀变量注入构建，且 .env.development 不参与生产构建）。

## 涉及的知识点索引

| 文件 | 知识点 |
|---|---|
| Main.java | main 入口、System.getenv().getOrDefault、Integer.parseInt、var |
| ApiServer.java | HttpServer.create、createContext 路由注册、HttpHandler 接口、lambda、线程池 Executors、内部类、依赖注入 |
| AuthService.java | 静态方法、环境变量、恒定时间比较（MessageDigest.isEqual）、Objects |
| ProgressStore.java | Path/Files（NIO.2）、readString/writeString、Files.copy 备份、throws IOException |
| HttpUtil.java | HttpExchange、请求/响应头、try-with-resources、CORS 跨域原理、204 预检 |
| handler/*.java | 实现接口、Gson 解析 JsonObject、has/getAsString、请求头 getFirst、Map.of 构造响应 |

## 数据文件

- `data/progress.json` —— 当前进度（前端联调写入）
- `data/progress.json.prev` —— 每次写入前自动备份的旧版本（restore 用它恢复）
- 两个文件都在 `.gitignore` 里（见主项目 .gitignore），不会提交到仓库

## 后续进阶

- **学 Maven**：本副本目前用 javac 脚本编译（零安装）。想学标准工程化时，把它改造成 Maven 项目（加 pom.xml，依赖 gson，`mvn package` 打包），结构已按 Maven 的 `src/main/java` 约定组织，迁移成本很低。
- **学 Spring Boot**：同样的 API 逻辑用 `@RestController` 重写，可对照本副本理解「框架替你做了什么」。
- **学线程/异步**：把 `Executors.newFixedThreadPool(4)` 换成虚拟线程（JDK 21+，`Executors.newVirtualThreadPerTaskExecutor()`）对比行为。
