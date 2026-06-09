"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET all departments
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const departments = await prisma_1.prisma.department.findMany({
            include: { rooms: true, _count: { select: { queues: true } } },
            orderBy: { name: 'asc' },
        });
        res.json(departments);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
// POST create new department (Admin only)
router.post('/', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (req, res) => {
    try {
        const { name, type, capacity } = req.body;
        if (!name || !type) {
            return res.status(400).json({ error: 'Name and type are required' });
        }
        const dept = await prisma_1.prisma.department.create({
            data: {
                name,
                type,
                capacity: capacity ? Number(capacity) : 10,
                isActive: true,
            },
            include: { rooms: true, _count: { select: { queues: true } } },
        });
        res.status(201).json(dept);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
// PUT update department (capacity, isActive) — Admin only
router.put('/:id', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const { capacity, isActive, name, type } = req.body;
        const data = {};
        if (capacity !== undefined)
            data.capacity = Number(capacity);
        if (isActive !== undefined)
            data.isActive = Boolean(isActive);
        if (name)
            data.name = name;
        if (type)
            data.type = type;
        const dept = await prisma_1.prisma.department.update({
            where: { id },
            data,
            include: { rooms: true, _count: { select: { queues: true } } },
        });
        res.json(dept);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=departments.js.map