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
 * ProgressPutHandler（PUT /api/progress，写入进度，需密码 + 结构校验）的单元测试。
 *
 * <p>契约三态：401 未授权（缺密码/密码错）→ 400 请求体非法 → 200 成功并落盘。
 */
class ProgressPutHandlerTest {

    @TempDir
    Path tempDir;

    private ProgressPutHandler newHandler() {
        ProgressPutHandler handler = new ProgressPutHandler();
        handler.store = new ProgressStore(tempDir);
        return handler;
    }

    /** 构造一个带密码头的合法请求 */
    private FakeHttpExchange putWithPassword(String body) {
        FakeHttpExchange ex = new FakeHttpExchange("PUT", body);
        ex.putHeader("x-edit-password", "genshin2026");
        return ex;
    }

    @Test
    void 缺密码返回401() throws Exception {
        FakeHttpExchange ex = new FakeHttpExchange("PUT", "{\"regions\":{}}");
        newHandler().handle(ex);
        assertEquals(401, ex.getResponseStatus());
    }

    @Test
    void 密码错误返回401() throws Exception {
        FakeHttpExchange ex = new FakeHttpExchange("PUT", "{\"regions\":{}}");
        ex.putHeader("x-edit-password", "wrong");
        newHandler().handle(ex);
        assertEquals(401, ex.getResponseStatus());
    }

    @Test
    void 密码正确但body非法返回400() throws Exception {
        // 缺 regions 字段 / regions 不是对象 → 400
        FakeHttpExchange noRegions = putWithPassword("{}");
        newHandler().handle(noRegions);
        assertEquals(400, noRegions.getResponseStatus());

        FakeHttpExchange regionsNotObject = putWithPassword("{\"regions\":[1,2]}");
        newHandler().handle(regionsNotObject);
        assertEquals(400, regionsNotObject.getResponseStatus());

        FakeHttpExchange notJson = putWithPassword("not-json{");
        newHandler().handle(notJson);
        assertEquals(400, notJson.getResponseStatus());
    }

    @Test
    void 密码正确且body合法返回200并写入文件() throws Exception {
        Assumptions.assumeTrue(System.getenv(AuthService.ENV_PASSWORD) == null,
                "已设置 EDIT_PASSWORD，默认密码路径跳过");
        ProgressPutHandler handler = newHandler();
        FakeHttpExchange ex = putWithPassword("{\"version\":2,\"regions\":{\"m\":{}}}");
        handler.handle(ex);

        assertEquals(200, ex.getResponseStatus());
        assertTrue(ex.getResponseBodyText().contains("\"ok\":true"));
        // 落盘验证：用同一个 store 读回，内容应与写入一致
        assertEquals("{\"version\":2,\"regions\":{\"m\":{}}}", handler.store.read());
    }

    @Test
    void 非PUT方法返回405() throws Exception {
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
}
