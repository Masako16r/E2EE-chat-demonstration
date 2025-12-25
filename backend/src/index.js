import dotenv from "dotenv";
dotenv.config();

import express, { json } from "express";
import cors from "cors";
import { serve, setup } from "swagger-ui-express";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.js";
import { UserValidation } from "./middleware/auth.middleware.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { livenessProbe, readinessProbe, getHealthInfo, startHealthChecks } from "./health.js";
import { prisma } from "./db.js";

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(json());

// Routes

app.use("/api", userRoutes);

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


startHealthChecks(30000);

//shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\nReceived ${signal}, shutting down...`);
  
  // Close server
  server.close(async () => {
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
const server = app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`Swagger on http://localhost:${PORT}/api-docs`);
  console.log(`Health check: GET http://localhost:${PORT}/api/health`);
  console.log(`Liveness: GET http://localhost:${PORT}/health/live`);
  console.log(`Readiness: GET http://localhost:${PORT}/health/ready`);
});

