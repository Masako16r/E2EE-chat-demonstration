import { prisma } from './db.js';
import { Prisma } from '@prisma/client';

let dbHealthStatus = { healthy: false, lastCheck: null };

// Check database connection
export const checkDatabaseHealth = async () => {
  try {
    await prisma.$queryRaw(Prisma.sql`SELECT 1`);
    dbHealthStatus = { healthy: true, lastCheck: new Date() };
    return true;
  } catch (error) {
    console.error('Database health check failed:', error.message);
    dbHealthStatus = { healthy: false, lastCheck: new Date(), error: error.message };
    return false;
  }
};

// Liveness probe - is the server running?
export const livenessProbe = (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
};

// Readiness probe - is the server ready to handle traffic?
export const readinessProbe = async (req, res) => {
  const dbHealthy = await checkDatabaseHealth();

  if (!dbHealthy) {
    return res.status(503).json({
      status: 'not-ready',
      message: 'Database connection failed',
      database: dbHealthStatus,
      timestamp: new Date().toISOString()
    });
  }

  res.status(200).json({
    status: 'ready',
    database: dbHealthStatus,
    timestamp: new Date().toISOString()
  });
};

// Get health info
export const getHealthInfo = async (req, res) => {
  const dbHealthy = await checkDatabaseHealth();

  res.status(dbHealthy ? 200 : 503).json({
    status: dbHealthy ? 'healthy' : 'degraded',
    database: dbHealthStatus,
    server: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  });
};

// Periodic health check
export const startHealthChecks = (intervalMs = 30000) => {
  setInterval(async () => {
    await checkDatabaseHealth();
  }, intervalMs);

  // Initial check
  checkDatabaseHealth();
};
