import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env } from './config/env';
import routes from './routes/index';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// ✅ CRITICAL: Trust the first proxy (Render) to get correct client IP
app.set('trust proxy', 1);

// 1. Security Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false, 
}));

// 2. CORS Configuration - DYNAMIC VERCEL SUPPORT
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl/postman)
    if (!origin) return callback(null, true);

    // Define your strict production domain
    const productionDomain = 'https://nam-payanam.vercel.app';
    
    // Check if the request comes from:
    // 1. Localhost (for development)
    // 2. Your exact production domain
    // 3. ANY vercel.app subdomain (for Preview Deployments)
    const isAllowed = 
      origin.startsWith('http://localhost') || 
      origin === productionDomain || 
      origin.endsWith('.vercel.app');

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`❌ CORS Blocked Origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true, // Keep TRUE for Auth/Cookies
  optionsSuccessStatus: 200
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
  max: 100, 
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// 6. Health Check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Nam-Payanam Backend is running 🚀',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV
  });
});

// 7. API Routes
app.use('/api', routes);

// 8. 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path
  });
});

// 9. Global Error Handler
app.use(errorHandler);

export default app;
