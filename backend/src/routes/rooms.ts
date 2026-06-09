import { Router } from 'express';
import { prisma } from '../prisma';
import { getIO } from '../singletons';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET all rooms (optionally by department)
router.get('/', authenticate, async (req, res) => {
  try {
    const { departmentId } = req.query;
    const rooms = await prisma.room.findMany({
      where: departmentId ? { departmentId: departmentId as string } : {},
      include: { department: true, queues: { include: { patient: true }, where: { status: { not: 'COMPLETED' } } } },
      orderBy: { name: 'asc' },
    });
    res.json(rooms);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT update room status
router.put('/:id/status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const room = await prisma.room.update({
      where: { id },
      data: { status },
      include: { department: true },
    });
    getIO().emit('ROOM_UPDATED', room);
    res.json(room);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST create new room
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, departmentId, status } = req.body;
    if (!name || !departmentId) {
      return res.status(400).json({ error: 'Name and departmentId are required' });
    }
    const room = await prisma.room.create({
      data: { name, departmentId, status: status || 'OPEN' },
      include: { department: true },
    });
    getIO().emit('ROOM_UPDATED', room);
    res.status(201).json(room);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE room
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.room.delete({ where: { id } });
    getIO().emit('ROOM_DELETED', { id });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
