package com.miyou.tracker.handler;

import com.miyou.tracker.AuthService;
import com.miyou.tracker.FakeHttpExchange;
import com.miyou.tracker.ProgressStore;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * AuthHandler（POST /api/auth，校验编辑密码）的单元测试。
 *
 * <p>用 FakeHttpExchange 替身直接调用 handler.handle(...)，断言响应状态码。
 * 前置条件：进程环境未设 EDIT_PASSWORD（否则「正确密码 200」这一行不成立）。
 */
class AuthHandlerTest {

    @TempDir
    Path tempDir;

    private AuthHandler newHandler() {
        return new AuthHandler(new ProgressStore(tempDir));
    }

    @Test
    void 正确密码返回200() throws Exception {
        Assumptions.assumeTrue(System.getenv(AuthService.ENV_PASSWORD) == null,
                "已设置 EDIT_PASSWORD，默认密码路径跳过");
        FakeHttpExchange ex = new FakeHttpExchange("POST", "{\"password\":\"genshin2026\"}");
        newHandler().handle(ex);
        assertEquals(200, ex.getResponseStatus());
    }

    @Test
    void 错误密码返回401() throws Exception {
        Assumptions.assumeTrue(System.getenv(AuthService.ENV_PASSWORD) == null,
                "已设置 EDIT_PASSWORD，默认密码路径跳过");
        FakeHttpExchange ex = new FakeHttpExchange("POST", "{\"password\":\"wrong\"}");
        newHandler().handle(ex);
        assertEquals(401, ex.getResponseStatus());
    }

    @Test
    void 缺少password字段按拒绝处理() throws Exception {
        Assumptions.assumeTrue(System.getenv(AuthService.ENV_PASSWORD) == null,
                "已设置 EDIT_PASSWORD，默认密码路径跳过");
        FakeHttpExchange ex = new FakeHttpExchange("POST", "{}");
        newHandler().handle(ex);
        assertEquals(401, ex.getResponseStatus());
    }

    @Test
    void 非法JSON按拒绝处理() throws Exception {
        Assumptions.assumeTrue(System.getenv(AuthService.ENV_PASSWORD) == null,
                "已设置 EDIT_PASSWORD，默认密码路径跳过");
        // 回归测试：Gson 解析非法 JSON 会抛 JsonSyntaxException，
        // 必须捕获并按「无有效请求体」处理（返回 401），而不是冒泡成 500
        FakeHttpExchange ex = new FakeHttpExchange("POST", "not-json{");
        newHandler().handle(ex);
        assertEquals(401, ex.getResponseStatus());
    }

    @Test
    void 非POST方法返回405() throws Exception {
        FakeHttpExchange ex = new FakeHttpExchange("GET", null);
        newHandler().handle(ex);
        assertEquals(405, ex.getResponseStatus());
    }

    @Test
    void 预检请求放行返回204() throws Exception {
        FakeHttpExchange ex = new FakeHttpExchange("OPTIONS", null);
        newHandler().handle(ex);
        assertEquals(204, ex.getResponseStatus());
    }

    @Test
    void 响应体是合法JSON且带ok字段() throws Exception {
        Assumptions.assumeTrue(System.getenv(AuthService.ENV_PASSWORD) == null,
                "已设置 EDIT_PASSWORD，默认密码路径跳过");
        FakeHttpExchange ex = new FakeHttpExchange("POST", "{\"password\":\"genshin2026\"}");
        newHandler().handle(ex);
        String body = ex.getResponseBodyText();
        assertTrue(body.contains("\"ok\":true"), "响应体应包含 ok:true，实际: " + body);
    }
}
