"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const audit_1 = require("../services/audit");
const singletons_1 = require("../singletons");
const router = (0, express_1.Router)();
// POST record vitals
router.post('/', auth_1.authenticate, async (req, res) => {
    try {
        const { queueId, bp, temp, heartRate, oxygen, weight, notes } = req.body;
        const user = req.user;
        if (!queueId)
            return res.status(400).json({ error: 'Queue ID required' });
        const vitals = await prisma_1.prisma.vitals.upsert({
            where: { queueId },
            update: {
                bp, temp, heartRate, oxygen, weight, notes,
                recordedBy: user.name,
            },
            create: {
                queueId,
                bp, temp, heartRate, oxygen, weight, notes,
                recordedBy: user.name,
            },
            include: { queue: { include: { patient: true } } }
        });
        // Update queue status to VITALS_TAKEN if it was WAITING
        const queue = await prisma_1.prisma.queue.findUnique({ where: { id: queueId } });
        if (queue && queue.status === 'WAITING') {
            await prisma_1.prisma.queue.update({
                where: { id: queueId },
                data: { status: 'VITALS_TAKEN' }
            });
            const updatedQueue = await prisma_1.prisma.queue.findUnique({
                where: { id: queueId },
                include: { patient: true, department: true }
            });
            (0, singletons_1.getIO)().emit('QUEUE_UPDATED', updatedQueue);
        }
        await (0, audit_1.logAction)(user.id, 'RECORD_VITALS', `Recorded vitals for ${vitals.queue.patient.firstName} ${vitals.queue.patient.lastName}`);
        res.status(201).json(vitals);
    }
    catch (error) {
        console.error('[VITALS_ERROR]', error);
        res.status(500).json({ error: 'Server error', message: error.message });
    }
});
// GET vitals for a queue
router.get('/:queueId', auth_1.authenticate, async (req, res) => {
    try {
        const { queueId } = req.params;
        const vitals = await prisma_1.prisma.vitals.findUnique({
            where: { queueId }
        });
        res.json(vitals);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=vitals.js.map