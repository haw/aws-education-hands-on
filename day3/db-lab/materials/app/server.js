const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const path = require('path');
const { config, onConfigReady } = require('./config');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

let db;

onConfigReady(() => {
  // Database configuration
  const dbConfig = {
    host: config.APP_DB_HOST,
    user: config.APP_DB_USER,
    password: config.APP_DB_PASSWORD,
    database: config.APP_DB_NAME,
    charset: 'utf8mb4'
  };

  // Database connection
  db = mysql.createConnection(dbConfig);

  db.connect((err) => {
    if (err) {
      console.error('データベース接続エラー:', err);
      return;
    }
    console.log('データベースに接続しました');
  });

  // Start server after config is ready
  app.listen(port, () => {
    console.log(`サーバーがポート${port}で起動しました`);
  });
});

// Routes
app.get('/', async (req, res) => {
  let message = '';
  let messageType = '';
  let editData = null;

  if (req.query.edit) {
    try {
      const [rows] = await db.promise().execute('SELECT * FROM employees WHERE id = ?', [req.query.edit]);
      if (rows.length > 0) {
        editData = rows[0];
      }
    } catch (error) {
      message = 'データ取得エラー: ' + error.message;
      messageType = 'error';
    }
  }

  let totalEmployees = 0;
  try {
    const [countRows] = await db.promise().execute('SELECT COUNT(*) as total FROM employees');
    totalEmployees = countRows[0].total;
  } catch (error) {
    console.error('Count error:', error);
  }

  let employees = [];
  try {
    const [rows] = await db.promise().execute('SELECT id, name, email, department, created_at FROM employees ORDER BY created_at DESC');
    employees = rows;
  } catch (error) {
    message = 'クエリエラー: ' + error.message;
    messageType = 'error';
  }

  res.render('index', {
    message,
    messageType,
    editData,
    totalEmployees,
    employees,
    currentYear: new Date().getFullYear()
  });
});

app.post('/', async (req, res) => {
  const { action, id, name, email, department } = req.body;
  let message = '';
  let messageType = '';

  try {
    if (action === 'add') {
      if (name && email) {
        await db.promise().execute(
          'INSERT INTO employees (name, email, department) VALUES (?, ?, ?)',
          [name.trim(), email.trim(), department.trim()]
        );
        message = '✅ 社員情報を正常に追加しました！';
        messageType = 'success';
      } else {
        message = '❌ 氏名とメールは必須です。';
        messageType = 'error';
      }
    } else if (action === 'update') {
      if (id && name && email) {
        await db.promise().execute(
          'UPDATE employees SET name = ?, email = ?, department = ? WHERE id = ?',
          [name.trim(), email.trim(), department.trim(), parseInt(id)]
        );
        message = '✅ 社員情報を正常に更新しました！';
        messageType = 'success';
      }
    } else if (action === 'delete') {
      if (id) {
        await db.promise().execute('DELETE FROM employees WHERE id = ?', [parseInt(id)]);
        message = '✅ 社員情報を正常に削除しました！';
        messageType = 'success';
      }
    }
  } catch (error) {
    message = '❌ エラー: ' + error.message;
    messageType = 'error';
  }

  res.redirect('/?message=' + encodeURIComponent(message) + '&type=' + messageType);
});

