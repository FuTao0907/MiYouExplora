package com.miyou.tracker.handler;

import com.miyou.tracker.FakeHttpExchange;
import com.miyou.tracker.ProgressStore;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * ProgressGetHandler（GET /api/progress，读取进度，任何人可读）的单元测试。
 */
class ProgressGetHandlerTest {

    @TempDir
    Path tempDir;

    private ProgressGetHandler newHandler() {
        ProgressGetHandler handler = new ProgressGetHandler();
        handler.store = new ProgressStore(tempDir); // 该 handler 用 public 字段注入（见源码注释）
        return handler;
    }

    @Test
    void 无数据文件时返回exists_false() throws Exception {
        FakeHttpExchange ex = new FakeHttpExchange("GET", null);
        newHandler().handle(ex);
        assertEquals(200, ex.getResponseStatus());
        assertTrue(ex.getResponseBodyText().contains("\"exists\":false"));
    }

    @Test
    void 有数据时原样返回存储内容() throws Exception {
        ProgressStore store = new ProgressStore(tempDir);
        store.write("{\"version\":2,\"regions\":{\"m\":{}}}");

        ProgressGetHandler handler = new ProgressGetHandler();
        handler.store = store;
        FakeHttpExchange ex = new FakeHttpExchange("GET", null);
        handler.handle(ex);

        assertEquals(200, ex.getResponseStatus());
        assertEquals("{\"version\":2,\"regions\":{\"m\":{}}}", ex.getResponseBodyText());
    }

    @Test
    void 非GET方法返回405() throws Exception {
        FakeHttpExchange ex = new FakeHttpExchange("PUT", "{}");
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
