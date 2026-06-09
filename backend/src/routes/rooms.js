"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const singletons_1 = require("../singletons");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET all rooms (optionally by department)
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const { departmentId } = req.query;
        const rooms = await prisma_1.prisma.room.findMany({
            where: departmentId ? { departmentId: departmentId } : {},
            include: { department: true, queues: { include: { patient: true }, where: { status: { not: 'COMPLETED' } } } },
            orderBy: { name: 'asc' },
        });
        res.json(rooms);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});
// PUT update room status
router.put('/:id/status', auth_1.authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const room = await prisma_1.prisma.room.update({
            where: { id },
            data: { status },
            include: { department: true },
        });
        (0, singletons_1.getIO)().emit('ROOM_UPDATED', room);
        res.json(room);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});
// POST create new room
router.post('/', auth_1.authenticate, async (req, res) => {
    try {
        const { name, departmentId, status } = req.body;
        if (!name || !departmentId) {
            return res.status(400).json({ error: 'Name and departmentId are required' });
        }
        const room = await prisma_1.prisma.room.create({
            data: { name, departmentId, status: status || 'OPEN' },
            include: { department: true },
        });
        (0, singletons_1.getIO)().emit('ROOM_UPDATED', room);
        res.status(201).json(room);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=rooms.js.map