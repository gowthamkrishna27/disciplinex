import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, checkFallback } from './config/db.js';

// Load Environment variables
dotenv.config();

// Initialize express app
const app = express();

// Security Middlewares Imports
import { sanitizeRequest, ipRateLimiter } from './middleware/security.js';

// Middlewares
app.use(cors({
  origin: true, // Dynamic origin matching for cross-origin credentials
  credentials: true // Crucial for receiving httpOnly cookies
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeRequest);
app.use(ipRateLimiter);

// Connect to Database (real MongoDB or file-based fallback)
connectDB();

// Modular Routing Imports
import authRoutes from './routes/auth.routes.js';
import scheduleRoutes from './routes/schedule.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import aiRoutes from './routes/ai.routes.js';

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);

// Health Check Route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    appName: 'DisciplineX API',
    databaseMode: checkFallback() ? 'JSON Local File Storage (Resilient Fallback Mode)' : 'MongoDB Server Connected',
    timestamp: new Date().toISOString()
  });
});

// Root route welcome message
app.get('/', (req, res) => {
  res.send('DisciplineX API Server is active and operational.');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Server Error Handler] Caught uncaught error:', err.stack);
  res.status(500).json({
    message: 'An unexpected internal server error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Listen on Port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n--------------------------------------------------------------`);
  console.log(`[DisciplineX Server] Server is running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`[DisciplineX Server] Local API URL: http://localhost:${PORT}`);
  console.log(`[DisciplineX Server] Health check endpoint: http://localhost:${PORT}/api/health`);
  console.log(`--------------------------------------------------------------\n`);
});
