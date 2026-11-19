const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const Problem = require('./models/Problem');

// server.js wala hi DB name, taaki seed aur app same database use karein
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai_prep_db';

const JAVA_STARTER = 'class Solution {\n    // Write your solution method here\n}\n';

function getStagedHints(category) {
  const cat = (category || '').toLowerCase();
  const hints = [
    `Think about the core idea behind ${category} problems before writing code.`,
    'Consider boundary conditions and edge test cases.'
  ];

  if (cat.includes('array') || cat.includes('hashing')) {
    hints.push('Consider using HashMaps or frequency counters for O(N) lookup.');
  } else if (cat.includes('two pointers') || cat.includes('sliding window')) {
    hints.push('Maintain left and right boundaries or a running window state.');
  } else if (cat.includes('stack')) {
    hints.push('Use a LIFO stack to track pending elements or brackets.');
  } else if (cat.includes('binary search')) {
    hints.push('Apply binary search over a monotonic search space.');
  } else if (cat.includes('linked list')) {
    hints.push('Use dummy nodes or slow/fast pointers to manage links safely.');
  } else if (cat.includes('tree')) {
    hints.push('Use recursive DFS or level-order BFS traversal.');
  } else if (cat.includes('dynamic programming')) {
    hints.push('Identify subproblems and the state transition relation.');
  } else if (cat.includes('graph')) {
    hints.push('Represent connections as an adjacency list and run BFS/DFS or Union-Find.');
  } else {
    hints.push('Break the problem into smaller steps and look for a repeating pattern.');
  }
  return hints;
}

async function seedDatabase() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB:', MONGO_URI);

    // Sirf seeded (non-AI) problems delete honge, AI-generated bache rahenge
    const del = await Problem.deleteMany({ generatedByAI: { $ne: true } });
    console.log(`Cleared ${del.deletedCount} old seeded problems.`);

    const possiblePaths = [
      path.join(__dirname, 'neetcode-150-with-descriptions.json'),
      path.join(__dirname, '../neetcode-150-with-descriptions.json'),
      path.join(process.cwd(), 'neetcode-150-with-descriptions.json')
    ];
    const foundPath = possiblePaths.find((p) => fs.existsSync(p));

    if (!foundPath) {
      console.error('❌ neetcode-150-with-descriptions.json nahi mili. Pehle fetch_descriptions.py chalao.');
      process.exit(1);
    }

    console.log(`📄 Reading: ${foundPath}`);
    const items = JSON.parse(fs.readFileSync(foundPath, 'utf-8'));

    const missingDesc = [];

    const problemsToInsert = items.map((item) => {
      const category = item.category || item.topic || 'General';
      const hasDesc = item.description && item.description.trim().length > 0;
      if (!hasDesc) missingDesc.push(item.title);

      return {
        title: item.title,
        topic: category,
        difficulty: ['Easy', 'Medium', 'Hard'].includes(item.difficulty) ? item.difficulty : 'Medium',
        description: hasDesc
          ? item.description
          : `${item.title}\n\n(Description unavailable. Refer to: ${item.url || 'NeetCode'})`,
        inputFormat: 'Standard parameters as described in the problem statement',
        outputFormat: 'Return the computed result',
        constraints: ['Refer to the problem statement'],
        tags: [category, item.difficulty, 'NeetCode 150'].filter(Boolean),
        hints: getStagedHints(category),
        starterCode: { java: JAVA_STARTER },
        generatedByAI: false
      };
    });

    await Problem.insertMany(problemsToInsert);
    console.log(`✅ Seeded ${problemsToInsert.length} problems.`);

    if (missingDesc.length) {
      console.log(`\n⚠️  ${missingDesc.length} problems ka description nahi mila:`);
      missingDesc.forEach((t) => console.log('   -', t));
      console.log('fetch_descriptions.py dobara chalao, ye resume karke sirf inhe fetch karega.');
    }

    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seedDatabase();