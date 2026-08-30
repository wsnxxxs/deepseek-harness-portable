@echo off
chcp 65001 >nul
title DeepSeek Harness Updater
cd /d "%~dp0"
if /I "%~1"=="--rollback" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0update.ps1" -Rollback
    echo.
    pause
    goto :EOF
)
if /I "%~1"=="clean" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0update.ps1" -Clean
    echo.
    pause
    goto :EOF
)
if /I "%~1"=="-Clean" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0update.ps1" -Clean
    echo.
    pause
    goto :EOF
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0update.ps1" %*
echo.
pause
