const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

// Hardcoded admin credentials
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD_HASH = '$2b$12$okbk48K5nUhcJ7YNaWvcIupUfdcNOhww8ILzPtLsBgMZkRSZ14dCy';

// Admin login route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Login attempt:', username);

    if (username !== ADMIN_USERNAME) {
      console.log('Invalid username');
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const match = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    console.log('Password match:', match);

    if (!match) {
      console.log('Invalid password');
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    req.session.isAdmin = true;
    console.log('Admin session set, session ID:', req.sessionID);

    res.json({ message: 'Login successful', isAdmin: true });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin logout route
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid'); // Clear session cookie
    res.json({ message: 'Logged out successfully' });
  });
});

// Example protected route (optional)
router.get('/dashboard', (req, res) => {
  if (req.session.isAdmin) {
    return res.json({ message: 'Welcome to the admin dashboard!' });
  }
  res.status(403).json({ error: 'Access denied' });
});

module.exports = router;
