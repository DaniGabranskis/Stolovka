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

// Создаём таблицу, если её нет
db.run(`
    CREATE TABLE IF NOT EXISTS menu (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        available INTEGER DEFAULT 1
    )
`);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Раздача HTML и JS

// Получение меню
app.get('/menu', (req, res) => {
    db.all("SELECT id, name, available, price FROM menu", [], (err, rows) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json(rows);
    });
});

// Обновление состояния блюда (убрать или добавить)
app.post('/update', (req, res) => {
    const { id, available } = req.body;
    db.run(`UPDATE menu SET available = ? WHERE id = ?`, [available, id], function (err) {
        if (err) res.status(500).json({ error: err.message });
        else res.json({ updated: this.changes });
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
