const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  fecha: {
    type: Date,
    required: true,
  },
  horas: {
    type: Number,
    required: true,
  },
  monto: {
    type: Number,
    required: true,
  },
  descripcion: {
    type: String,
  },
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);
