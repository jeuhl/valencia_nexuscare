import { prisma } from '../src/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('Seeding data...');

  // Staff Accounts
  const commonPassword = '123'; // Using simple password for demo as requested
  const hashedPassword = await bcrypt.hash(commonPassword, 10);

  const staff = [
    { email: 'admin@nexuscare.local', name: 'Head Administrator', role: 'ADMIN' },
    { email: 'doctor@nexuscare.local', name: 'Dr. James Wilson', role: 'DOCTOR' },
    { email: 'nurse@nexuscare.local', name: 'Nurse Sarah Hall', role: 'NURSE' },
    { email: 'lab@nexuscare.local', name: 'Tech Dexter Morgan', role: 'LAB_STAFF' },
    { email: 'clean@nexuscare.local', name: 'Housekeeping Team', role: 'CLEANING_STAFF' },
    { email: 'reception@nexuscare.local', name: 'Reception Desk', role: 'RECEPTIONIST' },
  ];

  for (const s of staff) {
    await prisma.user.upsert({
      where: { email: s.email },
      update: {
        password: hashedPassword,
        name: s.name,
        role: s.role as any
      },
      create: {
        email: s.email,
        password: hashedPassword,
        name: s.name,
        role: s.role as any,
      },
    });
  }

  // Departments
  const lab = await prisma.department.upsert({
    where: { id: 'lab-dept' },
    update: {},
    create: {
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

  const radiology = await prisma.department.upsert({
    where: { id: 'rad-dept' },
    update: {},
    create: {
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

  const icu = await prisma.department.upsert({
    where: { id: 'icu-dept' },
    update: {},
    create: {
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

  const ward = await prisma.department.upsert({
    where: { id: 'ward-dept' },
    update: {},
    create: {
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

  const er = await prisma.department.upsert({
    where: { id: 'er-dept' },
    update: {},
    create: {
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

  console.log('Seeding complete! Logins (Password: 123):', {
    admin: 'admin@nexuscare.local',
    doctor: 'doctor@nexuscare.local',
    nurse: 'nurse@nexuscare.local',
    lab: 'lab@nexuscare.local',
    clean: 'clean@nexuscare.local',
    reception: 'reception@nexuscare.local'
  });
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
