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
// Sets various HTTP headers for security (X-DNS-Prefetch-Control, X-Frame-Options, etc.)
app.use(helmet());

// 2. CORS Configuration
// Allows requests from your frontend (Vercel/Local) to access this API
app.use(cors({
  origin: ['http://localhost:3000', 'https://nam-payanam-frontend.vercel.app'], // Add your actual frontend URL here
  credentials: true,
}));

// 3. Request Logging (Only in non-production or if you want to see logs)
if (env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// 4. Body Parsing
app.use(express.json({ limit: '10mb' })); // Increased limit for larger JSON payloads
app.use(express.urlencoded({ extended: true }));

// 5. Rate Limiting (Prevent DDoS/Brute Force)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// 6. Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Nam-Payanam Backend is running 🚀',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV
  });
});

// 7. API Routes
// All routes are prefixed with /api (defined in routes/index.ts)
app.use('/api', routes);

// 8. 404 Handler (If no route matches)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path
  });
});

// 9. Global Error Handler
// Catches all errors from controllers and middleware
app.use(errorHandler);

export default app;