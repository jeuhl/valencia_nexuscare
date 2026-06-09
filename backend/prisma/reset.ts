import { prisma } from '../src/prisma';

async function main() {
  console.log('Resetting all data except staff...');

  // Delete all transactional and operational data
  await prisma.auditLog.deleteMany({});
  await prisma.patientMovement.deleteMany({});
  await prisma.vitals.deleteMany({});
  await prisma.labRequest.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.queue.deleteMany({});
  await prisma.patient.deleteMany({});
  
  // Do we delete rooms and departments? Usually yes for a "reset all"
  // but let's keep the default departments and rooms by re-seeding them 
  // or just delete them and re-create.
  await prisma.room.deleteMany({});
  await prisma.department.deleteMany({});

  console.log('Transactional data wiped. Re-seeding default departments and rooms...');

  // Departments
  const lab = await prisma.department.create({
    data: {
      id: 'lab-dept',
      name: 'Laboratory',
      type: 'DIAGNOSTIC',
      rooms: {
        create: [
          { name: 'Hematology Station', status: 'OPEN' },
          { name: 'Pathology Bay 1', status: 'OPEN' },
          { name: 'Clinical Chem Bay', status: 'OPEN' },
        ],
      },
    },
  });

  const radiology = await prisma.department.create({
    data: {
      id: 'rad-dept',
      name: 'Radiology',
      type: 'DIAGNOSTIC',
      rooms: {
        create: [
          { name: 'X-Ray Room A', status: 'OPEN' },
          { name: 'CT Scan 1', status: 'OPEN' },
          { name: 'MRI Suite', status: 'OPEN' },
        ],
      },
    },
  });

  const icu = await prisma.department.create({
    data: {
      id: 'icu-dept',
      name: 'ICU',
      type: 'TREATMENT',
      rooms: {
        create: [
          { name: 'ICU Bed 101', status: 'OPEN' },
          { name: 'ICU Bed 102', status: 'OPEN' },
          { name: 'ICU Bed 103', status: 'OPEN' },
        ],
      },
    },
  });

  const ward = await prisma.department.create({
    data: {
      id: 'ward-dept',
      name: 'General Ward',
      type: 'TREATMENT',
      rooms: {
        create: [
          { name: 'Room 201-A', status: 'OPEN' },
          { name: 'Room 201-B', status: 'OPEN' },
          { name: 'Room 202-A', status: 'OPEN' },
          { name: 'Room 202-B', status: 'OPEN' },
        ],
      },
    },
  });

  const er = await prisma.department.create({
    data: {
      id: 'er-dept',
      name: 'ER Triage',
      type: 'TRIAGE',
      rooms: {
        create: [
          { name: 'ER Bed 1', status: 'OPEN' },
          { name: 'ER Bed 2', status: 'OPEN' },
          { name: 'Emergency Bay Alpha', status: 'OPEN' },
        ],
      },
    },
  });

  console.log('Reset complete! All patients and queues wiped. Basic hospital structure restored.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
