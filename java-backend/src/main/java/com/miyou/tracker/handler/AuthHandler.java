package com.miyou.tracker.handler;

import com.miyou.tracker.AuthService;
import com.miyou.tracker.HttpUtil;
import com.miyou.tracker.ProgressStore;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.util.Map;

/**
 * POST /api/auth —— 校验编辑密码。
 *
 * <p>对应 EdgeOne Functions 的 functions/api/auth/index.js。
 * 前端「解锁编辑」时调用：输入密码 → 这里比对 → 成功则前端进入编辑模式。
 *
 * <p>涉及的知识点：
 * <ul>
 *   <li>implements HttpHandler —— 实现接口（接口只声明了 handle 一个方法）</li>
 *   <li>构造器接收依赖（ProgressStore）—— 简单的依赖注入写法</li>
 *   <li>JsonObject / has / getAsString —— Gson 解析 JSON 对象并取字段</li>
 *   <li>Map.of —— 构造响应体</li>
 * </ul>
 */
public class AuthHandler implements HttpHandler {

    private final ProgressStore store; // 本处理器其实用不到 store，保留是为了演示「依赖注入 + 扩展点」

    public AuthHandler(ProgressStore store) {
        this.store = store;
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        // 浏览器跨域预检请求先放行
        if (HttpUtil.handlePreflight(exchange)) return;

        // 1. 只接受 POST（方法不对 → 405 Method Not Allowed）
        if (!"POST".equals(exchange.getRequestMethod())) {
            HttpUtil.sendJson(exchange, 405, Map.of("ok", false, "error", "method not allowed"));
            return;
        }

        // 2. 读请求体并解析成 JSON：{"password":"xxx"}
        String body = HttpUtil.readBody(exchange);
        var json = HttpUtil.GSON.fromJson(body, com.google.gson.JsonObject.class);

        // 3. 取 password 字段；缺字段/解析失败都按「空密码」处理（统一走校验失败）
        String password = (json != null && json.has("password"))
                ? json.get("password").getAsString()
                : "";

        // 4. 校验（恒定时间比较，见 AuthService 注释）
        boolean ok = AuthService.verify(password);
        if (ok) {
            HttpUtil.sendJson(exchange, 200, Map.of("ok", true));
        } else {
            // 401 = 未授权。前端收到非 200 会提示「密码错误」
            HttpUtil.sendJson(exchange, 401, Map.of("ok", false, "error", "unauthorized"));
        }
    }
}
