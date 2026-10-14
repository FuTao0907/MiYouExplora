package com.miyou.tracker;

import java.nio.file.Path;

/**
 * 程序入口（main 方法）。
 *
 * <p>作用：把各个部件组装起来并启动 HTTP 服务器：
 * <pre>
 *   1. 读取配置（端口，来自环境变量 PORT，默认 8080）
 *   2. 创建数据存储 ProgressStore（负责 progress.json 的读写与备份）
 *   3. 用 ApiServer 创建 HTTP 服务器并注册路由
 *   4. 调用 server.start() 开始对外提供服务
 * </pre>
 *
 * <p>涉及的知识点：
 * <ul>
 *   <li>main 方法签名 —— JVM 启动时调用的固定入口</li>
 *   <li>System.getenv() —— 读取环境变量（生产环境部署时由平台注入）</li>
 *   <li>getOrDefault —— Map 接口的默认值方法，环境变量没设置时给默认值</li>
 *   <li>异常声明 throws IOException —— 文件/网络操作可能失败的信号</li>
 * </ul>
 */
public class Main {

    /**
     * JVM 的启动入口。运行方式：java -cp "out;lib/gson-2.11.0.jar" com.miyou.tracker.Main
     *
     * @param args 命令行参数（本项目暂不使用）
     * @throws Exception 启动阶段任何 IO 错误（文件、端口绑定）都会向上抛出
     */
    public static void main(String[] args) throws Exception {
        // 1. 端口配置：优先读环境变量 PORT，没设置就用 8080
        //    Integer.parseInt 把字符串 "8080" 转成 int；getOrDefault(key, 默认值) 是 Map 的默认方法
        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));

        // 2. 数据存储：data 目录相对于「运行命令时的工作目录」（见 run.ps1，它在 java-backend 目录下启动）
        ProgressStore store = new ProgressStore(Path.of("data"));

        // 3. 创建服务器（内部注册 /api/auth、/api/progress 等路由）
        var server = ApiServer.create(port, store);

        // 4. 启动：start() 之后服务器就开始监听端口、处理请求（不阻塞 main 线程）
        server.start();
        System.out.println("[miyou-java] 服务器已启动: http://localhost:" + port);
        System.out.println("[miyou-java] API: POST /api/auth | GET/PUT /api/progress | POST /api/progress/restore");
    }
}
