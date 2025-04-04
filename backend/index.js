// Backend/index.js
const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cors = require('cors');

// Cargar variables de entorno
dotenv.config();

const app = express();

// Configurar CORS para permitir solicitudes desde tu frontend
app.use(cors({
  origin: 'https://task-time-tracker-g1kn.vercel.app', // Permite este origen
  credentials: true, // Si necesitas enviar cookies o credenciales
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware para parsear JSON
app.use(bodyParser.json());

// Monta tus rutas
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/users', require('./routes/auth')); // Asegúrate de que la ruta concuerde
app.use('/api/user', require('./routes/user'));

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Server error' });
});

// Para despliegue en Vercel, exportamos la app como módulo
module.exports = app;
