import { checkFallback } from '../config/db.js';
import Task from '../models/Task.js';
import { JsonDb } from '../models/fallback/jsonDb.js';

export const getTasks = async (req, res) => {
  const { date } = req.query; // Expects "YYYY-MM-DD"
  
  if (!date) {
    return res.status(400).json({ message: 'Date parameter is required (YYYY-MM-DD)' });
  }

  try {
    const isFallback = checkFallback();
    let tasks;

    if (isFallback) {
      tasks = JsonDb.findTasksByUserAndDate(req.user.id, date);
    } else {
      tasks = await Task.find({ user: req.user.id, date }).sort({ startTime: 1 });
    }

    res.json(tasks);
  } catch (error) {
    console.error('[Schedule Controller] Fetch Tasks Error:', error);
    res.status(500).json({ message: 'Server error retrieving tasks', error: error.message });
  }
};

export const createTask = async (req, res) => {
  const { title, startTime, endTime, category, date } = req.body;

  if (!title || !startTime || !endTime || !category || !date) {
    return res.status(400).json({ message: 'Please provide all required task details' });
  }

  try {
    const isFallback = checkFallback();
    let newTask;

    const taskFields = {
      user: req.user.id,
      title,
      startTime,
      endTime,
      category,
      date,
      status: 'Not Started'
    };

    if (isFallback) {
      newTask = JsonDb.createTask(taskFields);
    } else {
      newTask = await Task.create(taskFields);
    }

    res.status(201).json(newTask);
  } catch (error) {
    console.error('[Schedule Controller] Create Task Error:', error);
    res.status(500).json({ message: 'Server error creating task', error: error.message });
  }
};

export const updateTask = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const isFallback = checkFallback();
    let updatedTask;

    if (isFallback) {
      // Find task first to verify ownership
      const task = JsonDb.findTaskById(id);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      if (task.user !== req.user.id) {
        return res.status(401).json({ message: 'Not authorized to modify this task' });
      }

      updatedTask = JsonDb.updateTask(id, updates);
    } else {
      // Verify ownership
      const task = await Task.findById(id);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      if (task.user.toString() !== req.user.id) {
        return res.status(401).json({ message: 'Not authorized to modify this task' });
      }

      // Add timestamps for status updates
      if (updates.status && updates.status !== task.status) {
        if (updates.status === 'Completed') {
          updates.completedAt = new Date();
          updates.missedAt = null;
        } else if (updates.status === 'Missed') {
          updates.missedAt = new Date();
          updates.completedAt = null;
        } else {
          updates.completedAt = null;
          updates.missedAt = null;
        }
      }

      updatedTask = await Task.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      );
    }

    res.json(updatedTask);
  } catch (error) {
    console.error('[Schedule Controller] Update Task Error:', error);
    res.status(500).json({ message: 'Server error updating task', error: error.message });
  }
};

export const deleteTask = async (req, res) => {
  const { id } = req.params;

  try {
    const isFallback = checkFallback();
    let success = false;

    if (isFallback) {
      const task = JsonDb.findTaskById(id);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      if (task.user !== req.user.id) {
        return res.status(401).json({ message: 'Not authorized to delete this task' });
      }
      success = JsonDb.deleteTask(id);
    } else {
      const task = await Task.findById(id);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      if (task.user.toString() !== req.user.id) {
        return res.status(401).json({ message: 'Not authorized to delete this task' });
      }
      await Task.findByIdAndDelete(id);
      success = true;
    }

    if (success) {
      res.json({ message: 'Task deleted successfully', id });
    } else {
      res.status(400).json({ message: 'Failed to delete task' });
    }
  } catch (error) {
    console.error('[Schedule Controller] Delete Task Error:', error);
    res.status(500).json({ message: 'Server error deleting task', error: error.message });
  }
};

export const copyPreviousDaySchedule = async (req, res) => {
  const { date } = req.query; // The target date to copy tasks INTO

  if (!date) {
    return res.status(400).json({ message: 'Target date is required (YYYY-MM-DD)' });
  }

  try {
    const isFallback = checkFallback();
    let allTasks = [];

    if (isFallback) {
      allTasks = JsonDb.findTasksByUser(req.user.id);
    } else {
      allTasks = await Task.find({ user: req.user.id });
    }

    // Filter tasks that belong to dates chronologically prior to target date
    const priorTasks = allTasks.filter(t => t.date < date);
    if (priorTasks.length === 0) {
      return res.status(404).json({ message: 'No prior schedules found to copy from' });
    }

    // Find the closest previous date
    const distinctDates = [...new Set(priorTasks.map(t => t.date))].sort((a, b) => b.localeCompare(a));
    const closestPreviousDate = distinctDates[0];

    // Get the tasks of that closest previous date
    const sourceTasks = priorTasks.filter(t => t.date === closestPreviousDate);

    // Copy tasks into the new date as 'Not Started'
    const copiedTasks = [];
    for (const t of sourceTasks) {
      const taskFields = {
        user: req.user.id,
        title: t.title,
        startTime: t.startTime,
        endTime: t.endTime,
        category: t.category,
        date,
        status: 'Not Started'
      };

      let newTask;
      if (isFallback) {
        newTask = JsonDb.createTask(taskFields);
      } else {
        newTask = await Task.create(taskFields);
      }
      copiedTasks.push(newTask);
    }

    res.status(201).json({
      message: `Successfully cloned ${copiedTasks.length} tasks from ${closestPreviousDate} to ${date}`,
      tasks: copiedTasks
    });
  } catch (error) {
    console.error('[Schedule Controller] Copy Schedule Error:', error);
    res.status(500).json({ message: 'Server error copying schedule', error: error.message });
  }
};

export const clearAllData = async (req, res) => {
  try {
    const isFallback = checkFallback();
    if (isFallback) {
      JsonDb.clearUserData(req.user.id);
    } else {
      await Task.deleteMany({ user: req.user.id });
    }
    res.json({ message: 'All task and routine data cleared successfully.' });
  } catch (error) {
    console.error('[Schedule Controller] Clear Data Error:', error);
    res.status(500).json({ message: 'Server error clearing data', error: error.message });
  }
};
