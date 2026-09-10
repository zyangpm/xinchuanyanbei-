@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ==================================================
echo    新传研背 V4 - 网页版服务
echo ==================================================
echo.
echo  服务启动后会自动打开浏览器，手机可扫码访问
echo  学生端：http://localhost:8081
echo  管理后台：http://localhost:8081/admin/
echo.
echo  请勿关闭此窗口，关闭即停止服务
echo.
node apps\mobile\start-server.js
echo.
echo --------------------------------------------------
echo  服务已停止。
echo  若上方出现 EADDRINUSE 错误，说明服务已经在运行，
echo  直接用浏览器打开 http://localhost:8081 即可。
echo --------------------------------------------------
pause >nul
