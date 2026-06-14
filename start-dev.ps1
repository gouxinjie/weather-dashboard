# ============================================
# 城市环境与天气大屏 - 开发启动脚本 (PowerShell)
# 同时启动前端 (Vite) 和后端 (Express)
# 使用方法: .\start-dev.ps1
# 如遇执行策略限制，请先执行: Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
# ============================================

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  城市环境与天气大屏 - 启动开发环境" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查前端依赖
if (-not (Test-Path "$projectRoot\node_modules")) {
    Write-Host "[前端] 检测到缺少依赖，正在安装..." -ForegroundColor Yellow
    Set-Location $projectRoot
    npm install
    Write-Host ""
}

# 检查后端依赖
if (-not (Test-Path "$projectRoot\server\node_modules")) {
    Write-Host "[后端] 检测到缺少依赖，正在安装..." -ForegroundColor Yellow
    Set-Location "$projectRoot\server"
    npm install
    Set-Location $projectRoot
    Write-Host ""
}

# 检查 .env 文件
if (-not (Test-Path "$projectRoot\server\.env")) {
    Write-Host "[警告] 未检测到 server\.env 文件！" -ForegroundColor Red
    Write-Host "请创建 server\.env 并配置 QWEATHER_API_KEY=你的和风天气Key" -ForegroundColor Red
    Write-Host ""
}

# 启动后端
Write-Host "[启动] 后端服务 (端口 3201)..." -ForegroundColor Green
$backendJob = Start-Process -FilePath "cmd" -ArgumentList "/c", "cd /d `"$projectRoot\server`" && npx tsx watch src/app/index.ts" -WindowStyle Minimized -PassThru

# 等待后端启动
Write-Host "[等待] 等待后端启动 (3秒)..." -ForegroundColor Gray
Start-Sleep -Seconds 3

# 启动前端
Write-Host "[启动] 前端服务 (端口 3200)..." -ForegroundColor Green
$frontendJob = Start-Process -FilePath "cmd" -ArgumentList "/c", "cd /d `"$projectRoot`" && npx vite --open" -WindowStyle Minimized -PassThru

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  启动完成！" -ForegroundColor Green
Write-Host "  前端: http://localhost:3200" -ForegroundColor White
Write-Host "  后端: http://localhost:3201" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "关闭本窗口不会停止前后端服务。" -ForegroundColor Gray
Write-Host "可在任务管理器中结束 node.exe 进程来停止。" -ForegroundColor Gray
Write-Host ""

Read-Host "按 Enter 键退出"
