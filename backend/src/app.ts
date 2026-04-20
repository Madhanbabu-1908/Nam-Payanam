import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import routes from './routes/index'; // Import the aggregated routes

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Nam-Payanam Backend is running 🚀' });
});

// API Routes
app.use('/api', routes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Error:', err.stack);
  
  // Handle specific known errors
  if (err.code === '23503') { // Foreign key violation
    return res.status(400).json({ success: false, error: 'Invalid reference data.' });
  }
  
  res.status(err.status || 500).json({
    success: false,
    error: env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
  });
});

export default app;