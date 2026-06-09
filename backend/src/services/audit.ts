import { prisma } from '../prisma';

export const logAction = async (userId: string, action: string, details: string) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        details,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};
