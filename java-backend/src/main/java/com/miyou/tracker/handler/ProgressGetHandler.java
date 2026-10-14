package com.miyou.tracker.handler;

import com.miyou.tracker.HttpUtil;
import com.miyou.tracker.ProgressStore;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;

/**
 * GET /api/progress —— 读取进度数据（任何人可读，无需密码）。
 *
 * <p>对应 EdgeOne Functions 的 onRequestGet。
 * 行为对齐：本地文件不存在时返回 {"exists":false}，前端收到后会自动回退到
 * 主项目的 /data/progress.json 种子数据（首次部署/首次运行场景）。
 *
 * <p>涉及的知识点：
 * <ul>
 *   <li>字段直接赋值（store 是包级可见的 public 字段，由分发器注入）——
 *       比构造器注入更简单，适合演示；正式项目更推荐构造器注入</li>
 *   <li>null 判断 —— 文件不存在 → 返回占位 JSON</li>
 * </ul>
 */
public class ProgressGetHandler implements HttpHandler {

    /** 由 ProgressHandlerDispatcher 在构造时注入（见 ApiServer.java 注释） */
    public ProgressStore store;

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        // GET 没有预检请求（简单请求），但仍统一处理以防万一
        if (HttpUtil.handlePreflight(exchange)) return;

        if (!"GET".equals(exchange.getRequestMethod())) {
            HttpUtil.sendJson(exchange, 405, java.util.Map.of("ok", false, "error", "method not allowed"));
            return;
        }

        String data = store.read(); // null = 还没有数据文件
        if (data == null) {
            // 前端契约：{exists:false} → 前端回退种子数据
            HttpUtil.sendJson(exchange, 200, java.util.Map.of("exists", false));
        } else {
            // 原样返回存储的 JSON 正文（不套壳、不改写）
            HttpUtil.sendRawJson(exchange, 200, data);
        }
    }
}
