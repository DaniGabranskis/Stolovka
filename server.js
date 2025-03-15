const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = 3000;

// Подключаем базу данных
const db = new sqlite3.Database('./canteen.db', (err) => {
    if (err) console.error(err.message);
    console.log('Connected to the SQLite database.');
});

// Убеждаемся, что в таблице есть колонка type
db.run(`
    CREATE TABLE IF NOT EXISTS menu (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price TEXT NOT NULL,
        type INTEGER NOT NULL,
        available INTEGER DEFAULT 1
    )
`);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Раздача HTML и JS

// Получение меню с категорией type
app.get('/menu', async (req, res) => {
    try {
        const db = new sqlite3.Database('canteen.db');

        db.all("SELECT * FROM menu", [], (err, rows) => {
            if (err) {
                console.error("Ошибка при получении данных из базы:", err);
                return res.status(500).json({ error: "Ошибка сервера" });
            }

            console.log("Отправляем меню в response:", rows); // Логируем данные перед отправкой
            res.json(rows);
        });

        db.close();
    } catch (error) {
        console.error("Ошибка обработки запроса /menu:", error);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

// Обновление состояния блюда (убрать или добавить)
app.post('/update', (req, res) => {
    const id = Number(req.body.id);
    const available = Number(req.body.available);

    if (isNaN(id) || isNaN(available) || (available !== 0 && available !== 1)) {
        return res.status(400).json({ error: "Invalid data format" });
    }

    db.run("UPDATE menu SET available = ? WHERE id = ?", [available, id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "Updated successfully", changes: this.changes });
    });
});

// Обновление цены блюда
app.post('/update-price', (req, res) => {
    const { id, price } = req.body;
    db.run(`UPDATE menu SET price = ? WHERE id = ?`, [price, id], function (err) {
        if (err) res.status(500).json({ error: err.message });
        else res.json({ updated: this.changes });
    });
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://0.0.0.0:${PORT}`));
