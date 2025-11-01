/**
 * PM2 ecosystem for persistent dev server (CommonJS variant)
 */
module.exports = {
  apps: [
    {
      name: 'teamnl-cloud9-dashboard',
      // Use local tsx binary to run TypeScript directly
      script: 'node_modules/.bin/tsx',
      args: ['src/server.ts'],
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
