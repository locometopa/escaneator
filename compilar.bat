@echo off
rem Genera el instalador en src-tauri\target\release\bundle\nsis (necesita Node.js y Rust instalados)
cd /d "%~dp0"
if not exist node_modules call npm install
call npx tauri build
if errorlevel 1 (echo.& echo HA FALLADO LA COMPILACION & pause & exit /b 1)
explorer "src-tauri\target\release\bundle\nsis"
pause
