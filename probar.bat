@echo off
rem Abre Escaneator en modo prueba (necesita Node.js y Rust instalados)
cd /d "%~dp0"
if not exist node_modules call npm install
call npx tauri dev
pause
