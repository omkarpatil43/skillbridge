import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { connectDB, getMongoStatus } from './config/db.js';
import { seedDatabaseIfEmpty } from './seed/seedData.js';

// Modular Route Handlers
import { authRouter } from './routes/authRoutes.js';
import { academicRouter } from './routes/academicRoutes.js';
import { skillRouter } from './routes/skillRoutes.js';
import { clubRouter } from './routes/clubRoutes.js';
import { doubtRouter } from './routes/doubtRoutes.js';
import { placementRouter } from './routes/placementRoutes.js';
import { scholarshipRouter } from './routes/scholarshipRoutes.js';
import { chatRouter } from './routes/chatRoutes.js';
import { adminRouter } from './routes/adminRoutes.js';
import { setupRouter } from './routes/setupRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Global Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'SkillBridge Central API Server',
    database: getMongoStatus(),
    databaseMode: getMongoStatus() === 'connected' ? 'mongodb' : 'local-fallback',
  });
});

// Mount Modular API Routes
app.use('/api/auth', authRouter);
app.use('/api/academic', academicRouter);
app.use('/api/skills', skillRouter);
app.use('/api/clubs', clubRouter);
app.use('/api/doubts', doubtRouter);
app.use('/api/placements', placementRouter);
app.use('/api/scholarships', scholarshipRouter);
app.use('/api/chat', chatRouter);
app.use('/api/admin', adminRouter);
app.use('/api/setup', setupRouter);

// Global Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Initialize Database & Start Server
const startServer = async () => {
  const isConnected = await connectDB();
  if (isConnected) {
    await seedDatabaseIfEmpty();
  }

  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`Ã°Å¸Å¡â‚¬ SkillBridge Backend Server is LIVE!`);
    console.log(`Ã°Å¸Å’Â Server URL:        http://localhost:${PORT}`);
    console.log(`Ã°Å¸â€œÂ¡ API Health Check:  http://localhost:${PORT}/api/health`);
    console.log(`Database mode:        ${getMongoStatus() === 'connected' ? 'MongoDB (skillbridge)' : `local fallback (${getMongoStatus()})`}`);
    console.log(`======================================================\n`);
  });
};

startServer();
