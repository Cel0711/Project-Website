// PM2 process definition. Run from the repo root:
//   npm run pm2:start   (builds shared+backend, then `pm2 start` this file)
//   npm run pm2:logs
//   npm run pm2:restart
//   npm run pm2:stop
//
// CommonJS on purpose: PM2's config loader expects `module.exports` even
// though the backend package itself is "type": "module".
module.exports = {
  apps: [
    {
      name: 'coreloop-api',
      cwd: __dirname,
      script: 'dist/index.js',
      // Single instance: the default json-file storage driver serialises
      // writes in-process, which only holds true within one process. Swap
      // in a real database before scaling this to `instances: 'max'`.
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
