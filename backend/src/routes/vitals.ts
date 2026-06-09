import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate } from '../middleware/auth';
import { logAction } from '../services/audit';
import { getIO } from '../singletons';

const router = Router();

// POST record vitals
router.post('/', authenticate, async (req, res) => {
  try {
    const { queueId, bp, temp, heartRate, oxygen, weight, notes } = req.body;
    const user = (req as any).user;

    if (!queueId) return res.status(400).json({ error: 'Queue ID required' });

    const vitals = await prisma.vitals.upsert({
      where: { queueId },
      update: {
        bp, temp, heartRate, oxygen, weight, notes,
        recordedBy: user.name,
      },
      create: {
        queueId,
        bp, temp, heartRate, oxygen, weight, notes,
        recordedBy: user.name,
      },
      include: { queue: { include: { patient: true } } }
    });

    // Update queue status to VITALS_TAKEN if it was WAITING
    const queue = await prisma.queue.findUnique({ where: { id: queueId } });
    if (queue && queue.status === 'WAITING') {
      await prisma.queue.update({
        where: { id: queueId },
        data: { status: 'VITALS_TAKEN' }
      });
      const updatedQueue = await prisma.queue.findUnique({ 
        where: { id: queueId }, 
        include: { patient: true, department: true } 
      });
      getIO().emit('QUEUE_UPDATED', updatedQueue);
    }

    await logAction(
      user.userId,
      'RECORD_VITALS',
      `Recorded vitals for ${vitals.queue.patient.firstName} ${vitals.queue.patient.lastName}`
    );

    res.status(201).json(vitals);
  } catch (error: any) {
    console.error('[VITALS_ERROR]', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// GET vitals for a queue
router.get('/:queueId', authenticate, async (req, res) => {
  try {
    const { queueId } = req.params;
    const vitals = await prisma.vitals.findUnique({
      where: { queueId }
    });
    res.json(vitals);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
