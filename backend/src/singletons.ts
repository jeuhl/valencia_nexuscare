import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { prisma } from './prisma';

let io: Server;

export function getIO(): Server {
  return io;
}

export function setIO(server: Server) {
  io = server;
}

export { prisma };
