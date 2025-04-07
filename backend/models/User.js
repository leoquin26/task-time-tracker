const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  // Email es opcional para el registro; se puede actualizar luego en el perfil.
  // Se elimina el valor por defecto para que el campo no se incluya si no se provee.
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

// Crear un índice único solo para documentos donde email exista y no sea null
UserSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $exists: true, $ne: null } } }
);

// Hash password before saving
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

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
