package com.miyou.tracker;

import java.security.MessageDigest;
import java.util.Objects;

/**
 * 编辑密码校验（对应 EdgeOne Functions 里的 env.EDIT_PASSWORD 判断）。
 *
 * <p>安全要点（和前端版本的区别）：
 * <ul>
 *   <li>密码<strong>不能写在代码里</strong>，从环境变量 EDIT_PASSWORD 读取——部署时由平台注入；
 *       代码里只留一个开发期默认值，并且主程序会打印提示</li>
 *   <li>比较字符串用<strong>恒定时间比较</strong>（MessageDigest.isEqual），
 *       避免「先比较对了几个字符就提前返回」造成的时间差，被攻击者用来逐位猜密码</li>
 * </ul>
 *
 * <p>涉及的知识点：
 * <ul>
 *   <li>static 方法 —— 不依赖实例状态，可以直接 AuthService.verify(...) 调用</li>
 *   <li>System.getenv() —— 读环境变量；getOrDefault 提供默认值</li>
 *   <li>Objects.requireNonNullElse —— 把 null 安全地替换成默认值</li>
 *   <li>MessageDigest —— JDK 安全包里的摘要工具，这里借用它的等值比较</li>
 * </ul>
 */
public final class AuthService {

    /** 环境变量名：生产部署时在平台配置 EDIT_PASSWORD=你的密码 */
    public static final String ENV_PASSWORD = "EDIT_PASSWORD";

    /** 仅供本地开发使用。如果没设环境变量，就允许这个默认密码（README 会提醒生产必须设置） */
    private static final String DEV_FALLBACK_PASSWORD = "genshin2026";

    private AuthService() {
        // 私有构造器：这个类只提供静态方法，不允许 new
    }

    /**
     * 校验用户提交的密码是否正确。
     *
     * @param candidate 用户输入（可能为 null）
     * @return true = 通过；false = 拒绝
     */
    public static boolean verify(String candidate) {
        // 1. 取「真实密码」：优先环境变量，没有就用开发默认值
        String real = System.getenv().getOrDefault(ENV_PASSWORD, DEV_FALLBACK_PASSWORD);

        // 2. 用户输入为空 → 直接拒绝（空密码永远不对，避免 NPE 扩散）
        if (candidate == null || candidate.isEmpty()) {
            return false;
        }

        // 3. 恒定时间比较：把两边都转成 UTF-8 字节再整体比较。
        //    普通 equals 在第一个不同字符处就返回，耗时随「猜对的位数」变化，属于时序侧信道；
        //    MessageDigest.isEqual 固定遍历全部字节，耗时与内容无关。
        return MessageDigest.isEqual(
                real.getBytes(java.nio.charset.StandardCharsets.UTF_8),
                candidate.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    /**
     * 仅供启动日志使用：提示用户当前密码来源。
     *
     * @return 当前生效的密码来源说明
     */
    public static String describeSource() {
        boolean fromEnv = System.getenv().containsKey(ENV_PASSWORD);
        return fromEnv
                ? "来自环境变量 " + ENV_PASSWORD
                : "未设置环境变量，使用开发默认密码（生产环境请务必设置 " + ENV_PASSWORD + "）";
    }
}
