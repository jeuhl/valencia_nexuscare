"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const singletons_1 = require("../singletons");
const auth_1 = require("../middleware/auth");
const audit_1 = require("../services/audit");
const router = (0, express_1.Router)();
// GET all lab requests
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const labs = await prisma_1.prisma.labRequest.findMany({
            include: { queue: { include: { patient: true, department: true } } },
            orderBy: { createdAt: 'desc' },
        });
        res.json(labs);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});
// POST create lab request (Doctor sends patient to lab)
router.post('/', auth_1.authenticate, async (req, res) => {
    try {
        const { queueId, testType, notes, requestedBy, roomId } = req.body;
        const lab = await prisma_1.prisma.labRequest.create({
            data: { queueId, testType, status: 'PENDING', notes, requestedBy },
            include: { queue: { include: { patient: true, department: true } } },
        });
        // Update queue status and assign room
        const updatedQueue = await prisma_1.prisma.queue.update({
            where: { id: queueId },
            data: {
                status: 'SENT_TO_LAB',
                ...(roomId ? { roomId } : {})
            },
            include: { patient: true, department: true, room: true },
        });
        // If a room was assigned, mark it as OCCUPIED
        if (roomId) {
            await prisma_1.prisma.room.update({
                where: { id: roomId },
                data: { status: 'OCCUPIED' }
            });
            const room = await prisma_1.prisma.room.findUnique({ where: { id: roomId }, include: { department: true } });
            (0, singletons_1.getIO)().emit('ROOM_UPDATED', room);
        }
        (0, singletons_1.getIO)().emit('QUEUE_UPDATED', updatedQueue);
        (0, singletons_1.getIO)().emit('LAB_REQUEST_CREATED', lab);
        // Broadcast notification to lab staff
        const notification = await prisma_1.prisma.notification.create({
            data: {
                title: 'New Lab Request',
                message: `${testType} requested for ${lab.queue.patient.firstName} ${lab.queue.patient.lastName}`,
                type: 'INFO',
                role: 'LAB_STAFF',
            },
        });
        (0, singletons_1.getIO)().emit('NOTIFICATION', notification);
        res.status(201).json(lab);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});
// PUT update lab request status / upload results
router.put('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, results, roomId } = req.body;
        const lab = await prisma_1.prisma.labRequest.update({
            where: { id },
            data: { status, ...(results ? { results } : {}) },
            include: { queue: { include: { patient: true } } },
        });
        // If roomId is provided, update the queue and mark the room as OCCUPIED
        if (roomId) {
            const updatedQueue = await prisma_1.prisma.queue.update({
                where: { id: lab.queueId },
                data: { roomId, status: 'SENT_TO_LAB' },
                include: { patient: true, department: true, room: true },
            });
            await prisma_1.prisma.room.update({
                where: { id: roomId },
                data: { status: 'OCCUPIED' },
            });
            const room = await prisma_1.prisma.room.findUnique({ where: { id: roomId }, include: { department: true } });
            (0, singletons_1.getIO)().emit('ROOM_UPDATED', room);
            (0, singletons_1.getIO)().emit('QUEUE_UPDATED', updatedQueue);
        }
        (0, singletons_1.getIO)().emit('LAB_UPDATED', lab);
        // If lab is completed, notify the doctor and potentially update queue status back
        if (status === 'COMPLETED') {
            const notification = await prisma_1.prisma.notification.create({
                data: {
                    title: 'Lab Results Ready',
                    message: `${lab.testType} results uploaded for ${lab.queue.patient.firstName} ${lab.queue.patient.lastName}`,
                    type: 'SUCCESS',
                    role: 'DOCTOR',
                },
            });
            (0, singletons_1.getIO)().emit('NOTIFICATION', notification);
            await (0, audit_1.logAction)(req.user.id, 'UPLOAD_LAB_RESULTS', `Uploaded results for ${lab.testType} - Patient ${lab.queue.patient.firstName}`);
        }
        res.json(lab);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=labs.js.map