# 单元测试脚本：编译 main + test 源码，然后用 JUnit Platform Console 运行全部测试
# 用法：powershell -File scripts\test.ps1
# 依赖：lib/junit-platform-console-standalone-1.11.4.jar（已随仓库提供）
$ErrorActionPreference = "Stop"

$base = Split-Path -Parent $PSScriptRoot
$srcMain = Join-Path $base "src\main\java"
$srcTest = Join-Path $base "src\test\java"
$out  = Join-Path $base "out"
$gson = Join-Path $base "lib\gson-2.11.0.jar"
$junit = Join-Path $base "lib\junit-platform-console-standalone-1.11.4.jar"

if (-not (Test-Path $junit)) {
    Write-Error "缺少 JUnit jar：$junit（重新下载见 README 测试章节）"
    exit 1
}

New-Item -ItemType Directory -Force -Path $out | Out-Null

# 1. 编译 main 源码（先于 test：test 依赖 main 的 class）
$mainSources = Get-ChildItem -Path $srcMain -Recurse -Filter *.java | ForEach-Object { $_.FullName }
if ($mainSources) {
    & javac -encoding UTF-8 -cp $gson -d $out $mainSources
    if ($LASTEXITCODE -ne 0) { Write-Error "main 编译失败"; exit $LASTEXITCODE }
}

# 2. 编译 test 源码（classpath = 产物目录 + gson + junit）
$testSources = Get-ChildItem -Path $srcTest -Recurse -Filter *.java | ForEach-Object { $_.FullName }
if (-not $testSources) {
    Write-Error "没有找到测试源码（$srcTest）"
    exit 1
}
& javac -encoding UTF-8 -cp "$out;$gson;$junit" -d $out $testSources
if ($LASTEXITCODE -ne 0) { Write-Error "test 编译失败"; exit $LASTEXITCODE }

# 3. 用 console-standalone 运行（--scan-class-path 自动发现 out 下的所有测试）
& java -jar $junit --class-path "$out;$gson" --scan-class-path --disable-banner
if ($LASTEXITCODE -ne 0) { Write-Error "存在失败的测试（exit $LASTEXITCODE）"; exit $LASTEXITCODE }

Write-Output "全部测试通过 ✓"
