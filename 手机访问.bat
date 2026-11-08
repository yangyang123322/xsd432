@echo off
cd /d "%~dp0"
echo ============================================================
echo   432 应用统计题库 - 手机访问
echo   手机要和这台电脑连同一个 WiFi
echo ============================================================
echo.
echo 在手机浏览器里打开下面其中一个地址（端口 8000）：
echo.
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  for /f "tokens=* delims= " %%b in ("%%a") do echo     http://%%b:8000/
)
echo.
echo   127.0.0.1 是电脑本机，手机打不开，认 192.168 / 10. 开头的
echo   打不开先在 Windows 防火墙里允许 python，或临时关掉防火墙
echo.
echo 关掉这个窗口或按 Ctrl+C 就停止服务。
echo ============================================================
echo.
python -m http.server 8000
pause
