const { Sequelize } = require('sequelize');

// Railway MySQL PUBLIC networking (hardcoded for the Render deployment).
// Do NOT use mysql.railway.internal / port 3306 / localhost from Render.
const DB_HOST = 'tokaido.proxy.rlwy.net';
const DB_PORT = 27021;
const DB_NAME = 'railway';
const DB_USERNAME = 'root';
const DB_PASSWORD = 'rHDQuYSwpOQzYLvBkiwbVsOGMFUGiBmN';

const sequelize = new Sequelize(DB_NAME, DB_USERNAME, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'mysql',
  logging: false,
  define: {
    underscored: true,
    timestamps: false,
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
    evict: 5000,
  },
  dialectOptions: {
    connectTimeout: 60000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  },
  retry: {
    max: 3,
  },
});

module.exports = sequelize;