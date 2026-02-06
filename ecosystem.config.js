module.exports = {
  apps: [
    {
      name: 're-aniname',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -H 0.0.0.0',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        // Set your password here or in system environment variables
        // WEB_PASSWORD: 'your-secure-password' 
      },
    },
  ],
};
