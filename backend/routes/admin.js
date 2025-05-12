const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../db');

// Admin credentials
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD_HASH = '$2b$12$JZl9Acv6F9vu9HsbRYxrk.kAHqx87zeO3igEBRyMdcQqs4Lp5t.Ge';

// 🔐 Login Route
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

// 🚪 Logout Route
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

// 📦 Get All Orders (Admin only)
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
        let parsed = order.items;
        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
        if (typeof parsed === 'string') parsed = JSON.parse(parsed);
        if (Array.isArray(parsed)) parsedItems = parsed;
      } catch (e) {
        console.warn(`⚠️ Failed to parse items for order ID ${order.id}:`, e.message);
      }

      const formattedItems = parsedItems.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        weight: item.weight || 'N/A'
      }));

      return {
        ...order,
        items: formattedItems
      };
    });

    res.status(200).json(modifiedResults);
  });
});

// ✅ Get Single Order by ID (Admin only) — Fixed
router.get('/orders/:id', (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const orderId = req.params.id;

  db.query('SELECT * FROM orders WHERE id = ?', [orderId], (err, results) => {
    if (err) {
      console.error('❌ Error fetching order:', err.message);
      return res.status(500).json({ error: 'Failed to fetch order' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    let order = results[0];
    try {
      order.items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    } catch (e) {
      console.warn(`⚠️ Failed to parse items for order ID ${orderId}:`, e.message);
    }

    res.json(order);
  });
});

// ✅ Edit/Update an order (Admin only)
router.put('/orders/:id', (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const orderId = req.params.id;
  const { items, total_price, address, status } = req.body;

  let serializedItems;
  try {
    serializedItems = typeof items === 'string' ? items : JSON.stringify(items);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid items format' });
  }

  const updateQuery = `
    UPDATE orders 
    SET items = ?, total_price = ?, address = ?, status = ? 
    WHERE id = ?
  `;

  db.query(updateQuery, [serializedItems, total_price, address, status || 'Processing', orderId], (err, result) => {
    if (err) {
      console.error('❌ Error updating order:', err.message);
      return res.status(500).json({ error: 'Failed to update order' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ message: '✅ Order updated successfully' });
  });
});

// ✅ Delete an order by ID (Admin route)
router.delete('/orders/:id', (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const orderId = req.params.id;

  db.query('DELETE FROM orders WHERE id = ?', [orderId], (err, result) => {
    if (err) {
      console.error('❌ Error deleting order:', err.message);
      return res.status(500).json({ error: 'Failed to delete order' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ message: '✅ Order deleted successfully' });
  });
});

// 🧭 Dashboard Test Route
router.get('/dashboard', (req, res) => {
  if (req.session.isAdmin) {
    return res.json({ message: 'Welcome to the admin dashboard!' });
  }
  res.status(403).json({ error: 'Access denied' });
});

module.exports = router;
