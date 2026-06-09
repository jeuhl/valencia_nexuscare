"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET analytics: queue metrics + Little's Law
router.get('/queue', auth_1.authenticate, async (req, res) => {
    try {
        const now = new Date();
        const dayStart = new Date(now);
        dayStart.setHours(0, 0, 0, 0);
        // Total patients today
        const totalToday = await prisma_1.prisma.queue.count({ where: { joinedAt: { gte: dayStart } } });
        // Completed today
        const completedToday = await prisma_1.prisma.queue.count({
            where: { status: 'COMPLETED', joinedAt: { gte: dayStart } },
        });
        // Currently waiting
        const currentlyWaiting = await prisma_1.prisma.queue.count({ where: { status: 'WAITING' } });
        // Active (all non-completed)
        const activePatients = await prisma_1.prisma.queue.count({ where: { status: { not: 'COMPLETED' } } });
        // Average estimated wait
        const avgWait = await prisma_1.prisma.queue.aggregate({
            _avg: { estimatedWait: true },
            where: { status: 'WAITING' },
        });
        // Throughput per hour (Little's Law: L = λW)
        const hoursElapsed = Math.max(1, (now.getTime() - dayStart.getTime()) / 3600000);
        const arrivalRate = totalToday / hoursElapsed; // λ (patients/hr)
        const avgWaitHours = (avgWait._avg.estimatedWait || 30) / 60; // W
        const avgInSystem = arrivalRate * avgWaitHours; // L = λW
        // Priority breakdown
        const byPriority = await prisma_1.prisma.queue.groupBy({
            by: ['priority'],
            _count: true,
            where: { joinedAt: { gte: dayStart } },
        });
        // By department
        const byDept = await prisma_1.prisma.queue.groupBy({
            by: ['departmentId'],
            _count: true,
            where: { status: { not: 'COMPLETED' } },
        });
        // Hourly arrivals (last 8 hours)
        const hourlyData = [];
        for (let i = 7; i >= 0; i--) {
            const from = new Date(now.getTime() - i * 3600000);
            const to = new Date(from.getTime() + 3600000);
            const count = await prisma_1.prisma.queue.count({ where: { joinedAt: { gte: from, lt: to } } });
            hourlyData.push({
                hour: `${from.getHours().toString().padStart(2, '0')}:00`,
                arrivals: count,
            });
        }
        res.json({
            totalToday,
            completedToday,
            currentlyWaiting,
            activePatients,
            avgWaitMinutes: avgWait._avg.estimatedWait || 0,
            littlesLaw: {
                arrivalRatePerHour: Math.round(arrivalRate * 10) / 10,
                avgWaitMinutes: Math.round(avgWaitHours * 60),
                avgPatientsInSystem: Math.round(avgInSystem * 10) / 10,
            },
            byPriority,
            hourlyData,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});
// GET department loads for heatmap
router.get('/load', auth_1.authenticate, async (req, res) => {
    try {
        const departments = await prisma_1.prisma.department.findMany({
            include: {
                rooms: true,
                queues: { where: { status: { notIn: ['COMPLETED', 'DISCHARGED'] } } },
            },
        });
        const loadData = departments.map(dept => {
            const activePatients = dept.queues.length;
            const totalRooms = dept.rooms.length || 1;
            const cleaningRooms = dept.rooms.filter(r => r.status === 'CLEANING').length;
            // Load = (Patients + Rooms being cleaned) / Total Rooms
            const load = Math.min(100, Math.round(((activePatients + cleaningRooms) / totalRooms) * 100));
            let status = 'STABLE';
            let color = 'bg-green-500';
            if (load > 90) {
                status = 'CRITICAL';
                color = 'bg-red-500';
            }
            else if (load > 70) {
                status = 'HEAVY';
                color = 'bg-orange-500';
            }
            else if (load > 40) {
                status = 'MODERATE';
                color = 'bg-yellow-500';
            }
            return {
                name: dept.name,
                status,
                load,
                color,
                activePatients,
                totalRooms,
            };
        });
        res.json(loadData);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=analytics.js.map