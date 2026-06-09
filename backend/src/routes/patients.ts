import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate } from '../middleware/auth';
import { getIO } from '../singletons';
import { calculateWaitTime } from '../utils/waitTimes';
import { logAction } from '../services/audit';

const router = Router();

// GET all patients
router.get('/', authenticate, async (req, res) => {
  try {
    const { search } = req.query;
    const patients = await prisma.patient.findMany({
      where: search
        ? {
            OR: [
              { firstName: { contains: search as string } },
              { lastName:  { contains: search as string } },
              { queueRef:  { contains: search as string } },
              { contactPhone: { contains: search as string } },
            ],
          }
        : {},
      include: {
        queues: {
          where: { status: { not: 'COMPLETED' } },
          include: { department: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(patients);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST register new patient + optionally enqueue them
router.post('/', authenticate, async (req, res) => {
  try {
    const { firstName, lastName, dob, gender, contactPhone, departmentId, priority } = req.body;

    if (!firstName || !lastName || !dob || !gender || !priority) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Auto-generate unique queue reference
    const count = await prisma.patient.count();
    const queueRef = `Q-${String(count + 1).padStart(4, '0')}`;

    const patient = await prisma.patient.create({
      data: {
        firstName,
        lastName,
        dob: new Date(dob),
        gender,
        contactPhone: contactPhone || null,
        queueRef,
      },
    });

    // Calculate estimated wait based on existing queue length and department service rate
    let estimatedWait = 30; // default
    if (departmentId) {
      estimatedWait = await calculateWaitTime(departmentId);
    }

    const queueData: any = {
      patientId: patient.id,
      priority,
      status: 'WAITING',
      estimatedWait,
    };
    if (departmentId) {
      queueData.departmentId = departmentId;
    }

    const queue = await prisma.queue.create({
      data: queueData,
      include: {
        patient: true,
        department: true,
        room: true,
      },
    });

    const deptName = queue.department ? queue.department.name : 'Unassigned Department';

    await logAction(
      (req as any).user.userId,
      'REGISTER_PATIENT',
      `Registered patient ${firstName} ${lastName} (${queueRef}) for ${deptName}`
    );

    // Broadcast to all connected clients
    getIO().emit('QUEUE_UPDATED', queue);

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        title: 'New Patient Registered',
        message: `${firstName} ${lastName} (${queueRef}) added to ${deptName} — Priority: ${priority.replace('_', ' ')}`,
        type: priority === 'CODE_RED' ? 'EMERGENCY' : priority === 'HIGH' ? 'WARNING' : 'INFO',
        role: 'ALL',
      },
    });
    getIO().emit('NOTIFICATION', notification);

    res.status(201).json({ patient, queue });
  } catch (error: any) {
    console.error(error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Patient already exists with this reference' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
