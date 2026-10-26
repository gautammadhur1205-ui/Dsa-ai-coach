const mongoose = require('mongoose');
const Problem = require('./models/Problem');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/dsa-ai-coach');
    console.log('Connected to MongoDB for seeding fetched descriptions...');
    
    await Problem.deleteMany({});
    console.log('Cleared existing problem collection.');

    // 🎯 Check multiple possible locations for the JSON file automatically
    const possiblePaths = [
      path.join(__dirname, '../neetcode-150-with-descriptions.json'),
      path.join(__dirname, 'neetcode-150-with-descriptions.json'),
      path.join(process.cwd(), 'neetcode-150-with-descriptions.json'),
      path.join(process.cwd(), '../neetcode-150-with-descriptions.json'),
      path.join(__dirname, '../neetcode-150-list.json'),
      path.join(__dirname, 'neetcode-150-list.json')
    ];

    let foundPath = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        foundPath = p;
        break;
      }
    }

    if (!foundPath) {
      console.error('❌ JSON file not found in any expected directory!');
      process.exit(1);
    }

    console.log(`📄 Reading data from: ${foundPath}`);
    const items = JSON.parse(fs.readFileSync(foundPath, 'utf-8'));

    const problemsToInsert = items.map((item) => {
      let hints = [
        `Analyze the time and space complexity trade-offs for ${item.category || item.topic}.`,
        `Consider boundary conditions and edge test cases.`
      ];

      const cat = (item.category || item.topic || '').toLowerCase();
      if (cat.includes('array') || cat.includes('hashing')) {
        hints.push('Consider using HashMaps or Frequency Counters for O(N) lookup.');
      } else if (cat.includes('two pointers') || cat.includes('sliding window')) {
        hints.push('Maintain left and right boundaries or a running window state.');
      } else if (cat.includes('stack')) {
        hints.push('Utilize a LIFO stack to track pending elements or brackets.');
      } else if (cat.includes('binary search')) {
        hints.push('Apply binary search over a monotonic search space.');
      } else if (cat.includes('linked list')) {
        hints.push('Use dummy nodes or slow/fast pointers to manage pointer links safely.');
      } else if (cat.includes('trees')) {
        hints.push('Use recursive DFS or level-order BFS traversal.');
      } else if (cat.includes('dynamic programming')) {
        hints.push('Identify subproblems and state transition relations.');
      } else if (cat.includes('graphs')) {
        hints.push('Represent graph connections and run BFS/DFS or Union-Find.');
      }

      return {
        title: item.title,
        topic: item.category || item.topic,
        difficulty: item.difficulty || 'Medium',
        description: item.description || `Solve the ${item.title} problem efficiently.`,
        inputFormat: `Standard parameters as described in problem statement`,
        outputFormat: `Optimal computed result`,
        constraints: ['1 <= N <= 10^5', 'Optimal Time & Space'],
        tags: [item.category || item.topic, item.difficulty, 'NeetCode 150'],
        hints,
        generatedByAI: false
      };
    });

    await Problem.insertMany(problemsToInsert);
    console.log(`✅ Successfully seeded all ${problemsToInsert.length} questions into MongoDB!`);
    
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seedDatabase();