"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../src/prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function main() {
    console.log('Seeding data...');
    // Staff Accounts
    const commonPassword = '123'; // Using simple password for demo as requested
    const hashedPassword = await bcryptjs_1.default.hash(commonPassword, 10);
    const staff = [
        { email: 'admin@nexuscare.local', name: 'Head Administrator', role: 'ADMIN' },
        { email: 'doctor@nexuscare.local', name: 'Dr. James Wilson', role: 'DOCTOR' },
        { email: 'nurse@nexuscare.local', name: 'Nurse Sarah Hall', role: 'NURSE' },
        { email: 'lab@nexuscare.local', name: 'Tech Dexter Morgan', role: 'LAB_STAFF' },
        { email: 'clean@nexuscare.local', name: 'Housekeeping Team', role: 'CLEANING_STAFF' },
        { email: 'reception@nexuscare.local', name: 'Reception Desk', role: 'RECEPTIONIST' },
    ];
    for (const s of staff) {
        await prisma_1.prisma.user.upsert({
            where: { email: s.email },
            update: {
                password: hashedPassword,
                name: s.name,
                role: s.role
            },
            create: {
                email: s.email,
                password: hashedPassword,
                name: s.name,
                role: s.role,
            },
        });
    }
    // Departments
    const lab = await prisma_1.prisma.department.upsert({
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
    const radiology = await prisma_1.prisma.department.upsert({
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
    const icu = await prisma_1.prisma.department.upsert({
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
    const ward = await prisma_1.prisma.department.upsert({
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
    const er = await prisma_1.prisma.department.upsert({
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
    // New Patients
    const patients = [
        { firstName: 'Michael', lastName: 'Scott', dob: new Date('1964-03-15'), gender: 'Male', queueRef: 'Q-9001' },
        { firstName: 'Pam', lastName: 'Beesly', dob: new Date('1979-03-25'), gender: 'Female', queueRef: 'Q-9002' },
        { firstName: 'Jim', lastName: 'Halpert', dob: new Date('1978-10-01'), gender: 'Male', queueRef: 'Q-9003' },
        { firstName: 'Dwight', lastName: 'Schrute', dob: new Date('1970-01-20'), gender: 'Male', queueRef: 'Q-9004' },
        { firstName: 'Angela', lastName: 'Martin', dob: new Date('1971-06-25'), gender: 'Female', queueRef: 'Q-9005' },
    ];
    const createdPatients = await Promise.all(patients.map(p => prisma_1.prisma.patient.upsert({
        where: { queueRef: p.queueRef },
        update: p,
        create: p
    })));
    // Initial Queues
    await prisma_1.prisma.queue.create({
        data: { patientId: createdPatients[0].id, departmentId: er.id, priority: 'CODE_RED', status: 'WAITING', estimatedWait: 2 }
    });
    await prisma_1.prisma.queue.create({
        data: { patientId: createdPatients[1].id, departmentId: er.id, priority: 'HIGH', status: 'VITALS_TAKEN', estimatedWait: 10 }
    });
    await prisma_1.prisma.queue.create({
        data: { patientId: createdPatients[2].id, departmentId: er.id, priority: 'MEDIUM', status: 'WAITING', estimatedWait: 25 }
    });
    await prisma_1.prisma.queue.create({
        data: { patientId: createdPatients[3].id, departmentId: lab.id, priority: 'MEDIUM', status: 'SENT_TO_LAB', estimatedWait: 40 }
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
    await prisma_1.prisma.$disconnect();
})
    .catch(async (e) => {
    console.error(e);
    await prisma_1.prisma.$disconnect();
    process.exit(1);
});
//# sourceMappingURL=seed.js.map