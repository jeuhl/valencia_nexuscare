import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

// Get queue status for a patient using their reference code
router.get('/:queueRef', async (req, res) => {
  try {
    const { queueRef } = req.params;
    const patient = await prisma.patient.findUnique({
      where: { queueRef },
      include: {
        queues: {
          include: { department: true },
          orderBy: { joinedAt: 'desc' },
          take: 1
        }
      }
    });

    if (!patient || patient.queues.length === 0) {
      return res.status(404).json({ error: 'Queue not found' });
    }

    const queue = patient.queues[0];

    // Calculate position in queue (rough Little's Law mock implementation)
    const activeQueues = await prisma.queue.count({
      where: {
        departmentId: queue.departmentId,
        status: 'WAITING',
        joinedAt: { lt: queue.joinedAt }
      }
    });

    res.json({
      patient: { firstName: patient.firstName, queueRef: patient.queueRef },
      queue: {
        status: queue.status,
        department: queue.department.name,
        estimatedWait: queue.estimatedWait,
        position: activeQueues + 1
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
