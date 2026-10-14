# 编译脚本：把 java-backend/src 下的所有 .java 编译到 java-backend/out
# 用法：powershell -File scripts\build.ps1   或  在 IDE 里右键运行
$ErrorActionPreference = "Stop"

$base = Split-Path -Parent $PSScriptRoot
$src  = Join-Path $base "src\main\java"
$out  = Join-Path $base "out"
$gson = Join-Path $base "lib\gson-2.11.0.jar"

New-Item -ItemType Directory -Force -Path $out | Out-Null

# javac 不支持递归扫描目录，先用 Get-ChildItem 收集全部 .java 的绝对路径，
# 再把数组直接展开成 javac 的命令行参数（文件数量少，无需参数文件 @sources.txt）
$sources = Get-ChildItem -Path $src -Recurse -Filter *.java | ForEach-Object { $_.FullName }
if (-not $sources) {
    Write-Error "没有找到 .java 源文件（$src）"
    exit 1
}

# -encoding UTF-8：源码里含中文注释，必须指定编码否则乱码/报错
# -cp：classpath，这里只依赖 Gson
# -d：编译产物输出目录
& javac -encoding UTF-8 -cp $gson -d $out $sources
if ($LASTEXITCODE -ne 0) {
    Write-Error "编译失败（exit $LASTEXITCODE）"
    exit $LASTEXITCODE
}

Write-Output "编译完成 → $out"
