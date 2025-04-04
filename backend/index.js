// Backend/index.js
const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

const app = express();

// Middleware para parsear JSON
app.use(bodyParser.json());

// Importa tus rutas (ajusta las rutas según tu estructura)
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/user', require('./routes/user'));

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Server error' });
});

// Para despliegue en Vercel, exportamos la app como módulo
module.exports = app;
