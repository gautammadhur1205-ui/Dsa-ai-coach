const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  
  // UPDATED SECTION: Added fields for Phase 3 (Topics/Solved List) & Phase 5 (Dashboard/Gamification)
  progress: {
    solvedCount: { type: Number, default: 0 },
    totalSubmissions: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 }, // Overall accuracy percentage
    score: { type: Number, default: 0 },    // For Gamification Leaderboard
    streak: { type: Number, default: 0 },
    lastSolvedDate: { type: Date, default: null }, // Streak track karne ke liye

    // Kaun-kaun se problems solve ho chuke hain (Duplicate count rokne ke liye)
    solvedProblems: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Problem'
      }
    ],

    // 8 Core DSA Topics ki topic-wise progress (Dashboard & Weak Area detection ke liye)
    topicStats: {
      Array: { solved: { type: Number, default: 0 }, attempted: { type: Number, default: 0 } },
      String: { solved: { type: Number, default: 0 }, attempted: { type: Number, default: 0 } },
      LinkedList: { solved: { type: Number, default: 0 }, attempted: { type: Number, default: 0 } },
      Stack: { solved: { type: Number, default: 0 }, attempted: { type: Number, default: 0 } },
      Queue: { solved: { type: Number, default: 0 }, attempted: { type: Number, default: 0 } },
      Tree: { solved: { type: Number, default: 0 }, attempted: { type: Number, default: 0 } },
      Graph: { solved: { type: Number, default: 0 }, attempted: { type: Number, default: 0 } },
      DynamicProgramming: { solved: { type: Number, default: 0 }, attempted: { type: Number, default: 0 } }
    }
  },
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);