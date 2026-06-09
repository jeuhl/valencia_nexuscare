import { Router } from 'express';
import { prisma } from '../prisma';
import { getIO } from '../singletons';
import { authenticate } from '../middleware/auth';
import { logAction } from '../services/audit';

const router = Router();

// GET all lab requests
router.get('/', authenticate, async (req, res) => {
  try {
    const labs = await prisma.labRequest.findMany({
      include: { queue: { include: { patient: true, department: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(labs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST create lab request (Doctor sends patient to lab)
router.post('/', authenticate, async (req, res) => {
  try {
    const { queueId, testType, notes, requestedBy, roomId } = req.body;
    const lab = await prisma.labRequest.create({
      data: { queueId, testType, status: 'PENDING', notes, requestedBy },
      include: { queue: { include: { patient: true, department: true } } },
    });

    // Update queue status and assign room
    const updatedQueue = await prisma.queue.update({
      where: { id: queueId },
      data: {
        status: 'SENT_TO_LAB',
        ...(roomId ? { roomId } : {})
      },
      include: { patient: true, department: true, room: true },
    });

    // If a room was assigned, mark it as OCCUPIED
    if (roomId) {
      await prisma.room.update({
        where: { id: roomId },
        data: { status: 'OCCUPIED' }
      });
      const room = await prisma.room.findUnique({ where: { id: roomId }, include: { department: true } });
      getIO().emit('ROOM_UPDATED', room);
    }

    getIO().emit('QUEUE_UPDATED', updatedQueue);
    getIO().emit('LAB_REQUEST_CREATED', lab);

    // Broadcast notification to lab staff
    const notification = await prisma.notification.create({
      data: {
        title: 'New Lab Request',
        message: `${testType} requested for ${lab.queue.patient.firstName} ${lab.queue.patient.lastName}`,
        type: 'INFO',
        role: 'LAB_STAFF',
      },
    });
    getIO().emit('NOTIFICATION', notification);

    res.status(201).json(lab);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT update lab request status / upload results
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, results, roomId } = req.body;

    const lab = await prisma.labRequest.update({
      where: { id },
      data: { status, ...(results ? { results } : {}) },
      include: { queue: { include: { patient: true } } },
    });

    // If roomId is provided, update the queue and mark the room as OCCUPIED
    if (roomId) {
      const updatedQueue = await prisma.queue.update({
        where: { id: lab.queueId },
        data: { roomId, status: 'SENT_TO_LAB' },
        include: { patient: true, department: true, room: true },
      });

      await prisma.room.update({
        where: { id: roomId },
        data: { status: 'OCCUPIED' },
      });

      const room = await prisma.room.findUnique({ where: { id: roomId }, include: { department: true } });
      getIO().emit('ROOM_UPDATED', room);
      getIO().emit('QUEUE_UPDATED', updatedQueue);
    }

    getIO().emit('LAB_UPDATED', lab);

    // If lab is completed, notify the doctor and potentially update queue status back
    if (status === 'COMPLETED') {
      const notification = await prisma.notification.create({
        data: {
          title: 'Lab Results Ready',
          message: `${lab.testType} results uploaded for ${lab.queue.patient.firstName} ${lab.queue.patient.lastName}`,
          type: 'SUCCESS',
          role: 'DOCTOR',
        },
      });
      getIO().emit('NOTIFICATION', notification);

      await logAction(
        (req as any).user.userId,
        'UPLOAD_LAB_RESULTS',
        `Uploaded results for ${lab.testType} - Patient ${lab.queue.patient.firstName}`
      );
    }

    res.json(lab);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
