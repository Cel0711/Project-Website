// PM2 process definition. Run from the repo root:
//   npm run pm2:start   (builds shared+backend, then `pm2 start` this file)
//   npm run pm2:logs
//   npm run pm2:restart
//   npm run pm2:stop
//
// CommonJS on purpose: PM2's config loader expects `module.exports` even
// though the backend package itself is "type": "module".
//
// Settings (DATABASE_URL, SMTP_*, APP_URL, ...) come from packages/backend/.env, which the app
// loads itself, so no secrets live in this file.
module.exports = {
  apps: [
    {
      name: 'coreloop-api',
      cwd: __dirname,
      script: 'dist/index.js',
      // Single instance on purpose: live chat updates (Server-Sent Events) and the rate limiter keep
      // their state in this process's memory. To scale out, move both to Postgres LISTEN/NOTIFY first.
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '300M',
      autorestart: true,
      watch: false,
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      time: true,
    },
  ],
};
