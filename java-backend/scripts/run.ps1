# 启动脚本：运行编译好的 Java 后端（默认端口 8080）
# 用法：powershell -File scripts\run.ps1
# 改端口：$env:PORT = "9000"; powershell -File scripts\run.ps1
$base = Split-Path -Parent $PSScriptRoot
$out  = Join-Path $base "out"
$gson = Join-Path $base "lib\gson-2.11.0.jar"

# 切到 java-backend 目录再运行：ProgressStore 的数据目录 "data" 是相对路径，
# 工作目录必须是 java-backend，数据才会落在 java-backend\data\ 下
Set-Location $base

# Windows 下 classpath 分隔符是分号（Linux/macOS 是冒号）
& java -cp "$out;$gson" com.miyou.tracker.Main
