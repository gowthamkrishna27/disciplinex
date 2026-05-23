import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', '..', 'data');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const getFilePath = (collection) => path.join(DATA_DIR, `${collection}.json`);

const readData = (collection) => {
  const file = getFilePath(collection);
  if (!fs.existsSync(file)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    console.error(`Error reading ${collection}.json:`, error);
    return [];
  }
};

const writeData = (collection, data) => {
  const file = getFilePath(collection);
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error writing ${collection}.json:`, error);
    return false;
  }
};

export const JsonDb = {
  // Users CRUD
  findUserByEmail: (email) => {
    const users = readData('users');
    return users.find(u => u.email.toLowerCase() === email.toLowerCase());
  },

  findUserByVerificationToken: (token) => {
    const users = readData('users');
    return users.find(u => u.emailVerificationToken === token);
  },

  findUserById: (id) => {
    const users = readData('users');
    return users.find(u => u._id === id);
  },

  createUser: (userData) => {
    const users = readData('users');
    const newUser = {
      _id: Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString(),
      dailyGoal: 4,
      failedLoginAttempts: 0,
      lockoutUntil: null,
      twoFactorEnabled: false,
      twoFactorMethod: null,
      twoFactorSecret: null,
      twoFactorTempSecret: null,
      emailOtp: null,
      emailOtpExpires: null,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      lastLoginAt: null,
      lastLoginIp: null,
      isVerified: false,
      emailVerificationToken: null,
      emailVerificationExpires: null,
      trustedDevices: [],
      activeSessions: [],
      webAuthnCredentials: [],
      ...userData
    };
    users.push(newUser);
    writeData('users', users);
    return newUser;
  },

  updateUser: (id, updateData) => {
    const users = readData('users');
    const index = users.findIndex(u => u._id === id);
    if (index === -1) return null;
    users[index] = { ...users[index], ...updateData };
    writeData('users', users);
    return users[index];
  },

  deleteUser: (id) => {
    const users = readData('users');
    const filtered = users.filter(u => u._id !== id);
    if (users.length === filtered.length) return false;
    writeData('users', filtered);
    return true;
  },

  // Schedules (Tasks) CRUD
  findTasksByUserAndDate: (userId, date) => {
    const tasks = readData('tasks');
    return tasks.filter(t => t.user === userId && t.date === date);
  },

  findTasksByUser: (userId) => {
    const tasks = readData('tasks');
    return tasks.filter(t => t.user === userId);
  },

  findTaskById: (id) => {
    const tasks = readData('tasks');
    return tasks.find(t => t._id === id);
  },

  createTask: (taskData) => {
    const tasks = readData('tasks');
    const newTask = {
      _id: Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString(),
      status: 'Not Started',
      ...taskData
    };
    tasks.push(newTask);
    writeData('tasks', tasks);
    return newTask;
  },

  updateTask: (id, updateData) => {
    const tasks = readData('tasks');
    const index = tasks.findIndex(t => t._id === id);
    if (index === -1) return null;
    
    const original = tasks[index];
    const updated = { ...original, ...updateData };
    
    // Add completion / missed timestamps when status changes
    if (updateData.status && updateData.status !== original.status) {
      if (updateData.status === 'Completed') {
        updated.completedAt = new Date().toISOString();
        updated.missedAt = null;
      } else if (updateData.status === 'Missed') {
        updated.missedAt = new Date().toISOString();
        updated.completedAt = null;
      } else {
        updated.completedAt = null;
        updated.missedAt = null;
      }
    }
    
    tasks[index] = updated;
    writeData('tasks', tasks);
    return updated;
  },

  deleteTask: (id) => {
    const tasks = readData('tasks');
    const filtered = tasks.filter(t => t._id !== id);
    if (tasks.length === filtered.length) return false;
    writeData('tasks', filtered);
    return true;
  },

  clearUserData: (userId) => {
    const tasks = readData('tasks');
    const filtered = tasks.filter(t => t.user !== userId);
    writeData('tasks', filtered);
    return true;
  }
};
