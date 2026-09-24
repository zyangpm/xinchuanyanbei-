@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ==================================================
echo    新传研背 - 本地一键启动
echo    （后端 3000 + 前端 8081 一起开）
echo ==================================================
echo.

echo [1/2] 正在启动后端服务（端口 3000）...
start "新传研背-后端(3000)" cmd /k "cd /d "%~dp0apps\server" && node src\server.js"

timeout /t 2 /nobreak >nul

echo [2/2] 正在启动前端服务（端口 8081）...
start "新传研背-前端(8081)" cmd /k "cd /d "%~dp0" && node apps\mobile\start-server.js"

echo.
echo ==================================================
echo   启动完成！浏览器会自动打开，稍等几秒即可。
echo.
echo   学生端:   http://localhost:8081
echo   管理后台: http://localhost:8081/admin/
echo ==================================================
echo.
echo   注意：那两个黑色窗口不要关闭，关闭即停止服务。
echo   本窗口按任意键关闭（不影响服务运行）。
pause >nul
