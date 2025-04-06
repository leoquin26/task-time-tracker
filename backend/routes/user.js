// Backend/routes/user.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// Obtener el perfil del usuario (sin contraseña)
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Actualizar el perfil del usuario (username, email y hourlyRate)
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { hourlyRate, username, email } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    if (hourlyRate !== undefined) user.hourlyRate = hourlyRate;
    if (username) user.username = username;
    if (email) user.email = email;
    
    await user.save();
    res.json({ message: 'Profile updated successfully', user });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
