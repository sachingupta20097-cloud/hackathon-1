import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import requestsRouter from './routes/requests.js';
import approvalsRouter from './routes/approvals.js';
import adminRouter from './routes/admin.js';
import { db } from './db/repository.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS Configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-role', 'x-user-id']
}));

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

app.use('/api', apiLimiter);

// Body Parser
app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/api/health', async (req, res) => {
  const isSupabaseReady = await db.checkSupabaseAvailability();
  res.json({
    status: 'ok',
    service: 'SmartFlow AI Backend API',
    version: '1.0.0',
    model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
    database: isSupabaseReady ? 'Supabase PostgreSQL (Live)' : 'Resilient High-Availability Storage',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api/requests', requestsRouter);
app.use('/api/approvals', approvalsRouter);
app.use('/api/admin', adminRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred.'
  });
});

// Start Server
app.listen(PORT, async () => {
  console.log(`=======================================================`);
  console.log(`🚀 SmartFlow AI Server running at http://localhost:${PORT}`);
  console.log(`✨ AI Model: ${process.env.GEMINI_MODEL || 'gemini-3.8-flash'}`);
  await db.checkSupabaseAvailability();
  console.log(`=======================================================`);
});

export default app;
