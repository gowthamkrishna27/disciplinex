import express from 'express';
import { getAnalyticsSummary } from '../controllers/analytics.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/summary', protect, getAnalyticsSummary);

export default router;
