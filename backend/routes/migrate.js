// Backend/routes/migrate.js
const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const User = require('../models/User');

// GET /api/migrate
// This endpoint re-saves all existing documents so they become encrypted.
// WARNING: Use this endpoint only in a controlled environment and remove it after migration.
router.get('/', async (req, res) => {
  try {
    // Migrate Tasks
    const tasks = await Task.find({});
    let tasksUpdated = 0;
    for (const task of tasks) {
      await task.save();
      tasksUpdated++;
    }

    // Migrate Users
    const users = await User.find({});
    let usersUpdated = 0;
    for (const user of users) {
      await user.save();
      usersUpdated++;
    }

    res.json({
      message: "Migration complete for tasks and users",
      tasksUpdated,
      usersUpdated,
    });
  } catch (err) {
    console.error("Migration error:", err.message);
    res.status(500).json({ message: "Migration error", error: err.message });
  }
});

module.exports = router;
