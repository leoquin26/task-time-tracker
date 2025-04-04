const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const metricsRoutes = require('./routes/metrics');
const userRoutes = require('./routes/user');

const app = express();

// Configurar CORS (incluye preflight OPTIONS)
app.use(cors({
  origin: ['https://task-time-tracker-g1kn.vercel.app', 'http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
}));
app.options('*', cors());

// Middleware para parsear JSON
app.use(bodyParser.json());

// Conexión a MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Rutas
app.use('/api/users', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/user', userRoutes);

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Para despliegue en Vercel, no se llama a app.listen()
// Vercel invocará esta función como una función serverless.
module.exports = app;
