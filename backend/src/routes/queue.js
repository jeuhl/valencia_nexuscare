"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const singletons_1 = require("../singletons");
const audit_1 = require("../services/audit");
const router = (0, express_1.Router)();
// Get all active queues
router.get('/', async (req, res) => {
    try {
        const queues = await prisma_1.prisma.queue.findMany({
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});
// Create new queue entry
router.post('/', async (req, res) => {
    try {
        const { patientId, priority, departmentId, estimatedWait } = req.body;
        const newQueue = await prisma_1.prisma.queue.create({
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
        (0, singletons_1.getIO)().emit('QUEUE_UPDATED', newQueue);
        res.status(201).json(newQueue);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});
// Update queue status (Drag and Drop)
router.put('/:id/status', auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, roomId, departmentId } = req.body;
        // If a roomId is provided, mark that room as OCCUPIED
        if (roomId) {
            await prisma_1.prisma.room.update({
                where: { id: roomId },
                data: { status: 'OCCUPIED' }
            });
            const room = await prisma_1.prisma.room.findUnique({ where: { id: roomId }, include: { department: true } });
            (0, singletons_1.getIO)().emit('ROOM_UPDATED', room);
        }
        const updateData = { status };
        if (roomId) {
            updateData.roomId = roomId;
            const room = await prisma_1.prisma.room.findUnique({ where: { id: roomId } });
            if (room)
                updateData.departmentId = room.departmentId;
        }
        if (departmentId)
            updateData.departmentId = departmentId;
        const updatedQueue = await prisma_1.prisma.queue.update({
            where: { id },
            data: updateData,
            include: {
                patient: true,
                department: true,
                room: true,
            },
        });
        // If patient is completed or discharged, and they had a room, mark it for CLEANING
        if ((status === 'COMPLETED' || status === 'DISCHARGED') && updatedQueue.roomId) {
            const room = await prisma_1.prisma.room.update({
                where: { id: updatedQueue.roomId },
                data: { status: 'CLEANING' },
                include: { department: true }
            });
            (0, singletons_1.getIO)().emit('ROOM_UPDATED', room);
        }
        const logDetails = departmentId
            ? `Patient ${updatedQueue.patient.firstName} ${updatedQueue.patient.lastName} transferred to ${updatedQueue.department.name} (${status})`
            : `Patient ${updatedQueue.patient.firstName} ${updatedQueue.patient.lastName} moved to ${status}`;
        await (0, audit_1.logAction)(req.user.id, 'UPDATE_QUEUE_STATUS', logDetails);
        (0, singletons_1.getIO)().emit('QUEUE_UPDATED', updatedQueue);
        res.json(updatedQueue);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=queue.js.map