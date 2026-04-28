/**
 * config/config.js
 * Central application configuration.
 * All environment-specific settings live here — never scattered across files.
 */

'use strict';

const path = require('path');

const config = {
  app: {
    name: 'JFT-Basic Practice Platform',
    version: '1.0.0',
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    frontendDir: path.join(__dirname, '..', 'frontend'),
  },

  server: {
    cors: {
      allowedOrigins: ['http://localhost:3000', 'http://127.0.0.1:3000'],
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
    },
  },

  database: {
    path: path.join(__dirname, '..', 'database', 'jft.db.json'),
    backupPath: path.join(__dirname, '..', 'database', 'backups'),
  },

  auth: {
    // In production: use a strong secret from environment variable
    jwtSecret: process.env.JWT_SECRET || 'jft-basic-dev-secret-change-in-production',
    jwtExpiresIn: '7d',
    saltRounds: 10,
  },

  exam: {
    durationSeconds: 3600,       // 60 minutes
    passingScore: 200,
    minScore: 10,
    maxScore: 250,
    questionsPerSection: 12,
    sections: ['文字・語彙', '会話と表現', '聴解', '読解'],
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    requests: true,
  },
};

// Freeze to prevent accidental mutation at runtime
Object.freeze(config);
Object.freeze(config.app);
Object.freeze(config.server);
Object.freeze(config.database);
Object.freeze(config.auth);
Object.freeze(config.exam);

module.exports = config;
