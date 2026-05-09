import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env } from './config/env';
import routes from './routes/index';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// ✅ CRITICAL: Trust the first proxy (Render) to get correct client IP for rate limiting
app.set('trust proxy', 1);

// 1. Security Middleware
// Helmet helps secure Express apps by setting various HTTP headers.
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Often needed for frontend assets
  contentSecurityPolicy: false,     // Disabled to prevent conflicts with API responses during dev
}));

// 2. CORS Configuration - STRICT
// Only allow requests from your specific Vercel domain and localhost
const allowedOrigins = [
  'http://localhost:3000', 
  'http://localhost:5173', 
  'https://nam-payanam.vercel.app' // YOUR PRODUCTION DOMAIN
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl/postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`❌ CORS Blocked Origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true, // Required for sending cookies/auth headers
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
}));

// 3. Request Logging
if (env.NODE_ENV !== 'production') {
  app.use(morgan('dev')); // Concise output for development
} else {
  app.use(morgan('combined')); // Standard Apache combined log format for production
}

// 4. Body Parsing
app.use(express.json({ limit: '10mb' })); // Increased limit for larger payloads (e.g., AI responses)
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
// All routes are prefixed with /api
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
