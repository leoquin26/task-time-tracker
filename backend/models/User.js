// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  // El campo email es opcional
  email: {
    type: String,
    required: false,
  },
  password: {
    type: String,
    required: true,
  },
  hourlyRate: {
    type: Number,
    default: 0,
  },
  // Nuevo campo para la zona horaria (ejemplo: "America/Lima")
  timezone: {
    type: String,
    default: "UTC"
  },
}, { timestamps: true });

// Índice único para email cuando existe
UserSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $exists: true, $ne: null } } }
);

// Hash de la contraseña antes de guardar
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Método para comparar contraseñas
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
