const mysql = require('mysql2');

// ⚠️ RDSエンドポイントを差し替えてください
const RDS_ENDPOINT = 'YOUR_RDS_ENDPOINT_HERE';

// First connection without database to create it
const rootConfig = {
  host: RDS_ENDPOINT,
  user: 'admin',
  password: 'password123',
  charset: 'utf8mb4'
};

// Second connection with database
const dbConfig = {
  host: RDS_ENDPOINT,
  user: 'admin',
  password: 'password123',
  database: 'employeedb',
  charset: 'utf8mb4'
};

async function initDatabase() {
  let rootConnection;
  let dbConnection;

  try {
    // Connect without database to create it
    rootConnection = mysql.createConnection(rootConfig);

    console.log('🔗 RDSに接続中...');

    // Create database if not exists
    await rootConnection.promise().execute('CREATE DATABASE IF NOT EXISTS employeedb');
    console.log('✅ データベース employeedb を作成/確認しました');

    // Close root connection
    await rootConnection.end();

    // Connect to the specific database
    dbConnection = mysql.createConnection(dbConfig);

    // Create table
    await dbConnection.promise().execute(`
      CREATE TABLE IF NOT EXISTS employees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        department VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ テーブル employees を作成/確認しました');

    // Insert sample data
    const sampleData = [
      ['山田太郎', 'yamada@example.com', '開発部'],
      ['佐藤花子', 'sato@example.com', '営業部'],
      ['田中次郎', 'tanaka@example.com', '総務部']
    ];

    for (const [name, email, department] of sampleData) {
      try {
        await dbConnection.promise().execute(
          'INSERT IGNORE INTO employees (name, email, department) VALUES (?, ?, ?)',
          [name, email, department]
        );
      } catch (error) {
        // Ignore duplicate entries
      }
    }
    console.log('✅ サンプルデータを挿入しました');

    console.log('🎉 データベース初期化完了');
    process.exit(0);
  } catch (error) {
    console.error('❌ 初期化エラー:', error);
    process.exit(1);
  } finally {
    if (rootConnection) {
      try { await rootConnection.end(); } catch (e) {}
    }
    if (dbConnection) {
      try { await dbConnection.end(); } catch (e) {}
    }
  }
}

initDatabase();

