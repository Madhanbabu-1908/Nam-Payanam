import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env } from './config/env';
import routes from './routes/index';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// 1. Security Middleware
app.use(helmet());

// 2. CORS Configuration
// Update the origin with your actual frontend URL when deployed
app.use(cors({
  origin: ['http://localhost:3000', 'https://nam-payanam.onrender.com', '*'], 
  credentials: true,
}));

// 3. Request Logging
if (env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// 4. Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 5. Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// ❌ REMOVED: Standalone /health route (Moved to routes/index.ts)

// 6. API Routes (All routes here will be prefixed with /api)
app.use('/api', routes);

// 7. 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path
  });
});

// 8. Global Error Handler
app.use(errorHandler);

export default app;