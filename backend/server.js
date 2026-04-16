require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3001;

// Security
app.use(helmet());
app.use(morgan('combined'));

// CORS — allow any *.vercel.app subdomain + localhost
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://nam-payanam.vercel.app',
];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow no-origin requests (Render health probes, curl, mobile)
    if (!origin) return callback(null, true);
    // Allow any *.vercel.app subdomain
    if (/https?:\/\/.*\.vercel\.app$/.test(origin)) return callback(null, true);
    // Allow explicit list
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn('CORS blocked origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Handle all preflight OPTIONS requests
app.options('*', cors());

// Body parser
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI rate limit reached. Please wait a moment.' }
});

app.use('/api/ai', aiLimiter);
app.use('/api', apiLimiter);

// API Routes
app.use('/api', routes);

// Root — Render health probe + browser visit
app.get('/', (req, res) => {
  res.json({
    app: 'Nam Payanam API',
    tamil: 'நம் பயணம்',
    status: 'running',
    version: '1.0.0',
    docs: {
      health: '/health',
      trips: '/api/trips/:code',
      aiPlans: 'POST /api/trips/ai-plans',
      expenses: '/api/expenses/:tripId',
      chat: 'POST /api/ai/chat'
    },
    timestamp: new Date().toISOString()
  });
});

// Health check with env validation
app.get('/health', (req, res) => {
  const groqOk = !!process.env.GROQ_API_KEY;
  const supabaseOk = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_KEY;
  res.status(groqOk && supabaseOk ? 200 : 503).json({
    status: groqOk && supabaseOk ? 'ok' : 'degraded',
    app: 'Nam Payanam',
    checks: {
      groq: groqOk ? 'ok' : 'MISSING GROQ_API_KEY',
      supabase: supabaseOk ? 'ok' : 'MISSING SUPABASE_URL or SUPABASE_SERVICE_KEY',
    },
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  console.warn(`404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    hint: 'All API routes are prefixed with /api — e.g. GET /api/trips/ABC123'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS: Origin not allowed' });
  }
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`\n🗺️  Nam Payanam (நம் பயணம்) Backend`);
  console.log(`🚀 Running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 Groq API:    ${process.env.GROQ_API_KEY    ? '✅ Set' : '❌ MISSING — AI features will fail'}`);
  console.log(`🗄️  Supabase:    ${process.env.SUPABASE_URL    ? '✅ Set' : '❌ MISSING — DB will fail'}`);
  console.log(`🌐 Frontend:    ${process.env.FRONTEND_URL    || 'using defaults (localhost + vercel.app)'}\n`);
});

module.exports = app;
