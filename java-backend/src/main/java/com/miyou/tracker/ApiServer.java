package com.miyou.tracker;

import com.miyou.tracker.handler.AuthHandler;
import com.miyou.tracker.handler.ProgressGetHandler;
import com.miyou.tracker.handler.ProgressPutHandler;
import com.miyou.tracker.handler.RestoreHandler;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.util.concurrent.Executors;

/**
 * HTTP 服务器与「路由表」。
 *
 * <p>Java 标准库自带一个极简 HTTP 服务器：com.sun.net.httpserver.HttpServer。
 * 它做的事和我们之前用 EdgeOne Functions 时一致：
 * <pre>
 *   请求进来 → 按 URL 路径找到对应的处理函数 → 执行 → 返回响应
 * </pre>
 *
 * <p>涉及的知识点：
 * <ul>
 *   <li>HttpServer.create —— 创建一个监听指定端口的服务器</li>
 *   <li>createContext(路径, handler) —— 注册「路由」：路径匹配到哪个处理器</li>
 *   <li>HttpHandler 接口 —— 只有一个方法 handle(HttpExchange)，是典型的「函数式接口」，
 *       所以下面可以用 lambda 表达式 `exchange -> ...` 代替匿名类</li>
 *   <li>setExecutor —— 设置线程池：每个请求在独立线程里处理，互不阻塞（并发基础）</li>
 *   <li>工厂方法 static 返回实例 —— 一种常见的对象创建模式</li>
 * </ul>
 */
public class ApiServer {

    /**
     * 创建服务器并注册所有路由。路由规则与 EdgeOne Functions 一一对应：
     * <pre>
     *   /api/auth              POST  校验编辑密码
     *   /api/progress          GET   读取进度（文件不存在时返回 {exists:false}）
     *   /api/progress          PUT   写入进度（校验密码 + 写前自动备份）
     *   /api/progress/restore  POST  从备份恢复
     * </pre>
     *
     * @param port  监听端口
     * @param store 共享的数据存储实例（所有处理器共用一个，保证读写同一份文件）
     * @return 已注册好路由但尚未 start 的 HttpServer
     * @throws IOException 端口被占用或创建失败时抛出
     */
    public static HttpServer create(int port, ProgressStore store) throws IOException {
        // 第一个参数 InetSocketAddress(port) 表示「监听本机所有网卡的该端口」；
        // 第二个参数 0 表示使用系统默认的请求队列长度
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);

        // 把「路径」和「处理器」绑定。每个处理器是一个实现了 HttpHandler 接口的类。
        // 对比 JS 版 Functions：文件名即路由；这里则是代码里显式 createContext，效果一样。
        // wrap(...) 是统一异常边界：任何处理器抛异常都会转成 500 响应并打印堆栈（否则客户端只收到空响应）
        server.createContext("/api/auth", wrap(new AuthHandler(store)));
        server.createContext("/api/progress", wrap(new ProgressHandlerDispatcher(store)));
        server.createContext("/api/progress/restore", wrap(new RestoreHandler(store)));

        // 线程池：默认 HttpServer 是单线程处理，用 4 线程的固定线程池提升并发能力。
        // Executors 是 java.util.concurrent 提供的线程池工厂。
        server.setExecutor(Executors.newFixedThreadPool(4));

        return server;
    }

    /**
     * 异常边界装饰器：在真正的处理器外面再包一层 try/catch。
     *
     * <p>为什么需要它：HttpServer 里处理器抛异常时，默认行为是「直接断开连接」，
     * 客户端只会收到空响应（curl 报 exit 52 empty reply），错误原因完全不可见。
     * 包一层之后：异常 → 打印堆栈到控制台（方便调试）→ 回 500 JSON 给前端。
     *
     * <p>涉及的知识点：
     * <ul>
     *   <li>装饰器模式 —— 不修改原类，在外层加行为（这里是异常捕获）</li>
     *   <li>lambda 实现函数式接口 —— HttpHandler 只有一个方法，可以直接写 exchange -> {...}</li>
     *   <li>多 catch —— 区分「业务异常 IOException（响应可能已部分发送）」与「兜底 Exception」</li>
     * </ul>
     *
     * @param inner 真正的业务处理器
     * @return 包了异常边界的处理器
     */
    private static HttpHandler wrap(HttpHandler inner) {
        return exchange -> {
            try {
                inner.handle(exchange);
            } catch (Exception e) {
                // 打印完整堆栈，开发时一眼定位问题
                e.printStackTrace();
                try {
                    // 回 500。若响应头已发出（流已关闭），这里会再抛 IOException，只能忽略
                    HttpUtil.sendJson(exchange, 500,
                            java.util.Map.of("ok", false, "error", "internal error: " + e));
                } catch (IOException ignored) {
                    // 响应已部分发送，无法再写，忽略
                }
            }
        };
    }

    /**
     * /api/progress 同时要处理 GET 和 PUT 两种方法。
     * EdgeOne Functions 用 onRequestGet / onRequestPut 分开导出；
     * Java 里没有「方法级导出」，所以用一个分发器：先看 HTTP 方法，再交给对应实现。
     *
     * <p>涉及的知识点：
     * <ul>
     *   <li>内部类 / 静态嵌套类 —— 把一个类声明在另一个类里面，组织相关代码</li>
     *   <li>HttpExchange.getRequestMethod() —— 拿到 "GET"/"PUT"/"POST" 等</li>
     *   <li>字符串比较用 equals，不要用 ==（== 比较的是引用地址）</li>
     * </ul>
     */
    static class ProgressHandlerDispatcher implements HttpHandler {
        private final ProgressGetHandler getHandler = new ProgressGetHandler();
        private final ProgressPutHandler putHandler = new ProgressPutHandler();

        public ProgressHandlerDispatcher(ProgressStore store) {
            // 两个子处理器需要共享同一个 store（保证读写的文件一致）
            getHandler.store = store;
            putHandler.store = store;
        }

        @Override
        public void handle(HttpExchange exchange) throws IOException {
            // 跨域预检（OPTIONS）：浏览器发 PUT/POST 跨域请求前会先问一次，
            // 必须在这里统一放行，否则会被下面的 405 拦掉（GET/PUT 处理器内部也会再调用一次，无副作用）
            if (HttpUtil.handlePreflight(exchange)) return;

            String method = exchange.getRequestMethod();
            if ("GET".equals(method)) {
                getHandler.handle(exchange);
            } else if ("PUT".equals(method)) {
                putHandler.handle(exchange);
            } else {
                // 其他方法（DELETE/PATCH…）本项目不支持
                HttpUtil.sendJson(exchange, 405, java.util.Map.of("ok", false, "error", "method not allowed"));
            }
        }
    }
}
