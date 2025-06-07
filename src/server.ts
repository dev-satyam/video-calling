import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { DataSource } from 'typeorm';
import { User } from './entity/User';
import { CallLog } from './entity/CallLog';
import 'reflect-metadata';
import path from 'path';

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer);

const AppDataSource = new DataSource({
  type: 'sqlite',
  database: 'db.sqlite',
  synchronize: true,
  logging: false,
  entities: [User, CallLog],
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// WebSocket logic
AppDataSource.initialize().then(() => {
  console.log('✅ Database connected');

  io.on('connection', async (socket) => {
    console.log('🔌 New client connected:', socket.id);

    // Save user to DB
    const user = new User();
    user.name = `User-${socket.id.slice(0, 5)}`;
    user.socketId = socket.id;
    await AppDataSource.manager.save(user);
    console.log(`👤 Registered ${user.name}`);

    // Notify other clients
    socket.broadcast.emit('new-user', { id: user.id, name: user.name });

    // Relay offer, answer, and ICE candidates
    socket.on('offer', (data) => {
      io.to(data.target).emit('offer', {
        sdp: data.sdp,
        caller: socket.id,
      });
    });

    socket.on('answer', (data) => {
      io.to(data.target).emit('answer', {
        sdp: data.sdp,
        callee: socket.id,
      });
    });

    socket.on('ice-candidate', (data) => {
      io.to(data.target).emit('ice-candidate', {
        candidate: data.candidate,
        from: socket.id,
      });
    });

    // Store call log
    socket.on('call-ended', async (data) => {
      const log = new CallLog();
      log.callerId = data.callerId;
      log.receiverId = data.receiverId;
      log.startedAt = new Date(data.startedAt);
      log.endedAt = new Date();
      await AppDataSource.manager.save(log);
      console.log(`📞 Call logged from ${data.callerId} to ${data.receiverId}`);
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      await AppDataSource.getRepository(User).delete({ socketId: socket.id });
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });

  // Start server
  httpServer.listen(3000, () => {
    console.log('🚀 Server running at http://localhost:3000');
  });
}).catch((err) => {
  console.error('❌ Database connection error:', err);
});
