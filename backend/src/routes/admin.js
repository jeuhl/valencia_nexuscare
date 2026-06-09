"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET all users (Admin only)
router.get('/users', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (req, res) => {
    try {
        const users = await prisma_1.prisma.user.findMany({
            select: { id: true, name: true, email: true, role: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
        });
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
// POST create new staff user (Admin only)
router.post('/users', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: 'All fields required' });
        }
        const hashed = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_1.prisma.user.create({
            data: { name, email, password: hashed, role },
            select: { id: true, name: true, email: true, role: true, createdAt: true },
        });
        res.status(201).json(user);
    }
    catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Email already in use' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});
// PUT update staff user (Admin only)
router.put('/users/:id', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role, password } = req.body;
        const data = {};
        if (name)
            data.name = name;
        if (email)
            data.email = email;
        if (role)
            data.role = role;
        if (password)
            data.password = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_1.prisma.user.update({
            where: { id },
            data,
            select: { id: true, name: true, email: true, role: true, createdAt: true },
        });
        res.json(user);
    }
    catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Email already in use' });
        }
        res.status(500).json({ error: 'Server error' });
    }
});
// GET audit logs (Admin only)
router.get('/logs', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), async (req, res) => {
    try {
        const logs = await prisma_1.prisma.auditLog.findMany({
            include: { user: { select: { name: true, role: true } } },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
        res.json(logs);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map