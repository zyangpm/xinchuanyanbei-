@echo off
chcp 65001 >nul
cd /d "%~dp0"

set "ELECTRON_EXE=%~dp0node_modules\electron\dist\electron.exe"
set "PATH_TXT=%~dp0node_modules\electron\path.txt"

if not exist "%ELECTRON_EXE%" (
    echo ================================================
    echo    新传研背 V4 - 启动说明
    echo ================================================
    echo.
    echo   首次启动需要安装依赖，请手动执行：
    echo.
    echo   1. 打开命令提示符 cmd
    echo   2. 输入：cd /d "%~dp0"
    echo   3. 输入：npm install
    echo   4. 安装完成后重新运行本文件
    echo.
    echo   或者直接使用网页版：
    echo   双击 "启动网页版.bat"，浏览器访问 http://localhost:8081
    echo.
    echo ================================================
    pause
    exit /b 1
)

rem 修复 electron 安装标记文件丢失导致的启动闪退
if not exist "%PATH_TXT%" echo electron.exe> "%PATH_TXT%"

echo ================================================
echo    新传研背 V4 - 学生端APP
echo ================================================
echo.
echo  正在启动，请稍候...
echo.
cd /d "%~dp0apps\mobile"
"%ELECTRON_EXE%" .
set EXITCODE=%ERRORLEVEL%

if not "%EXITCODE%"=="0" (
    echo.
    echo ================================================
    echo  程序异常退出，错误码：%EXITCODE%
    echo  可改用 "启动网页版.bat"，或重新执行 npm install
    echo ================================================
    pause
)
