#!/bin/bash

echo "=========================="
echo "   Установка проекта"
echo "=========================="

# Проверяем и устанавливаем Node.js
if ! command -v node &> /dev/null; then
    echo "Node.js не найден, устанавливаю..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# Проверяем и устанавливаем SQLite
if ! command -v sqlite3 &> /dev/null; then
    echo "SQLite не найден, устанавливаю..."
    sudo apt install -y sqlite3
fi

# Устанавливаем зависимости
echo "Устанавливаю npm зависимости..."
npm install

# Проверяем базу данных
if [ ! -f "database/canteen.db" ]; then
    echo "Восстанавливаю базу данных..."
    sqlite3 database/canteen.db < database/canteen.sql
fi

# Запускаем сервер
echo "Запускаю сервер..."
nohup node server.js > server.log 2>&1 &

echo "=========================="
echo "   Установка завершена!"
echo "   Открывай http://localhost:3000/tv.html"
echo "=========================="
