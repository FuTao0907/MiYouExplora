package com.miyou.tracker;

import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpContext;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpPrincipal;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;

/**
 * 测试替身（Test Double）：内存版 HttpExchange。
 *
 * <p>handler 接收的 HttpExchange 是 JDK HttpServer 在真实 HTTP 请求时创建的对象，
 * 单元测试不启动服务器，所以手动实现一个子类：把「请求方法 + 请求头 + 请求体」
 * 用内存数据模拟，把「响应状态码 + 响应体」记录到字段里供断言读取。
 *
 * <p>涉及的知识点：
 * <ul>
 *   <li>extends HttpExchange —— HttpExchange 是抽象类，必须实现全部抽象方法；
 *       本次测试只用到其中 7 个，其余返回空实现</li>
 *   <li>Headers —— HttpServer 自带的「多值头」容器，set 覆盖、getFirst 取首个</li>
 *   <li>ByteArrayOutputStream —— 内存输出流，最后 toString 取出响应文本</li>
 * </ul>
 */
public class FakeHttpExchange extends HttpExchange {

    private final String method;
    private final Headers requestHeaders = new Headers();
    private final Headers responseHeaders = new Headers();
    private final byte[] requestBodyBytes;
    private final ByteArrayOutputStream responseBodyBytes = new ByteArrayOutputStream();
    private int responseStatus = -1; // -1 = 尚未调用 sendResponseHeaders

    /**
     * @param method      请求方法（GET / PUT / POST / OPTIONS …）
     * @param requestBody 请求体文本（null = 空请求体）
     */
    public FakeHttpExchange(String method, String requestBody) {
        this.method = method;
        this.requestBodyBytes = (requestBody == null)
                ? new byte[0]
                : requestBody.getBytes(StandardCharsets.UTF_8);
    }

    /** 方便测试设置请求头（如 x-edit-password） */
    public void putHeader(String name, String value) {
        requestHeaders.set(name, value);
    }

    /** 测试断言用：响应状态码 */
    public int getResponseStatus() {
        return responseStatus;
    }

    /** 测试断言用：响应体全文（UTF-8） */
    public String getResponseBodyText() {
        return responseBodyBytes.toString(StandardCharsets.UTF_8);
    }

    // ---- 以下 7 个是 handler 真正用到的方法 ----

    @Override
    public String getRequestMethod() {
        return method;
    }

    @Override
    public Headers getRequestHeaders() {
        return requestHeaders;
    }

    @Override
    public InputStream getRequestBody() {
        return new ByteArrayInputStream(requestBodyBytes);
    }

    @Override
    public Headers getResponseHeaders() {
        return responseHeaders;
    }

    @Override
    public OutputStream getResponseBody() {
        return responseBodyBytes;
    }

    @Override
    public void sendResponseHeaders(int rCode, long responseLength) throws IOException {
        responseStatus = rCode; // 记录状态码，不做真实网络发送
    }

    // ---- 以下为本次测试未用到、但抽象类要求实现的空实现 ----

    @Override public URI getRequestURI() { return URI.create("/"); }
    @Override public HttpContext getHttpContext() { return null; }
    @Override public void close() { }
    @Override public InetSocketAddress getRemoteAddress() { return new InetSocketAddress(0); }
    @Override public int getResponseCode() { return responseStatus; }
    @Override public InetSocketAddress getLocalAddress() { return new InetSocketAddress(0); }
    @Override public String getProtocol() { return "HTTP/1.1"; }
    @Override public Object getAttribute(String name) { return null; }
    @Override public void setAttribute(String name, Object value) { }
    @Override public void setStreams(InputStream i, OutputStream o) { }
    @Override public HttpPrincipal getPrincipal() { return null; }
}
