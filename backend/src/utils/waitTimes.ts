import { prisma } from '../prisma';

/**
 * Calculates estimated wait time for a new patient in a department.
 * Uses a simplified version of Little's Law and historical data.
 */
export async function calculateWaitTime(departmentId: string): Promise<number> {
  // 1. Get number of patients currently in the queue for this department (L)
  const currentQueueLength = await prisma.queue.count({
    where: {
      departmentId,
      status: { notIn: ['COMPLETED', 'DISCHARGED'] }
    }
  });

  // 2. Define average service time (minutes per patient)
  // In a real system, this would be calculated from historical PatientMovement data.
  // For now, we'll use department-specific constants.
  const serviceTimes: Record<string, number> = {
    'er-dept': 15,    // ER triage takes ~15 mins
    'lab-dept': 30,   // Lab tests take ~30 mins
    'rad-dept': 45,   // Radiology takes ~45 mins
    'ward-dept': 60,  // Ward processing takes ~60 mins
  };

  const avgServiceTime = serviceTimes[departmentId] || 20;

  // 3. W = L * AvgServiceTime
  // We add 1 because the new patient will be behind all current patients.
  return (currentQueueLength + 1) * avgServiceTime;
}
