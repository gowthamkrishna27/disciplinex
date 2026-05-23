import express from 'express';
import { getTasks, createTask, updateTask, deleteTask, copyPreviousDaySchedule, clearAllData } from '../controllers/schedule.controller.js';
import { protect, requireVerifiedUser } from '../middleware/auth.js';

const router = express.Router();

router.use(protect); // All schedule routes require token authentication

router.get('/', getTasks);
router.post('/', createTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);
router.post('/copy-previous', copyPreviousDaySchedule);
router.post('/clear', requireVerifiedUser, clearAllData);

export default router;
