const express = require('express');
const router = express.Router();
const db = require('../db');

// ✅ Place a new order
router.post('/', (req, res) => {
  const {
    items,
    subtotal,
    shipping,
    total,
    customerInfo,
    deliveryType
  } = req.body;

  if (!items || !items.length || !customerInfo || !customerInfo.name || !customerInfo.phone || !customerInfo.address) {
    return res.status(400).json({ error: 'Required fields are missing' });
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
      delivery_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    customerInfo.name.trim(),
    customerInfo.phone.trim(),
    customerInfo.address,
    JSON.stringify(items),
    parseFloat(subtotal),
    parseFloat(shipping),
    parseFloat(total),
    deliveryType || 'guntur'
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
        console.log(`🧾 Raw items from DB for order ${order.id}:`, order.items);

        const firstParse = JSON.parse(order.items || '[]');

        if (Array.isArray(firstParse)) {
          parsedItems = firstParse;
          console.log(`✅ Parsed as array directly for order ${order.id}:`, parsedItems);
        } else if (typeof firstParse === 'string') {
          parsedItems = JSON.parse(firstParse);
          console.log(`✅ Parsed twice for order ${order.id}:`, parsedItems);
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
