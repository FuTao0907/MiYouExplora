package com.miyou.tracker.handler;

import com.miyou.tracker.AuthService;
import com.miyou.tracker.HttpUtil;
import com.miyou.tracker.ProgressStore;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.util.Map;

/**
 * POST /api/progress/restore —— 从自动备份恢复进度（需密码）。
 *
 * <p>对应 EdgeOne Functions 的 functions/api/progress/restore/index.js。
 * 作用：把上一次保存前的 progress.json.prev 覆盖回 progress.json，
 * 用于「误改/误删后找回上一版」。没有备份时返回 404。
 *
 * <p>涉及的知识点：
 * <ul>
 *   <li>业务流程：校验方法 → 预检 → 校验密码 → 调用存储层 → 映射成 HTTP 状态码</li>
 *   <li>store.restore() 返回 boolean —— 用它区分 200 成功 / 404 无备份</li>
 * </ul>
 */
public class RestoreHandler implements HttpHandler {

    private final ProgressStore store;

    public RestoreHandler(ProgressStore store) {
        this.store = store;
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if (HttpUtil.handlePreflight(exchange)) return;

        // 1. 只接受 POST
        if (!"POST".equals(exchange.getRequestMethod())) {
            HttpUtil.sendJson(exchange, 405, Map.of("ok", false, "error", "method not allowed"));
            return;
        }

        // 2. 校验密码（与 PUT 相同：请求头 x-edit-password）
        String password = exchange.getRequestHeaders().getFirst("x-edit-password");
        if (!AuthService.verify(password)) {
            HttpUtil.sendJson(exchange, 401, Map.of("ok", false, "error", "unauthorized"));
            return;
        }

        // 3. 执行恢复：true=成功，false=没有备份
        boolean restored = store.restore();
        if (restored) {
            HttpUtil.sendJson(exchange, 200, Map.of("ok", true));
        } else {
            // 404 = 资源不存在（这里指备份不存在）
            HttpUtil.sendJson(exchange, 404, Map.of("ok", false, "error", "no backup"));
        }
    }
}
