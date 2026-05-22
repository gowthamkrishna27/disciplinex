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

// Define permitted origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://disciplinex-tau.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server or local REST client requests (no origin header)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy: Origin not allowed.'));
    }
  },
  credentials: true
}));

// Lightweight HTTP Request Logger Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} (${duration}ms) - Origin: ${req.headers.origin || 'None'}`);
  });
  next();
});

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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n--------------------------------------------------------------`);
  console.log(`[DisciplineX Server] Server is running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`[DisciplineX Server] Local API URL: http://0.0.0.0:${PORT} (listening on all interfaces)`);
  console.log(`[DisciplineX Server] Health check endpoint: http://localhost:${PORT}/api/health`);
  console.log(`--------------------------------------------------------------\n`);
});
