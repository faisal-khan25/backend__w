require('dotenv').config();

const http = require('http');

const app = require('./src/app');
const sequelize = require('./src/config/db');
const seedDevAdmin = require('./src/utils/seed');
const seedReferenceData = require('./src/utils/seedReferenceData');
const { runMigrations } = require('./src/utils/migrate');
const { initSocketServer } = require('./src/middleware/socketserver');
const { startExpirySweep } = require('./src/services/employeeStatus.service');

const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'development';

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');

    
    await sequelize.sync();

    
    await runMigrations();

    if (NODE_ENV !== 'production' && process.env.SEED_DEV_ADMIN === 'true') {
      await seedDevAdmin();
    }

    
    await seedReferenceData();

    
    const httpServer = http.createServer(app);
    initSocketServer(httpServer);

    startExpirySweep();

    // Render's proxy keeps connections alive; keep Node's timeouts above the proxy's to avoid sporadic 502s.
    httpServer.keepAliveTimeout = 65000;
    httpServer.headersTimeout = 66000;

    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(
        `union-landing-backend listening on port ${PORT} (${NODE_ENV}) [http + websocket]`
      );
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();