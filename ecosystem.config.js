/**
 * PM2 ecosystem for persistent dev server
 */
module.exports = {
  apps: [
    {
      name: 'teamnl-cloud9-dashboard',
      script: 'node',
      args: ['--enable-source-maps', 'src/server.ts'],
      interpreter: 'node',
      env: {
        NODE_ENV: 'development',
        PORT: process.env.PORT || 3000,
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
    },
  ],
};
module.exports = {
  apps: [{
    name: 'teamnl-cloud9-dashboard',
    script: './dist/server.js',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000,
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    shutdown_with_message: true
  }]
}
