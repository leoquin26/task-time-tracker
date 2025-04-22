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
const migrateRoutes = require('./routes/migrate');
const csvUploadRoute = require('./routes/csvUpload');
const goalsRouter = require('./routes/goals');

const app = express();

app.use(cors({
  origin: ['https://task-time-tracker-g1kn.vercel.app', 'http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
}));
app.options('*', cors());

app.use(bodyParser.json());

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use('/api/users', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/user', userRoutes);
app.use('/api/csv', csvUploadRoute);
app.use('/api/goals', goalsRouter);

// Mount the migration route as a GET endpoint (open and unprotected)
app.use('/api/migrate', migrateRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ message: "Backend is up and running" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Run server if this file is run directly (local development)
const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
