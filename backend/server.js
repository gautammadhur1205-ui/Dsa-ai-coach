const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Test route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'Phase 1 & 2 Setup Completed' });
});

// Non-blocking connection (MongoDB na chalne par bhi server crash nahi hoga)
mongoose.connect('mongodb://127.0.0.1:27017/ai_prep_db', {
  serverSelectionTimeoutMS: 1500
})
.then(() => console.log('Database connected successfully'))
.catch(() => console.log('MongoDB locally run nahi ho raha, lekin server running hai'));

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});