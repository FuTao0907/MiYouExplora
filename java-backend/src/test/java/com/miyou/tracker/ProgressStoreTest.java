package com.miyou.tracker;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * ProgressStore（本地文件存储层：写前自动备份 + 恢复）的单元测试。
 *
 * <p>测试要点：
 * <ul>
 *   <li>@TempDir —— JUnit 为每个测试方法自动创建独立临时目录，
 *       测试结束后自动清理。每个测试互不干扰，符合「每个测试独立构造状态」</li>
 *   <li>数据完整性契约：写 → 读必须原样一致；二次写入必须先把旧版备份成
 *       progress.json.prev；restore 必须能回到上一版</li>
 *   <li>最后一个测试是一条「状态轨迹」：写A → 写B → 恢复A → 写C → 读C，
 *       验证中间状态和最终不变量（备份始终是恢复后的 A）</li>
 * </ul>
 */
class ProgressStoreTest {

    @TempDir
    Path tempDir; // 每个测试方法的独立临时目录

    /** 备份文件的文件名与生产代码保持一致（写死在这里，防止两处漂移） */
    private static final String BACKUP = "progress.json.prev";

    @Test
    void 首次读取返回null() throws Exception {
        ProgressStore store = new ProgressStore(tempDir);
        assertNull(store.read());
    }

    @Test
    void 写入后能原样读回() throws Exception {
        ProgressStore store = new ProgressStore(tempDir);
        String json = "{\"version\":2,\"regions\":{}}";
        store.write(json);
        assertEquals(json, store.read());
    }

    @Test
    void 二次写入前自动备份上一版() throws Exception {
        ProgressStore store = new ProgressStore(tempDir);
        store.write("{\"v\":1}");
        store.write("{\"v\":2}");

        // 最新读到的应是第二版；备份文件里应是第一版
        assertEquals("{\"v\":2}", store.read());
        String backup = Files.readString(tempDir.resolve(BACKUP), StandardCharsets.UTF_8);
        assertEquals("{\"v\":1}", backup);
    }

    @Test
    void 恢复能回到上一版() throws Exception {
        ProgressStore store = new ProgressStore(tempDir);
        store.write("{\"v\":1}");
        store.write("{\"v\":2}");

        assertTrue(store.restore());
        assertEquals("{\"v\":1}", store.read());
    }

    @Test
    void 没有备份时恢复返回false() throws Exception {
        ProgressStore store = new ProgressStore(tempDir);
        assertFalse(store.restore());
    }

    @Test
    void 状态轨迹_恢复后再次写入备份基于恢复结果() throws Exception {
        ProgressStore store = new ProgressStore(tempDir);
        store.write("{\"v\":\"A\"}");
        store.write("{\"v\":\"B\"}");
        store.restore();                 // 读到的数据回到 A
        store.write("{\"v\":\"C\"}");    // 此时备份的应是 A，而不是 B

        assertEquals("{\"v\":\"C\"}", store.read());
        String backup = Files.readString(tempDir.resolve(BACKUP), StandardCharsets.UTF_8);
        assertEquals("{\"v\":\"A\"}", backup);
    }
}
