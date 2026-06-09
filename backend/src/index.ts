import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { setIO } from './singletons';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
});

setIO(io);

import authRouter from './routes/auth';
import queueRouter from './routes/queue';
import patientRouter from './routes/patient';
import roomsRouter from './routes/rooms';
import labsRouter from './routes/labs';
import departmentsRouter from './routes/departments';
import notificationsRouter from './routes/notifications';
import analyticsRouter from './routes/analytics';
import adminRouter from './routes/admin';
import patientsRouter from './routes/patients';
import vitalsRouter from './routes/vitals';

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/queues', queueRouter);
app.use('/api/patient', patientRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/labs', labsRouter);
app.use('/api/departments', departmentsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/patients', patientsRouter);
app.use('/api/vitals', vitalsRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'NexusCare API running', timestamp: new Date() });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('join_room', (roomId) => socket.join(roomId));
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

const PORT = Number(process.env.PORT) || 4000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ NexusCare API running at http://0.0.0.0:${PORT}`);
});
