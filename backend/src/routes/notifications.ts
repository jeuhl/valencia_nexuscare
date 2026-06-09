import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET notifications for the calling user's role
router.get('/', authenticate, async (req: any, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { role: req.user.role },
          { role: 'ALL' },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT mark notification as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const n = await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true },
    });
    res.json(n);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT mark all as read
router.put('/all/read-all', authenticate, async (req: any, res) => {
  try {
    await prisma.notification.updateMany({
      where: {
        OR: [
          { role: req.user.role },
          { role: 'ALL' },
        ],
        read: false,
      },
      data: { read: true },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE clear all notifications
router.delete('/all/clear', authenticate, async (req: any, res) => {
  try {
    await prisma.notification.deleteMany({
      where: {
        OR: [
          { role: req.user.role },
          { role: 'ALL' },
        ]
      }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
