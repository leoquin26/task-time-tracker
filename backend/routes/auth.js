// routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Registro: se reciben username, password y timezone
router.post('/register', async (req, res) => {
  const { username, password, timezone } = req.body;
  try {
    // Verifica si ya existe un usuario con el mismo username
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }
    user = new User({ username, password, timezone: timezone || "UTC" });
    await user.save();

    const payload = { id: user._id, username: user.username };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login: se reciben username, password y timezone (se actualizará el timezone del usuario)
router.post('/login', async (req, res) => {
  const { username, password, timezone } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }
    // Actualiza el timezone si se envió y es distinto
    if (timezone && user.timezone !== timezone) {
      user.timezone = timezone;
      await user.save();
    }
    const payload = { id: user._id, username: user.username };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
