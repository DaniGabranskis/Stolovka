@echo off
echo ==========================
echo  Установка проекта 
echo ==========================

:: Проверяем, установлен ли Node.js
where node >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    echo Node.js не найден, скачиваю и устанавливаю...
    powershell -Command "& {Invoke-WebRequest -Uri 'https://nodejs.org/dist/v18.16.0/node-v18.16.0-x64.msi' -OutFile 'nodejs.msi'}"
    msiexec /i nodejs.msi /quiet /norestart
    echo Установка Node.js завершена.
)

:: Проверяем, установлен ли SQLite
where sqlite3 >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    echo SQLite не найден, скачиваю и устанавливаю...
    powershell -Command "& {Invoke-WebRequest -Uri 'https://www.sqlite.org/2023/sqlite-tools-win32-x86-3420000.zip' -OutFile 'sqlite.zip'}"
    powershell -Command "Expand-Archive -Path sqlite.zip -DestinationPath C:\sqlite -Force"
    setx PATH "%PATH%;C:\sqlite"
    echo Установка SQLite завершена.
)

:: Устанавливаем зависимости
echo Устанавливаю npm зависимости...
npm install

:: Проверяем базу данных
IF NOT EXIST "database/canteen.db" (
    echo Восстанавливаю базу данных...
    sqlite3 database/canteen.db < database/canteen.sql
)

:: Запускаем сервер
echo Запускаю сервер...
start cmd /k "node server.js"

echo ==========================
echo  Установка завершена!
echo  Открывай http://localhost:3000/tv.html
echo ==========================
pause
