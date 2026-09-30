const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const corsOptions = require('./config/cors');
const authenticate = require('./middleware/authenticate');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const apiRoutes = require('./routes');

const app = express();


app.set('trust proxy', 1);


app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors(corsOptions));
app.use(
  compression({
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    },
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(authenticate);

app.use(
  '/uploads',
  express.static(process.env.UPLOAD_ROOT || path.join(__dirname, '..', 'uploads'), {
    fallthrough: true,
    maxAge: '1d',
  })
);

app.get('/health', (req, res) =>
  res.json({ status: 'ok', service: 'union-hrms-workspace-backend' })
);

app.use('/api', apiRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;