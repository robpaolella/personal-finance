import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db, sqlite } from './db/index.js';
import { authenticate } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import accountRoutes from './routes/accounts.js';
import categoryRoutes from './routes/categories.js';
import userRoutes from './routes/users.js';
import transactionRoutes from './routes/transactions.js';

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
app.use('/api/accounts', accountRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/transactions', transactionRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export { app, db };
