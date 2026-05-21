import mongoose from 'mongoose';

const TaskSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  startTime: {
    type: String,
    required: true, // "HH:MM" e.g., "08:00"
  },
  endTime: {
    type: String,
    required: true, // "HH:MM" e.g., "09:30"
  },
  category: {
    type: String,
    required: true,
    enum: ['Work', 'Study', 'Health', 'Personal', 'Routine'],
    default: 'Work',
  },
  status: {
    type: String,
    enum: ['Not Started', 'In Progress', 'Completed', 'Missed'],
    default: 'Not Started',
  },
  date: {
    type: String,
    required: true, // "YYYY-MM-DD"
  },
  completedAt: {
    type: Date,
  },
  missedAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Task', TaskSchema);
