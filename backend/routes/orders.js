const express = require('express');
const router = express.Router();
const db = require('../db');

// 🧾 Place a new order
router.post('/', (req, res) => {
  const { 
    items,
    subtotal,
    shipping,
    total,
    customerInfo,
    deliveryType
  } = req.body;

  // Basic validation
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
    deliveryType || 'guntur' // Default value
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('❌ Error inserting order:', err.message);
      return res.status(500).json({ error: 'Failed to place order' });
    }

    res.status(201).json({
      success: true,
      message: '✅ Order placed successfully!',
      orderId: result.insertId // ✅ Send back the generated order ID
    });
  });
});

// 📋 Get all orders (Admin only)
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
      const modifiedItems = JSON.parse(order.items).map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        weight: item.weight
      }));

      return {
        ...order,
        items: modifiedItems
      };
    });

    res.status(200).json(modifiedResults);
  });
});

module.exports = router;
