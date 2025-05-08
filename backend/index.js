require('dotenv').config();
const mysql = require('mysql2');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

// ✅ MySQL Connection (Railway)
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : null
});

db.connect(err => {
  if (err) {
    console.error('❌ MySQL connection failed:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to MySQL on Railway');
});

const adminRouter = require('./routes/admin');
const ordersRouter = require('./routes/orders');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ✅ Session store
const sessionStore = new MySQLStore({
  clearExpired: true,
  checkExpirationInterval: 900000,
  expiration: 86400000,
  createDatabaseTable: true,
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data'
    }
  }
}, db);

// ✅ CORS setup (important!)
const allowedOrigins = [
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'https://www.brahminfoods.in',
  'https://brahminfoods-website.onrender.com'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // ✅ Allow preflight requests for all routes

// ✅ Middleware
app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(NODE_ENV === 'development' ? 'dev' : 'combined'));

app.use(session({
  name: 'sid',
  secret: process.env.SESSION_SECRET || 'keyboard_cat_replace_with_strong_secret',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60
  }
}));

// ✅ Routes
app.use('/api/admin', adminRouter);
app.use('/api/orders', ordersRouter);

// ✅ Serve static frontend
app.use(express.static(path.join(__dirname, './frontend')));

// ✅ Health check
app.get('/health', (req, res) => {
  db.query('SELECT 1 AS test', (err) => {
    if (err) return res.status(500).json({ status: '🔴 DB connection failed' });
    res.json({
      status: '🟢 OK',
      timestamp: new Date().toISOString(),
      environment: NODE_ENV
    });
  });
});

// ✅ Homepage route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, './frontend/menu.html'));
});

// ✅ 404 handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, './frontend/404.html'));
});

// ✅ Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ✅ Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running in ${NODE_ENV} mode on port ${PORT}`);
  console.log(`🔗 MySQL: ${process.env.DB_HOST}`);
});
