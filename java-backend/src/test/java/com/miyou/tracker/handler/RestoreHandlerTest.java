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
 * RestoreHandler（POST /api/progress/restore，从备份恢复，需密码）的单元测试。
 *
 * <p>契约：无备份 → 404；有备份 → 200 且数据回到上一版；无密码/密码错 → 401。
 */
class RestoreHandlerTest {

    @TempDir
    Path tempDir;

    private RestoreHandler newHandler() {
        return new RestoreHandler(new ProgressStore(tempDir));
    }

    @Test
    void 没有备份时返回404() throws Exception {
        Assumptions.assumeTrue(System.getenv(AuthService.ENV_PASSWORD) == null,
                "已设置 EDIT_PASSWORD，默认密码路径跳过");
        FakeHttpExchange ex = new FakeHttpExchange("POST", null);
        ex.putHeader("x-edit-password", "genshin2026");
        newHandler().handle(ex);
        assertEquals(404, ex.getResponseStatus());
        assertTrue(ex.getResponseBodyText().contains("\"no backup\""));
    }

    @Test
    void 有备份时恢复成功返回200且数据回到上一版() throws Exception {
        Assumptions.assumeTrue(System.getenv(AuthService.ENV_PASSWORD) == null,
                "已设置 EDIT_PASSWORD，默认密码路径跳过");
        ProgressStore store = new ProgressStore(tempDir);
        store.write("{\"v\":1}");
        store.write("{\"v\":2}");

        RestoreHandler handler = new RestoreHandler(store);
        FakeHttpExchange ex = new FakeHttpExchange("POST", null);
        ex.putHeader("x-edit-password", "genshin2026");
        handler.handle(ex);

        assertEquals(200, ex.getResponseStatus());
        assertEquals("{\"v\":1}", store.read());
    }

    @Test
    void 缺密码返回401() throws Exception {
        FakeHttpExchange ex = new FakeHttpExchange("POST", null);
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
}
