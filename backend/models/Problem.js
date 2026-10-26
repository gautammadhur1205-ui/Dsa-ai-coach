const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  
  // UPDATED: 8 fixed DSA topics as per Synopsis Section 3
  topic: { 
    type: String, 
    required: true 
  },
  
  difficulty: { 
    type: String, 
    enum: ['Easy', 'Medium', 'Hard'], 
    required: true 
  },
  
  description: { type: String, required: true },

  // ADDED: Synopsis Section 4.2.1 & 4.2.2 (Input/Output format, Constraints & Tags)
  inputFormat: { type: String, default: '' },
  outputFormat: { type: String, default: '' },
  constraints: [{ type: String }], // e.g., ["1 <= N <= 10^5", "-10^9 <= arr[i] <= 10^9"]
  tags: [{ type: String }],        // e.g., ["Two Pointers", "Sliding Window"]

  // UPDATED: Added 'explanation' for sample test cases
  testCases: [
    {
      input: { type: String, required: true },
      output: { type: String, required: true },
      explanation: { type: String, default: '' }, // Sample test case samjhane ke liye
      isHidden: { type: Boolean, default: false }
    }
  ],

  // ADDED: Code Editor mein initial starter template dikhane ke liye
  starterCode: {
    cpp: { type: String, default: '// Write your C++ code here\n' },
    java: { type: String, default: '// Write your Java code here\n' },
    python: { type: String, default: '# Write your Python code here\n' },
    javascript: { type: String, default: '// Write your JavaScript code here\n' }
  },

  // ADDED: Phase 4 (Staged AI Hints & Complexity comparison ke liye)
  hints: [{ type: String }], // Staged hints (Hint 1: Conceptual, Hint 2: Approach, Hint 3: Logic)
  expectedComplexity: {
    time: { type: String, default: '' },  // e.g., "O(N)"
    space: { type: String, default: '' }  // e.g., "O(1)"
  },

  generatedByAI: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Problem', problemSchema);