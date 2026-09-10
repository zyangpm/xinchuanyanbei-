@echo off
chcp 65001 >nul
cd /d "%~dp0"

set "ELECTRON_EXE=%~dp0node_modules\electron\dist\electron.exe"
set "PATH_TXT=%~dp0node_modules\electron\path.txt"

if not exist "%ELECTRON_EXE%" (
    echo ================================================
    echo    新传研背 V4 - 管理后台启动说明
    echo ================================================
    echo.
    echo   首次启动需要安装依赖：
    echo   1. cmd 中执行：cd /d "%~dp0"
    echo   2. 执行：npm install
    echo   3. 重新运行本文件
    echo.
    echo   或在已启动网页版后访问：
    echo   http://localhost:8081/admin/
    echo ================================================
    pause
    exit /b 1
)

if not exist "%PATH_TXT%" echo electron.exe> "%PATH_TXT%"

echo ================================================
echo    新传研背 V4 - 管理后台
echo ================================================
echo.
echo  正在启动，请稍候...
echo.
cd /d "%~dp0apps\admin"
"%ELECTRON_EXE%" .
set EXITCODE=%ERRORLEVEL%

if not "%EXITCODE%"=="0" (
    echo.
    echo ================================================
    echo  程序异常退出，错误码：%EXITCODE%
    echo  也可启动网页版后访问 http://localhost:8081/admin/
    echo ================================================
    pause
)
