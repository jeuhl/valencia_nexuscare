import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// GET all departments
router.get('/', authenticate, async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      include: { 
        rooms: true, 
        _count: { 
          select: { queues: { where: { status: { notIn: ['COMPLETED', 'DISCHARGED'] }, roomId: { not: null } } } } 
        } 
      },
      orderBy: { name: 'asc' },
    });
    res.json(departments);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST create new department (Admin only)
router.post('/', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { name, type, capacity } = req.body;
    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }
    const dept = await prisma.department.create({
      data: {
        name,
        type,
        capacity: capacity ? Number(capacity) : 10,
        isActive: true,
      },
      include: { 
        rooms: true, 
        _count: { 
          select: { queues: { where: { status: { notIn: ['COMPLETED', 'DISCHARGED'] }, roomId: { not: null } } } } 
        } 
      },
    });
    res.status(201).json(dept);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT update department (capacity, isActive) — Admin only
router.put('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { capacity, isActive, name, type } = req.body;
    const data: any = {};
    if (capacity !== undefined) data.capacity = Number(capacity);
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (name) data.name = name;
    if (type) data.type = type;

    const dept = await prisma.department.update({
      where: { id },
      data,
      include: { 
        rooms: true, 
        _count: { 
          select: { queues: { where: { status: { notIn: ['COMPLETED', 'DISCHARGED'] }, roomId: { not: null } } } } 
        } 
      },
    });
    res.json(dept);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE department (Admin only)
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.department.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
