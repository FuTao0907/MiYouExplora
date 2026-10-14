package com.miyou.tracker;

import com.sun.net.httpserver.HttpExchange;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * HTTP 通用工具：JSON 响应、CORS 跨域头、读取请求体。
 *
 * <p>为什么需要 CORS（跨域资源共享）？
 * 前端 dev 服务器跑在 http://localhost:5173，Java 后端跑在 http://localhost:8080，
 * 两者「源」不同，浏览器默认会拦截跨源的 AJAX 请求。后端必须在响应里声明
 * Access-Control-Allow-Origin 等头，前端才能正常读写。生产环境（EdgeOne）同源部署，无需这些头。
 *
 * <p>涉及的知识点：
 * <ul>
 *   <li>HttpExchange —— JDK HttpServer 中代表「一次请求-响应交换」的对象</li>
 *   <li>Map.of —— 不可变 Map 工厂，用来构造 JSON 响应的字段</li>
 *   <li>静态导入风格：这里全用类名调用，便于初学者看清来源</li>
 *   <li>try-with-resources —— try(资源){} 语法，资源自动关闭，不用手动 finally close</li>
 * </ul>
 */
public final class HttpUtil {

    /** Gson 实例：线程安全，整个程序共用一个即可 */
    public static final com.google.gson.Gson GSON = new com.google.gson.Gson();

    private HttpUtil() {
        // 工具类：禁止实例化
    }

    /**
     * 把 Map 序列化成 JSON 并作为响应写出。
     *
     * @param exchange 当前请求交换对象
     * @param status   HTTP 状态码（200/401/404…）
     * @param body     要序列化的字段（Gson 会自动转成 {"ok":true} 这样的 JSON）
     * @throws IOException 写入失败
     */
    public static void sendJson(HttpExchange exchange, int status, Map<String, Object> body) throws IOException {
        applyCors(exchange); // 先加跨域头
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        byte[] bytes = GSON.toJson(body).getBytes(StandardCharsets.UTF_8);
        // sendResponseHeaders(状态码, 响应体长度)：-1 表示没有响应体；这里用实际字节数
        exchange.sendResponseHeaders(status, bytes.length);
        // getResponseBody() 拿到输出流，写完必须 close，否则客户端收不到结束标志
        try (var out = exchange.getResponseBody()) {
            out.write(bytes);
        }
    }

    /**
     * 原样输出一段 JSON 字符串（GET /api/progress 直接返回存储的进度原文，不套壳）。
     */
    public static void sendRawJson(HttpExchange exchange, int status, String rawJson) throws IOException {
        applyCors(exchange);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        byte[] bytes = rawJson.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(status, bytes.length);
        try (var out = exchange.getResponseBody()) {
            out.write(bytes);
        }
    }

    /**
     * 读取整个请求体为字符串（UTF-8）。
     *
     * @param exchange 当前请求
     * @return 请求体文本；为空时返回 ""（空字符串）
     * @throws IOException 读取失败
     */
    public static String readBody(HttpExchange exchange) throws IOException {
        // InputStream.readAllBytes()：JDK 9+ 提供，把流一次性读完
        try (InputStream in = exchange.getRequestBody()) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    /**
     * 给响应加 CORS 头，允许前端跨域调用。
     * Access-Control-Allow-Origin: * 表示允许任何来源（个人工具可接受；生产建议收紧到自己的域名）。
     */
    private static void applyCors(HttpExchange exchange) {
        var headers = exchange.getResponseHeaders();
        headers.set("Access-Control-Allow-Origin", "*");
        headers.set("Access-Control-Allow-Methods", "GET, PUT, POST, OPTIONS");
        // 前端 PUT 会带 x-edit-password 请求头，必须在这里显式放行
        headers.set("Access-Control-Allow-Headers", "Content-Type, x-edit-password");
    }

    /**
     * 处理 CORS「预检请求」：浏览器在真正的 PUT/POST 跨域请求前，会先发一个
     * OPTIONS 请求问「允不允许这么干」。这里直接放行并返回 204（无内容）。
     *
     * @return true 表示这是预检请求，调用方应直接返回、不再处理业务逻辑
     */
    public static boolean handlePreflight(HttpExchange exchange) throws IOException {
        if ("OPTIONS".equals(exchange.getRequestMethod())) {
            applyCors(exchange);
            exchange.sendResponseHeaders(204, -1); // 204 = 成功但没有内容
            exchange.close();
            return true;
        }
        return false;
    }
}
