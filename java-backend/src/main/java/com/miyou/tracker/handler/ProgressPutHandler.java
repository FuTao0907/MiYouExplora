package com.miyou.tracker.handler;

import com.miyou.tracker.AuthService;
import com.miyou.tracker.HttpUtil;
import com.miyou.tracker.ProgressStore;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.util.Map;

/**
 * PUT /api/progress —— 写入进度数据（需密码）。
 *
 * <p>对应 EdgeOne Functions 的 onRequestPut。
 * 请求头 x-edit-password 携带密码 → 校验通过 → 校验 body 结构 → 写入（写前自动备份）。
 *
 * <p>涉及的知识点：
 * <ul>
 *   <li>getRequestHeaders().getFirst(name) —— 读 HTTP 请求头（注意是 getFirst，取第一个值）</li>
 *   <li>Gson 解析并做结构校验：has("regions") && regions 是 JSON 对象</li>
 *   <li>isJsonObject() —— 判断某字段是对象还是字符串/数字/数组</li>
 *   <li>三态返回：401 未授权 / 400 请求体非法 / 200 成功</li>
 * </ul>
 */
public class ProgressPutHandler implements HttpHandler {

    /** 由 ProgressHandlerDispatcher 在构造时注入 */
    public ProgressStore store;

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if (HttpUtil.handlePreflight(exchange)) return;

        // 1. 只接受 PUT
        if (!"PUT".equals(exchange.getRequestMethod())) {
            HttpUtil.sendJson(exchange, 405, Map.of("ok", false, "error", "method not allowed"));
            return;
        }

        // 2. 校验密码：密码放在请求头 x-edit-password（与 EdgeOne 版一致）
        String password = exchange.getRequestHeaders().getFirst("x-edit-password");
        if (!AuthService.verify(password)) {
            HttpUtil.sendJson(exchange, 401, Map.of("ok", false, "error", "unauthorized"));
            return;
        }

        // 3. 读 body 并解析
        String body = HttpUtil.readBody(exchange);
        com.google.gson.JsonObject json;
        try {
            json = HttpUtil.GSON.fromJson(body, com.google.gson.JsonObject.class);
        } catch (com.google.gson.JsonSyntaxException e) {
            // 非法 JSON（如不是对象、或语法错误）：按「无效负载」处理，返回 400。
            // 不捕获的话异常会冒泡成 500，与 EdgeOne 版契约不符。
            json = null;
        }

        // 4. 结构校验：必须是对象且包含 regions 对象（对齐前端的 progress 数据格式）
        boolean invalid = json == null
                || !json.has("regions")
                || !json.get("regions").isJsonObject();
        if (invalid) {
            HttpUtil.sendJson(exchange, 400, Map.of("ok", false, "error", "invalid payload"));
            return;
        }

        // 5. 写入（ProgressStore.write 内部会先备份旧版到 progress.json.prev）
        store.write(body);

        // 6. 回显 updated_at（body 里有就取，没有给空串）
        String updatedAt = json.has("updated_at")
                ? json.get("updated_at").getAsString()
                : "";
        HttpUtil.sendJson(exchange, 200, Map.of("ok", true, "updated_at", updatedAt));
    }
}
