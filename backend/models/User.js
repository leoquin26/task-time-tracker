const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  // El campo email es opcional, por lo que no se define un valor por defecto.
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
}, { timestamps: true });

// Se crea un índice único para "email" que solo se aplicará cuando el campo exista y sea distinto de null.
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
