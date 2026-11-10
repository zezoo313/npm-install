@echo off
chcp 65001 > nul
title لعبة التخمين الجماعية - Guessing Game
color 0B

echo ========================================================
echo       🎮 تشغيل تطبيق لعبة التخمين الجماعية 🎮
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/2] التحقق من الحزم وتثبيتها...
call npm install --no-audit --no-fund

echo.
echo [2/2] بدء تشغيل الخادم...
echo يمكنك فتح اللعبة في المتصفح أو على هاتفك!
echo.

node server.js

pause
