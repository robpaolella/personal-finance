import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db, sqlite } from './db/index.js';
import { authenticate } from './middleware/auth.js';
import authRoutes from './routes/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Auth middleware — applied to all /api/* routes
app.use('/api', authenticate);

// Routes
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export { app, db };
