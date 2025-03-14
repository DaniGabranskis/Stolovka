@echo off
cd /d %~dp0
start cmd /k "node server.js"
timeout /t 3 >nul
start "" "http://localhost:3000/tv.html"
