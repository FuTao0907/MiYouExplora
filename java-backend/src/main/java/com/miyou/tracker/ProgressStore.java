package com.miyou.tracker;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * 进度数据的「存储层」：负责把 JSON 文本持久化到本地文件。
 *
 * <p>对应 EdgeOne 版里的 Blob 存储（store.get / store.setJSON），
 * 但这里是纯本地文件——学习副本不连云端，数据就存在 java-backend/data/ 下。
 *
 * <p>涉及的知识点：
 * <ul>
 *   <li>Path / Files —— JDK 7+ 的文件 API（NIO.2），比 File 更现代</li>
 *   <li>readString / writeString —— 一行代码读写整个文本文件（UTF-8）</li>
 *   <li>Files.exists —— 判断文件是否存在</li>
 *   <li>copy(REPLACE_EXISTING) —— 覆盖式拷贝，实现「自动备份」</li>
 *   <li>异常：方法声明 throws IOException，让上层决定怎么处理</li>
 * </ul>
 */
public class ProgressStore {

    /** 正式数据文件名（对应前端 progress.json 的云端版本） */
    private static final String DATA_FILE = "progress.json";

    /** 自动备份文件名：每次写入前，把旧版本先存到这里 */
    private static final String BACKUP_FILE = "progress.json.prev";

    private final Path dataDir;

    /**
     * @param dataDir 数据目录（如 "data"），目录不存在会自动创建
     */
    public ProgressStore(Path dataDir) {
        this.dataDir = dataDir;
        try {
            Files.createDirectories(dataDir); // 目录不存在就递归创建
        } catch (IOException e) {
            throw new IllegalStateException("无法创建数据目录: " + dataDir, e);
        }
    }

    /**
     * 读取当前进度。
     *
     * @return 文件内容字符串；文件不存在时返回 null（调用方据此返回 {exists:false}）
     * @throws IOException 读取失败
     */
    public String read() throws IOException {
        Path path = dataDir.resolve(DATA_FILE); // resolve = 拼接子路径
        if (!Files.exists(path)) {
            return null; // 首次运行还没有数据文件
        }
        return Files.readString(path, StandardCharsets.UTF_8);
    }

    /**
     * 写入进度。规则与 EdgeOne 版完全一致：<strong>写之前先把旧版本备份</strong>，
     * 这样误改后还能用 /api/progress/restore 恢复（弥补「无版本历史」的缺陷）。
     *
     * @param json 要写入的完整 JSON 文本
     * @throws IOException 写入失败
     */
    public void write(String json) throws IOException {
        Path dataPath = dataDir.resolve(DATA_FILE);
        Path backupPath = dataDir.resolve(BACKUP_FILE);

        // 1. 如果当前已有一份数据，先把它拷贝成 .prev
        if (Files.exists(dataPath)) {
            Files.copy(dataPath, backupPath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        }

        // 2. 写入新数据（覆盖旧文件）
        Files.writeString(dataPath, json, StandardCharsets.UTF_8);
    }

    /**
     * 从备份恢复：把 progress.json.prev 覆盖回 progress.json。
     *
     * @return true = 恢复成功；false = 没有备份可恢复
     * @throws IOException 文件操作失败
     */
    public boolean restore() throws IOException {
        Path dataPath = dataDir.resolve(DATA_FILE);
        Path backupPath = dataDir.resolve(BACKUP_FILE);
        if (!Files.exists(backupPath)) {
            return false; // 一次都没写入过，自然没有备份
        }
        Files.copy(backupPath, dataPath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        return true;
    }
}
