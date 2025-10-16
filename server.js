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

// 1) ensure allergens column exists
db.all(`PRAGMA table_info(menu);`, [], (err, cols) => {
  if (err) { console.error('PRAGMA error:', err.message); return; }
  const hasAllergens = cols.some(c => c.name === 'allergens');
  if (!hasAllergens) {
    db.run(`ALTER TABLE menu ADD COLUMN allergens TEXT;`, (e) => {
      if (e) console.error('Failed to add allergens column:', e.message);
      else console.log('Column "allergens" added to "menu" table');
    });
  }
});

// 2) ensure type column exists (migrate from category_id if present)
db.all(`PRAGMA table_info(menu);`, [], (err, cols) => {
  if (err) { console.error('PRAGMA error:', err.message); return; }
  const hasType = cols.some(c => c.name === 'type');
  const hasCategoryId = cols.some(c => c.name === 'category_id');

  if (!hasType && hasCategoryId) {
    db.serialize(() => {
      db.run(`ALTER TABLE menu ADD COLUMN type INTEGER;`, (e) => {
        if (e) return console.error('Failed to add type column:', e.message);
        db.run(`UPDATE menu SET type = category_id WHERE type IS NULL;`, (e2) => {
          if (e2) console.error('Failed to backfill type from category_id:', e2.message);
          else console.log('Column "type" added and backfilled from "category_id".');
        });
      });
    });
  } else if (!hasType && !hasCategoryId) {
    console.warn('Neither "type" nor "category_id" exist in "menu". Check schema.');
  }
});


// ensure allergens column exists
db.all(`PRAGMA table_info(menu);`, [], (err, cols) => {
  if (err) {
    console.error('PRAGMA error:', err.message);
    return;
  }
  const hasAllergens = cols.some(c => c.name === 'allergens');
  if (!hasAllergens) {
    db.run(`ALTER TABLE menu ADD COLUMN allergens TEXT;`, (e) => {
      if (e) console.error('Failed to add allergens column:', e.message);
      else console.log('Column "allergens" added to "menu" table');
    });
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Раздача HTML и JS

// Получение меню с категорией type
// Получение меню (type как число; allergens возвращаем, если есть)
app.get('/menu', (req, res) => {
  db.all(
    `SELECT id, name, price,
            CAST(COALESCE(type, category_id) AS INTEGER) AS type,
            available, allergens
     FROM menu`,
    [],
    (err, rows) => {
      if (err) {
        console.error('Ошибка при получении данных из базы:', err);
        return res.status(500).json({ error: 'Ошибка сервера' });
      }
      res.json(rows);
    }
  );
});

app.post('/menu/add', (req, res) => {
  const { name, price, type, available = 1, allergens = null } = req.body;
  if (!name || type == null || price == null) {
    return res.status(400).json({ error: 'name, price, type are required' });
  }
  db.run(
    `INSERT INTO menu (name, price, type, available${allergens != null ? ', allergens' : ''})
     VALUES (?, ?, ?, ?${allergens != null ? ', ?' : ''})`,
    allergens != null ? [name, String(price), Number(type), Number(available), String(allergens)] 
                      : [name, String(price), Number(type), Number(available)],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// Update name (and optionally price/type) in one call
app.post('/menu/update', (req, res) => {
  const { id, name, price, type, available, allergens } = req.body;
  if (!id) return res.status(400).json({ error: 'id is required' });

  const fields = [];
  const params = [];
  if (name != null) { fields.push('name = ?'); params.push(name); }
  if (price != null) { fields.push('price = ?'); params.push(String(price)); }
  if (type != null) { fields.push('type = ?'); params.push(Number(type)); }
  if (available != null) { fields.push('available = ?'); params.push(Number(available)); }
  if (allergens != null) { fields.push('allergens = ?'); params.push(String(allergens)); }

  if (!fields.length) return res.status(400).json({ error: 'no fields to update' });

  params.push(Number(id));
  db.run(`UPDATE menu SET ${fields.join(', ')} WHERE id = ?`, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ updated: this.changes });
  });
});

app.post('/menu/delete', (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'id is required' });
  db.run(`DELETE FROM menu WHERE id = ?`, [Number(id)], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
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
