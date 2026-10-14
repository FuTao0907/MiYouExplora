package com.miyou.tracker;

import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * AuthService（编辑密码校验）的单元测试。
 *
 * <p>测试要点（也即 JUnit 要展示的知识点）：
 * <ul>
 *   <li>@Test —— 标记一个测试方法</li>
 *   <li>assertTrue / assertFalse —— 断言布尔结果</li>
 *   <li>Assumptions.assumeTrue —— 「前置条件假设」：条件不满足就跳过该测试，
 *       而不是失败。这里用来保护「默认密码路径」——只有当前环境没设
 *       EDIT_PASSWORD 时，默认密码 genshin2026 才是真实密码</li>
 *   <li>包级方法 AuthService.verify(candidate, real) —— 依赖注入式的可测入口，
 *       绕开「测试无法修改进程环境变量」的限制</li>
 * </ul>
 */
class AuthServiceTest {

    @Test
    void 未设置环境变量时开发默认密码可通过() {
        // 前置条件：进程环境里没有 EDIT_PASSWORD，默认值才生效
        Assumptions.assumeTrue(System.getenv(AuthService.ENV_PASSWORD) == null,
                "已设置 EDIT_PASSWORD，默认密码路径跳过");
        assertTrue(AuthService.verify("genshin2026"));
    }

    @Test
    void 未设置环境变量时错误密码被拒绝() {
        Assumptions.assumeTrue(System.getenv(AuthService.ENV_PASSWORD) == null,
                "已设置 EDIT_PASSWORD，默认密码路径跳过");
        assertFalse(AuthService.verify("wrong-password"));
    }

    @Test
    void 空输入被拒绝且不抛异常() {
        // 覆盖公开入口与包级入口两条路径：null / 空串都必须 false，且不能抛 NPE
        assertFalse(AuthService.verify(null));
        assertFalse(AuthService.verify(""));
        assertFalse(AuthService.verify(null, "abc123"));
        assertFalse(AuthService.verify("", "abc123"));
    }

    @Test
    void 显式密码完全一致时通过() {
        assertTrue(AuthService.verify("abc123", "abc123"));
    }

    @Test
    void 显式密码不同时被拒绝() {
        // 只差一个字符也必须拒绝——防止「只比较长度」之类的错误实现蒙混过关
        assertFalse(AuthService.verify("abc124", "abc123"));
        assertFalse(AuthService.verify("abc12", "abc123"));
    }
}
