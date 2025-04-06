// models/Task.js
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
  // Tiempo total en horas (suma de taskingHours y exceedHours)
  horas: {
    type: Number,
    required: true,
  },
  // Tarifa calculada
  monto: {
    type: Number,
    required: true,
  },
  // Descripción completa de la tarea
  descripcion: {
    type: String,
  },
  // Tiempo normal en horas (decimal)
  taskingHours: {
    type: Number,
    default: 0,
  },
  // Tiempo excedido en horas (decimal)
  exceedHours: {
    type: Number,
    default: 0,
  }
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);
