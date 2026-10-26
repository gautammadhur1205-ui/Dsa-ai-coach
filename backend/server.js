const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const executionRoutes =require('./executionRoutes');

const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const authRoutes = require('./models/authroutes');
const problemRoutes = require('./models/problemroutes');


app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'Phase 3 Backend Running Smoothly' });
});

app.use('/api/auth', authRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api', executionRoutes);

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai_prep_db';

// Yahan `err.message` daal diya hai taaki asali error dikhe
mongoose.connect(MONGO_URI)
.then(() => console.log('✅ Database connected successfully'))
.catch((err) => console.log('❌ MongoDB Connection Error Details:', err.message));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});