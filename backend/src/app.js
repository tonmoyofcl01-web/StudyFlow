import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import appRoutes from './routes/appRoutes.js';
import { entityRouter } from './routes/entityRoutes.js';
import { requireAuth } from './middleware/auth.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();
if (env.trustProxy) app.set('trust proxy', env.trustProxy);

app.use(helmet({
  hsts: env.isProduction
    ? { maxAge: 15552000, includeSubDomains: false, preload: false }
    : false,
}));

// In production, TLS must terminate directly at Node or at the trusted reverse proxy.
if (env.isProduction) {
  app.use((req, res, next) => {
    if (!req.secure) {
      return res.status(400).json({
        success: false,
        message: 'HTTPS is required. Configure TLS on the production server or trusted reverse proxy.',
      });
    }
    return next();
  });
}

app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
}), authRoutes);
app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok', service: 'studyflow-api' }));
app.use('/api', requireAuth);
app.use('/api', appRoutes);
for (const [path, kind] of Object.entries({
  subjects: 'subjects',
  assignments: 'assignments',
  examinations: 'examinations',
  'study-sessions': 'study-sessions',
  goals: 'goals',
})) {
  app.use(`/api/${path}`, entityRouter(kind));
}
app.use(notFound);
app.use(errorHandler);

export default app;
