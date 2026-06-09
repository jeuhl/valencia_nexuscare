import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate } from '../middleware/auth';
import { getIO } from '../singletons';
import { logAction } from '../services/audit';

const router = Router();

// Get all active queues
router.get('/', async (req, res) => {
  try {
    const queues = await prisma.queue.findMany({
      where: {
        status: {
          not: 'COMPLETED'
        }
      },
      include: {
        patient: true,
        department: true,
        room: true
      },
      orderBy: [
        { joinedAt: 'asc' }
      ]
    });
    res.json(queues);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new queue entry
router.post('/', async (req, res) => {
  try {
    const { patientId, priority, departmentId, estimatedWait } = req.body;
    const newQueue = await prisma.queue.create({
      data: {
        patientId,
        priority,
        departmentId,
        status: 'WAITING',
        estimatedWait: estimatedWait || 30
      },
      include: {
        patient: true,
        department: true,
      }
    });

    getIO().emit('QUEUE_UPDATED', newQueue);
    res.status(201).json(newQueue);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update queue status (Drag and Drop)
router.put('/:id/status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, roomId, departmentId } = req.body;

    const existingQueue = await prisma.queue.findUnique({ where: { id } });
    if (!existingQueue) return res.status(404).json({ error: 'Queue not found' });
    const oldRoomId = existingQueue.roomId;

    const updateData: any = { status };
    let shouldVacateOldRoom = false;
    let shouldClearRoomId = false;

    if (roomId) {
      updateData.roomId = roomId;
      const room = await prisma.room.findUnique({ where: { id: roomId } });
      if (room) updateData.departmentId = room.departmentId;

      await prisma.room.update({
        where: { id: roomId },
        data: { status: 'OCCUPIED' }
      });
      const updatedNewRoom = await prisma.room.findUnique({ where: { id: roomId }, include: { department: true } });
      getIO().emit('ROOM_UPDATED', updatedNewRoom);

      if (oldRoomId && oldRoomId !== roomId) {
        shouldVacateOldRoom = true;
      }
    } else if (departmentId) {
      updateData.departmentId = departmentId;
      if (oldRoomId) {
        shouldVacateOldRoom = true;
        shouldClearRoomId = true;
      }
    }

    if (status === 'COMPLETED' || status === 'DISCHARGED') {
      if (oldRoomId) {
        shouldVacateOldRoom = true;
      }
    } else if (status === 'WAITING' || status === 'VITALS_TAKEN') {
      // Moving back to pre-room stages vacates the room
      if (oldRoomId && !roomId) {
        shouldVacateOldRoom = true;
        shouldClearRoomId = true;
      }
    }

    if (shouldClearRoomId) {
      updateData.roomId = null;
    }

    const updatedQueue = await prisma.queue.update({
      where: { id },
      data: updateData,
      include: {
        patient: true,
        department: true,
        room: true,
      },
    });

    if (shouldVacateOldRoom && oldRoomId) {
      const oldRoom = await prisma.room.update({
        where: { id: oldRoomId },
        data: { status: 'CLEANING' },
        include: { department: true }
      });
      getIO().emit('ROOM_UPDATED', oldRoom);
    }

    const logDetails = departmentId
      ? `Patient ${updatedQueue.patient.firstName} ${updatedQueue.patient.lastName} transferred to ${updatedQueue.department.name} (${status})`
      : `Patient ${updatedQueue.patient.firstName} ${updatedQueue.patient.lastName} moved to ${status}`;

    await logAction((req as any).user.userId, 'UPDATE_QUEUE_STATUS', logDetails);

    getIO().emit('QUEUE_UPDATED', updatedQueue);
    res.json(updatedQueue);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
