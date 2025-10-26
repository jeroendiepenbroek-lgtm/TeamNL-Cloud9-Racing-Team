#!/usr/bin/env node

/**
 * Keepalive Script - Monitors server health and auto-restarts if needed
 * 
 * Usage:
 *   node scripts/keepalive.js
 * 
 * Features:
 * - Health check every 30 seconds
 * - Auto-restart on failure (3 attempts)
 * - Logging to console and file
 */

import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  healthCheckUrl: 'http://localhost:3000/api/health',
  checkInterval: 30000, // 30 seconds
  maxRestartAttempts: 3,
  restartDelay: 5000, // 5 seconds
  logFile: path.join(__dirname, '..', 'logs', 'keepalive.log'),
};

let serverProcess = null;
let restartAttempts = 0;
let lastHealthCheck = new Date();

// Ensure logs directory exists
const logsDir = path.dirname(CONFIG.logFile);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Log message to console and file
 */
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  console.log(logMessage);
  
  fs.appendFileSync(CONFIG.logFile, logMessage + '\n', 'utf8');
}

/**
 * Check server health
 */
function checkHealth() {
  return new Promise((resolve, reject) => {
    const url = new URL(CONFIG.healthCheckUrl);
    
    const req = http.get({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      timeout: 5000,
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            if (json.status === 'ok') {
              resolve(true);
            } else {
              reject(new Error('Health check returned non-ok status'));
            }
          } catch (err) {
            reject(new Error('Health check returned invalid JSON'));
          }
        } else {
          reject(new Error(`Health check returned status ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Health check timeout'));
    });
  });
}

/**
 * Start server process
 */
function startServer() {
  log('🚀 Starting server...');
  
  serverProcess = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true,
  });
  
  serverProcess.on('error', (err) => {
    log(`❌ Server process error: ${err.message}`);
  });
  
  serverProcess.on('exit', (code, signal) => {
    log(`⚠️  Server process exited (code: ${code}, signal: ${signal})`);
    serverProcess = null;
    
    if (restartAttempts < CONFIG.maxRestartAttempts) {
      restartAttempts++;
      log(`🔄 Restarting server (attempt ${restartAttempts}/${CONFIG.maxRestartAttempts})...`);
      
      setTimeout(() => {
        startServer();
      }, CONFIG.restartDelay);
    } else {
      log(`💀 Max restart attempts reached. Manual intervention required.`);
      process.exit(1);
    }
  });
}

/**
 * Stop server process
 */
function stopServer() {
  if (serverProcess) {
    log('🛑 Stopping server...');
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
}

/**
 * Main monitoring loop
 */
async function monitor() {
  try {
    await checkHealth();
    
    lastHealthCheck = new Date();
    restartAttempts = 0; // Reset on successful health check
    
    log('✅ Health check passed');
    
  } catch (err) {
    log(`❌ Health check failed: ${err.message}`);
    
    // Server is unhealthy - restart it
    if (serverProcess) {
      stopServer();
    }
    
    if (restartAttempts < CONFIG.maxRestartAttempts) {
      restartAttempts++;
      log(`🔄 Restarting server (attempt ${restartAttempts}/${CONFIG.maxRestartAttempts})...`);
      
      setTimeout(() => {
        startServer();
      }, CONFIG.restartDelay);
    } else {
      log(`💀 Max restart attempts reached. Manual intervention required.`);
      process.exit(1);
    }
  }
}

/**
 * Graceful shutdown
 */
function shutdown() {
  log('🛑 Keepalive shutting down...');
  stopServer();
  process.exit(0);
}

// Handle signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start monitoring
log('👀 Keepalive monitor started');
log(`   Health check URL: ${CONFIG.healthCheckUrl}`);
log(`   Check interval: ${CONFIG.checkInterval / 1000}s`);
log(`   Max restart attempts: ${CONFIG.maxRestartAttempts}`);

startServer();

// Wait for server to start before first health check
setTimeout(() => {
  monitor();
  setInterval(monitor, CONFIG.checkInterval);
}, 10000); // Wait 10 seconds for initial startup
