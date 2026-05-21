import express from 'express';
import { consultAICoach } from '../controllers/ai.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/consult', protect, consultAICoach);

export default router;
