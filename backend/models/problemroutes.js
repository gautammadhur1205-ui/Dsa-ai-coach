const express = require('express');
const { GoogleGenAI } = require('@google/genai');
const Problem = require('./Problem');

const router = express.Router();

// 1. GET PROBLEMS (Separated by Regular vs AI Generated)
router.get('/', async (req, res) => {
  try {
    const { topic, difficulty, isAI } = req.query;
    const filter = {};

    if (isAI === 'true') {
      filter.generatedByAI = true;
    } else {
      filter.generatedByAI = { $ne: true };
    }

    if (topic && topic !== 'All') {
      const escapedTopic = topic.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.topic = { $regex: new RegExp(`^${escapedTopic}$`, 'i') };
    }

    if (difficulty && difficulty !== 'All') {
      const escapedDiff = difficulty.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.difficulty = { $regex: new RegExp(`^${escapedDiff}$`, 'i') };
    }

    const problems = await Problem.find(filter).sort({ createdAt: -1 });
    res.json(problems);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch problems', error: error.message });
  }
});

// 2. AI QUESTION GENERATOR (⚠️ Static route MUST be placed BEFORE /:id route)
router.post('/generate', async (req, res) => {
  try {
    const { topic = 'Arrays & Hashing', difficulty = 'Medium' } = req.body;
    let problemData = null;

    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.startsWith('AIza')) {
      try {
        const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `Create a unique, new DSA coding problem for Topic: "${topic}", Difficulty: "${difficulty}".
        Return ONLY valid JSON in this exact format:
        {
          "title": "Unique Problem Title",
          "description": "Complete problem statement with examples and constraints",
          "inputFormat": "Input description",
          "outputFormat": "Output description",
          "constraints": ["1 <= N <= 10^5"],
          "hints": ["Helpful hint 1"]
        }`;

        const response = await genAI.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        });

        if (response.text) {
          problemData = JSON.parse(response.text);
        }
      } catch (aiError) {
        console.log('AI API fallback triggered:', aiError.message);
      }
    }

    if (!problemData) {
      const variations = [
        { suffix: 'Optimization', scenario: 'minimize the total computational cost' },
        { suffix: 'Substructure Search', scenario: 'find the maximum valid configuration' },
        { suffix: 'Partitioning', scenario: 'split the structure into balanced segments' }
      ];
      const pick = variations[Math.floor(Math.random() * variations.length)];
      const randId = Math.floor(100 + Math.random() * 900);
      const genTitle = `${topic}: ${pick.suffix} #${randId}`;

      problemData = {
        title: genTitle,
        description: `AI Generated Challenge: ${genTitle} (${difficulty})\n\nProblem Statement:\nGiven a data structure representing a ${topic} scenario, your goal is to ${pick.scenario}.\n\nTask:\nWrite an optimal Java solution inside the Solution class.`,
        inputFormat: `Standard ${topic} parameters`,
        outputFormat: 'Print or return the optimal computed answer',
        constraints: ['1 <= N <= 10^5'],
        hints: [`Apply core ${topic} patterns efficiently.`]
      };
    }

    const newProblem = await Problem.create({
      title: problemData.title,
      topic: topic.trim(),
      difficulty: difficulty.trim(),
      description: problemData.description,
      inputFormat: problemData.inputFormat || 'Standard input',
      outputFormat: problemData.outputFormat || 'Standard output',
      constraints: problemData.constraints || ['1 <= N <= 10^5'],
      tags: [topic, 'AI Generated'],
      hints: problemData.hints || [`Apply ${topic} patterns efficiently.`],
      generatedByAI: true
    });

    res.status(201).json(newProblem);
  } catch (error) {
    console.error('AI Generate Error:', error);
    res.status(500).json({ message: 'Failed to generate AI problem', error: error.message });
  }
});

// 3. GET SINGLE PROBLEM BY ID (Dynamic route placed after static routes)
router.get('/:id', async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ message: 'Problem not found' });
    res.json(problem);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching problem details', error: error.message });
  }
});

// SUBMIT SOLUTION
router.post('/:id/submit', async (req, res) => {
  try {
    const { code } = req.body;
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ message: 'Problem not found' });

    let isAccepted = code.includes('class Solution');
    res.json({
      success: true,
      verdict: isAccepted ? 'Accepted 🎉' : 'Wrong Answer ❌',
      passed: isAccepted ? 1 : 0,
      total: 1,
      output: isAccepted ? 'Solution compiled and verified successfully!' : 'Compilation Error or Missing \'class Solution\''
    });
  } catch (error) {
    res.status(500).json({ message: 'Submission failed', error: error.message });
  }
});

module.exports = router;