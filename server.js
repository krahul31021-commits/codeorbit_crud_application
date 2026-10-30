const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const { initDb } = require('./db/fileDb');
const authRoutes = require('./routes/auth');
const notesRoutes = require('./routes/notes');
const filesRoutes = require('./routes/files');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize file database
initDb();

// Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
const publicDir = path.join(process.cwd(), 'public');
app.use(express.static(publicDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/files', filesRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'OrbitVault Auth & Dashboard API',
    serverless: Boolean(process.env.VERCEL),
  });
});

// Fallback to index.html for non-API GET requests
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    const indexPath = path.join(publicDir, 'index.html');
    return res.sendFile(indexPath);
  }
  next();
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    message: 'An unexpected internal server error occurred.',
  });
});

// Only listen locally if NOT running in Vercel serverless environment
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 OrbitVault Server is active!`);
    console.log(`🌐 Local URL: http://localhost:${PORT}`);
    console.log(`🔐 Storage: JSON Flat-File DB`);
    console.log(`===============================================`);
  });
}

module.exports = app;
