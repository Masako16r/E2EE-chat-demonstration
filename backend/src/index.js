import dotenv from "dotenv";
dotenv.config();

import express, { json } from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { serve, setup } from "swagger-ui-express";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.js";
import messagesRoutes from "./routes/messages.js";
import { UserValidation } from "./middleware/auth.middleware.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { livenessProbe, readinessProbe, getHealthInfo, startHealthChecks } from "./health.js";
import { prisma } from "./db.js";
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 4000;

// Create HTTP server for Socket.io
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }
});

// Store online users
const onlineUsers = new Map();

// Middleware
app.use(cors());
app.use(json());

// Routes

app.use("/api/users", userRoutes);
app.use("/api/messages", messagesRoutes);

app.use("/api/auth", authRoutes);


const swaggerDocument = await import("../swagger.json", {
  with: { type: "json" },
});
app.use("/api-docs", serve, setup(swaggerDocument.default));

// Health check endpoints
app.get("/api/health", getHealthInfo);
app.get("/health/live", livenessProbe);
app.get("/health/ready", readinessProbe);

// Legacy health endpoints (for backward compatibility)
app.get("/api/health/liveness", livenessProbe);
app.get("/api/health/readiness", readinessProbe);

// User endpoint
app.get("/api/me", UserValidation, (req, res) => {
  res.json({ userId: req.user.userId });
});


app.use((req, res) => {
  res.status(404).json({ message: "Endpoint not found" });
});


app.use(errorHandler);

// Socket.io Middleware - JWT Authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = payload;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

// Socket.io Connection
io.on('connection', (socket) => {
  console.log(`User ${socket.user.userId} connected with socket ${socket.id}`);
  
  // Store online user
  onlineUsers.set(socket.user.userId, socket.id);

  // Handle disconnect
  socket.on('disconnect', () => {
    onlineUsers.delete(socket.user.userId);
    console.log(`User ${socket.user.userId} disconnected`);
  });

  // Handle send message event
  socket.on('send-message', async (data) => {
    try {
      const { toUserId, chatId, ciphertext, iv } = data;

      // Save message to database
      const message = await prisma.message.create({
        data: {
          chatId,
          senderId: socket.user.userId,
          ciphertext,
          iv
        },
        include: {
          sender: {
            select: {
              id: true,
              email: true
            }
          }
        }
      });

      // Check if receiver is online
      const receiverSocketId = onlineUsers.get(toUserId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('new-message', message);
      }

      // Send confirmation to sender
      socket.emit('message-sent', { id: message.id, status: 'sent' });
    } catch (error) {
      console.error('Error saving message:', error);
      socket.emit('message-error', { error: 'Failed to save message' });
    }
  });

  // Handle typing indicator (optional)
  socket.on('typing', (data) => {
    const receiverSocketId = onlineUsers.get(data.toUserId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('user-typing', {
        userId: socket.user.userId,
        chatId: data.chatId
      });
    }
  });

  // Handle stop typing
  socket.on('stop-typing', (data) => {
    const receiverSocketId = onlineUsers.get(data.toUserId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('user-stop-typing', {
        userId: socket.user.userId,
        chatId: data.chatId
      });
    }
  });
});

startHealthChecks(30000);

//shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\nReceived ${signal}, shutting down...`);
  
  // Close server
  httpServer.close(async () => {
    console.log("HTTP server closed");
    
    // Close database connection
    try {
      await prisma.$disconnect();
      console.log("Database connection closed");
    } catch (error) {
      console.error("Error closing database:", error);
    }
    
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error("Forced shutdown due to timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Start server
httpServer.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`WebSocket running on ws://localhost:${PORT}`);
  console.log(`Swagger on http://localhost:${PORT}/api-docs`);
  console.log(`Health check: GET http://localhost:${PORT}/api/health`);
  console.log(`Liveness: GET http://localhost:${PORT}/health/live`);
  console.log(`Readiness: GET http://localhost:${PORT}/health/ready`);
});

