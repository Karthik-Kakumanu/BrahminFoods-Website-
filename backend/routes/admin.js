const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../db');

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD_HASH = '$2b$12$okbk48K5nUhcJ7YNaWvcIupUfdcNOhww8ILzPtLsBgMZkRSZ14dCy';

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (username !== ADMIN_USERNAME) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const match = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    req.session.isAdmin = true;
    console.log('✅ Admin login successful, session ID:', req.sessionID);
    res.json({ message: 'Login successful', isAdmin: true });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

router.get('/orders', (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const query = 'SELECT * FROM orders ORDER BY created_at DESC';

  db.query(query, (err, results) => {
    if (err) {
      console.error('❌ Error fetching orders:', err.message);
      return res.status(500).json({ error: 'Failed to retrieve orders' });
    }

    const modifiedResults = results.map(order => {
      let parsedItems = [];
      try {
        const firstParse = JSON.parse(order.items || '[]');
        parsedItems = typeof firstParse === 'string' ? JSON.parse(firstParse) : firstParse;
      } catch (e) {
        console.warn(`⚠️ Failed to parse items for order ID ${order.id}`, e);
      }

      const modifiedItems = parsedItems.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        weight: item.weight || 'N/A'
      }));

      const { items, ...rest } = order;
      return {
        ...rest,
        items: modifiedItems
      };
    });

    res.status(200).json(modifiedResults);
  });
});

router.get('/dashboard', (req, res) => {
  if (req.session.isAdmin) {
    return res.json({ message: 'Welcome to the admin dashboard!' });
  }
  res.status(403).json({ error: 'Access denied' });
});

module.exports = router;
