import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';

import orderRoutes from './routes/order.routes.js';
import revisionRoutes from './routes/revision.routes.js';
import adminRoutes from './routes/admin.routes.js';
import collectionRoutes from './routes/collection.routes.js';
import { globalLimiter } from './middleware/rateLimit.middleware.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet()); // Sets various HTTP headers for security
app.use(cors({
    origin: process.env.FRONTEND_URL || '*', // Restrict to frontend URL in production
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(globalLimiter); // Protect all routes from generic spam

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Handle standard form submissions if needed

// Bot Initialization
import { NotificationService } from './services/telegram.service.js';
const isProd = process.env.NODE_ENV === 'production';
const serverUrl = process.env.SERVER_URL; // e.g., https://kofi-backend.onrender.com

// Note: In production, we need to register the webhook callback route
const setupBot = async () => {
    const middleware = await NotificationService.initBot(isProd ? serverUrl : undefined);
    if (isProd && middleware) {
        app.use(middleware);
    }
};
setupBot();

// Routes
app.use('/api/orders', orderRoutes);
app.use('/api/revisions', revisionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/collections', collectionRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Database Connection & Server Start
const startServer = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI must be provided in environment variables');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
