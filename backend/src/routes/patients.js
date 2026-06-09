"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const singletons_1 = require("../singletons");
const waitTimes_1 = require("../utils/waitTimes");
const audit_1 = require("../services/audit");
const router = (0, express_1.Router)();
// GET all patients
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const { search } = req.query;
        const patients = await prisma_1.prisma.patient.findMany({
            where: search
                ? {
                    OR: [
                        { firstName: { contains: search } },
                        { lastName: { contains: search } },
                        { queueRef: { contains: search } },
                        { contactPhone: { contains: search } },
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});
// POST register new patient + optionally enqueue them
router.post('/', auth_1.authenticate, async (req, res) => {
    try {
        const { firstName, lastName, dob, gender, contactPhone, departmentId, priority } = req.body;
        if (!firstName || !lastName || !dob || !gender || !priority) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        // Auto-generate unique queue reference
        const count = await prisma_1.prisma.patient.count();
        const queueRef = `Q-${String(count + 1).padStart(4, '0')}`;
        const patient = await prisma_1.prisma.patient.create({
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
            estimatedWait = await (0, waitTimes_1.calculateWaitTime)(departmentId);
        }
        const queueData = {
            patientId: patient.id,
            priority,
            status: 'WAITING',
            estimatedWait,
        };
        if (departmentId) {
            queueData.departmentId = departmentId;
        }
        const queue = await prisma_1.prisma.queue.create({
            data: queueData,
            include: {
                patient: true,
                department: true,
                room: true,
            },
        });
        const deptName = queue.department ? queue.department.name : 'Unassigned Department';
        await (0, audit_1.logAction)(req.user.id, 'REGISTER_PATIENT', `Registered patient ${firstName} ${lastName} (${queueRef}) for ${deptName}`);
        // Broadcast to all connected clients
        (0, singletons_1.getIO)().emit('QUEUE_UPDATED', queue);
        // Create notification
        const notification = await prisma_1.prisma.notification.create({
            data: {
                title: 'New Patient Registered',
                message: `${firstName} ${lastName} (${queueRef}) added to ${deptName} — Priority: ${priority.replace('_', ' ')}`,
                type: priority === 'CODE_RED' ? 'EMERGENCY' : priority === 'HIGH' ? 'WARNING' : 'INFO',
                role: 'ALL',
            },
        });
        (0, singletons_1.getIO)().emit('NOTIFICATION', notification);
        res.status(201).json({ patient, queue });
    }
    catch (error) {
        console.error(error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Patient already exists with this reference' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=patients.js.map