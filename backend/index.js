require('dotenv').config();
const session = require('express-session');
const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const db = require('./db');

const adminRouter = require('./routes/admin');
const ordersRouter = require('./routes/orders');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ✅ Trust proxy for session cookies if behind proxy (important for some setups)
app.set('trust proxy', 1);

// ✅ CORS config BEFORE session
//app.use(cors({
  //origin: ['http://127.0.0.1:8080', 'http://localhost:8080'],
  //credentials: true
//}));

// ✅ Parse incoming data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Session middleware
app.use(session({
  name: 'sid', // session cookie name
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: NODE_ENV === 'production',

    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 // 1 hour
  }
}));

// ✅ Logger
app.use(morgan(NODE_ENV === 'development' ? 'dev' : 'combined'));

// ✅ Routes
app.use('/api/admin', adminRouter);
app.use('/api/orders', ordersRouter); // Allow public access for placing orders


// ✅ Serve frontend static files
app.use(express.static(path.join(__dirname, './frontend')));

// ✅ Health check route
app.get('/health', (req, res) => {
  res.json({
    status: '🟢 OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV
  });
});

// ✅ Test DB connection
app.get('/test-db', (req, res) => {
  db.query('SELECT 1 AS test', (err, results) => {
    if (err) {
      console.error('❌ DB test error:', err.message);
      return res.status(500).json({ error: 'DB test failed' });
    }
    res.json({ success: true, result: results[0].test });
  });
});

// ✅ Route to serve menu.html as homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, './frontend/menu.html'));
});


// ✅ 404 fallback
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Resource not found',
    path: req.originalUrl
  });
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
