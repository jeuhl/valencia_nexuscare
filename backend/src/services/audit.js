"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAction = void 0;
const prisma_1 = require("../prisma");
const logAction = async (userId, action, details) => {
    try {
        await prisma_1.prisma.auditLog.create({
            data: {
                userId,
                action,
                details,
            },
        });
    }
    catch (error) {
        console.error('Failed to create audit log:', error);
    }
};
exports.logAction = logAction;
//# sourceMappingURL=audit.js.map