import express from 'express';
import cors from 'cors';
import { env } from './config/env';

// Import Routes (We will create these in the next step)
// import authRoutes from './routes/authRoutes';
// import tripRoutes from './routes/tripRoutes';
// import aiRoutes from './routes/aiRoutes';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Nam-Payanam Backend is running' });
});

// Route Registration
// app.use('/api/auth', authRoutes);
// app.use('/api/trips', tripRoutes);
// app.use('/api/ai', aiRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message,
  });
});

export default app;