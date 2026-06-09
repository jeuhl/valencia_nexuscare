"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET notifications for the calling user's role
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const notifications = await prisma_1.prisma.notification.findMany({
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
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
// PUT mark notification as read
router.put('/:id/read', auth_1.authenticate, async (req, res) => {
    try {
        const n = await prisma_1.prisma.notification.update({
            where: { id: req.params.id },
            data: { read: true },
        });
        res.json(n);
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=notifications.js.map