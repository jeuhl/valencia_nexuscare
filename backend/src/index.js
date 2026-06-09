"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
const singletons_1 = require("./singletons");
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
});
(0, singletons_1.setIO)(io);
const auth_1 = __importDefault(require("./routes/auth"));
const queue_1 = __importDefault(require("./routes/queue"));
const patient_1 = __importDefault(require("./routes/patient"));
const rooms_1 = __importDefault(require("./routes/rooms"));
const labs_1 = __importDefault(require("./routes/labs"));
const departments_1 = __importDefault(require("./routes/departments"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const admin_1 = __importDefault(require("./routes/admin"));
const patients_1 = __importDefault(require("./routes/patients"));
const vitals_1 = __importDefault(require("./routes/vitals"));
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/auth', auth_1.default);
app.use('/api/queues', queue_1.default);
app.use('/api/patient', patient_1.default);
app.use('/api/rooms', rooms_1.default);
app.use('/api/labs', labs_1.default);
app.use('/api/departments', departments_1.default);
app.use('/api/notifications', notifications_1.default);
app.use('/api/analytics', analytics_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/patients', patients_1.default);
app.use('/api/vitals', vitals_1.default);
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
//# sourceMappingURL=index.js.map