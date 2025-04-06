// migrateRollback.js
const mongoose = require('mongoose');
require('dotenv').config();
const Task = require('./models/Task');

async function migrateRollback() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB for rollback migration.");

    const tasks = await Task.find({});
    for (const task of tasks) {
      // Re-save each document
      await Task.findByIdAndUpdate(task._id, task.toObject(), { new: true });
    }
    console.log(`Migrated ${tasks.length} tasks.`);
    process.exit(0);
  } catch (err) {
    console.error("Migration rollback error:", err);
    process.exit(1);
  }
}

migrateRollback();
