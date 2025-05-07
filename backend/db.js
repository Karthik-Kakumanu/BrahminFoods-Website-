const mysql = require('mysql2');
require('dotenv').config();

// Create a MySQL connection pool
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306, // fallback to default port
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test the connection once on startup
db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ MySQL connection error:', err.message);
    return;
  }
  console.log('✅ Connected to MySQL database!');
  connection.release();
});

module.exports = db;
