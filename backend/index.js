// Backend/index.js
const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();

// Configurar CORS (ajusta el origen según corresponda)
app.use(cors({
  origin: 'https://task-time-tracker-g1kn.vercel.app',
  credentials: true
}));

app.use(bodyParser.json());

// Montar las rutas
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/users', require('./routes/auth')); // <-- Monta la ruta de auth aquí
app.use('/api/user', require('./routes/user'));

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Server error' });
});

// Exporta la app para Vercel
module.exports = app;
