// Backend/index.js
const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cors = require('cors'); // Importa el módulo cors

// Cargar variables de entorno
dotenv.config();

const app = express();

// Configurar CORS para permitir solicitudes desde el frontend
app.use(cors({
  origin: 'https://task-time-tracker-g1kn.vercel.app', // Permite solo este origen
  credentials: true // Si necesitas enviar cookies o credenciales
}));

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
