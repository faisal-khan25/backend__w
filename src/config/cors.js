const isProduction = process.env.NODE_ENV === 'production';

const parseList = (value) =>
  (value || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

const DEV_ORIGINS = ['https://union-hrms-workspace-f.onrender.com', 'http://127.0.0.1:5173'];


const configuredOrigins = [
  ...parseList(process.env.FRONTEND_URL),
  ...parseList(process.env.CORS_ORIGINS),
];

const allowedOrigins = Array.from(
  new Set(
    configuredOrigins.length === 0 || !isProduction
      ? [...configuredOrigins, ...DEV_ORIGINS]
      : configuredOrigins
  )
);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  
  exposedHeaders: ['Content-Disposition'],
  credentials: true,
};

module.exports = corsOptions;