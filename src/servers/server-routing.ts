import { Router } from 'express';
import { findManyPrintQueue } from '../print-queue/print-queue.repository.js';

const router = Router();

router.get('/queue', async (req, res) => {
  const response = await findManyPrintQueue({});
  res.json(response);
});

export default router;
