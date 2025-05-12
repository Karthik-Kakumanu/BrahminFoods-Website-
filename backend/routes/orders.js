const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper: Safely parse float with fallback
const safeParseFloat = (value, fallback = 0) => {
  const num = parseFloat(value);
  return isNaN(num) ? fallback : num;
};

// ✅ Place a new order
router.post('/', (req, res) => {
  const {
    items,
    subtotal,
    shipping,
    total,
    customerInfo,
    deliveryType,
    paymentMethod
  } = req.body;

  if (!items || !items.length || !customerInfo || !customerInfo.name || !customerInfo.phone || !customerInfo.address) {
    return res.status(400).json({ error: 'Required fields are missing' });
  }

  // ✅ Properly handle stringified or object-based items
  let serializedItems;
  try {
    if (typeof items === 'string') {
      const parsed = JSON.parse(items); // validate stringified array
      serializedItems = JSON.stringify(parsed);
    } else {
      serializedItems = JSON.stringify(items);
    }
  } catch (e) {
    console.error('❌ Invalid items format:', e.message);
    return res.status(400).json({ error: 'Invalid items format' });
  }

  const sql = `
    INSERT INTO orders (
      customer_name,
      phone,
      address,
      items,
      subtotal,
      shipping,
      total_price,
      delivery_type,
      payment_method
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?,?)
  `;

  const values = [
    customerInfo.name.trim(),
    customerInfo.phone.trim(),
    customerInfo.address,
    serializedItems,
    parseFloat(subtotal),
    parseFloat(shipping),
    parseFloat(total),
    deliveryType || 'guntur',
    paymentMethod || 'COD'
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('❌ Error inserting order:', err.message);
      return res.status(500).json({ error: 'Failed to place order' });
    }

    res.status(201).json({
      success: true,
      message: '✅ Order placed successfully!',
      orderId: result.insertId
    });
  });
});

// ✅ Get all orders (Admin only)
router.get('/', (req, res) => {
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
        if (typeof parsed === 'string') {
          parsed = JSON.parse(parsed);
        }
        if (Array.isArray(parsed)) {
          parsedItems = parsed;
        }
      } catch (e) {
        console.warn(`⚠️ Failed to parse items for order ${order.id}:`, e.message);
      }

      return {
        ...order,
        items: parsedItems
      };
    });

    res.status(200).json(modifiedResults);
  });
});

// ✅ Delete an order
router.delete('/:id', (req, res) => {
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

    res.json({ message: 'Order deleted successfully' });
  });
});

module.exports = router;
