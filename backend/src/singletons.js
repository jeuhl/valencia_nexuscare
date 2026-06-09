"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.getIO = getIO;
exports.setIO = setIO;
const socket_io_1 = require("socket.io");
const client_1 = require("@prisma/client");
const prisma_1 = require("./prisma");
Object.defineProperty(exports, "prisma", { enumerable: true, get: function () { return prisma_1.prisma; } });
let io;
function getIO() {
    return io;
}
function setIO(server) {
    io = server;
}
//# sourceMappingURL=singletons.js.map