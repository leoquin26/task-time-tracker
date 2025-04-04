// Backend/index.js
const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cors = require('cors');

// Cargar variables de entorno
dotenv.config();

const app = express();

const allowedOrigins = ['https://task-time-tracker-g1kn.vercel.app'];
app.use(cors({
  origin: function(origin, callback) {
    // Permitir solicitudes sin origen (por ejemplo, llamadas desde herramientas de prueba)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
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
