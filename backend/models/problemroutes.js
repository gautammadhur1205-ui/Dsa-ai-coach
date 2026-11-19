const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { exec } = require('child_process');
const Problem = require('./Problem');
const { askGemini } = require('../geminihelper');

const router = express.Router();

const VALID_DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const normalizeDifficulty = (d = 'Medium') => {
  const found = VALID_DIFFICULTIES.find((v) => v.toLowerCase() === String(d).trim().toLowerCase());
  return found || 'Medium';
};

// ---------- Static Big-O analyzer (AI fail hone pe fallback) ----------
function analyzeJavaCodeStatically(javaCode) {
  const cleanCode = javaCode.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');
  const nestedLoopRegex = /\b(for|while)\s*\([^{]*\{(?:[^{}]|\{[^{}]*\})*\b(for|while)\s*\(/s;
  const loopMatches = cleanCode.match(/\b(for|while)\s*\(/g) || [];
  const hasSorting = cleanCode.includes('Arrays.sort') || cleanCode.includes('Collections.sort');
  const usesLinearSpace =
    /HashMap|HashSet|ArrayList|toCharArray/.test(cleanCode) ||
    /new\s+(boolean|int|char|String|long|double)\s*\[[^\]]*[a-zA-Z]/.test(cleanCode);

  let timeComplexity = 'O(N)';
  const spaceComplexity = usesLinearSpace ? 'O(N)' : 'O(1)';
  let feedback = usesLinearSpace
    ? 'Runs in linear O(N) time using O(N) auxiliary space.'
    : 'Optimal O(N) time and O(1) auxiliary space solution!';

  if (nestedLoopRegex.test(cleanCode)) {
    timeComplexity = 'O(N^2)';
    feedback = 'Nested loops give O(N^2) time. Try a HashMap or frequency array to bring it down to O(N).';
  } else if (hasSorting) {
    timeComplexity = 'O(N log N)';
    feedback = 'Sorting takes O(N log N). A HashMap or counting array may reduce it to O(N).';
  } else if (loopMatches.length === 0) {
    timeComplexity = 'O(1)';
  }
  return { timeComplexity, spaceComplexity, feedback };
}

// ---------- Java compile check (sirf compile, run nahi) ----------
function compileJava(code) {
  return new Promise((resolve) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'submit-'));
    fs.writeFileSync(path.join(dir, 'Solution.java'), code);
    exec('javac Solution.java', { cwd: dir, timeout: 8000 }, (err, stdout, stderr) => {
      fs.rmSync(dir, { recursive: true, force: true });
      resolve(err ? { ok: false, error: (stderr || err.message).trim() } : { ok: true });
    });
  });
}

// 1. GET PROBLEMS
router.get('/', async (req, res) => {
  try {
    const { topic, difficulty, isAI } = req.query;
    const filter = {};

    filter.generatedByAI = isAI === 'true' ? true : { $ne: true };

    if (topic && topic !== 'All') {
      const t = topic.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.topic = { $regex: new RegExp(`^${t}$`, 'i') };
    }
    if (difficulty && difficulty !== 'All') {
      const d = difficulty.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.difficulty = { $regex: new RegExp(`^${d}$`, 'i') };
    }

    const problems = await Problem.find(filter).sort({ createdAt: -1 });
    res.json(problems);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch problems', error: error.message });
  }
});

// 2. AI QUESTION GENERATOR
router.post('/generate', async (req, res) => {
  try {
    const topic = (req.body.topic || 'Arrays & Hashing').trim();
    const difficulty = normalizeDifficulty(req.body.difficulty);

    // Repeat se bachne ke liye pichle titles bhejo
    const previous = await Problem.find({ topic, generatedByAI: true })
      .sort({ createdAt: -1 })
      .limit(15)
      .select('title');
    const prevTitles = previous.map((p) => p.title);

    let problemData = null;
    let usedFallback = false;

    try {
      const prompt = `You are a DSA problem setter. Create ONE new coding problem.
Topic: "${topic}"
Difficulty: "${difficulty}"
Language of solution: Java (class Solution with one public method).

Do NOT repeat or closely resemble these existing titles: ${JSON.stringify(prevTitles)}

Rules:
- Clear statement with 2 examples and constraints.
- Exactly one correct answer per input.
- "hints" must be exactly 3 staged hints: [conceptual nudge, approach direction, near-solution logic]. None of them may contain code.
- "testCases": 3 items, outputs must be correct.
- "starterCode": Java class Solution with method signature and empty body.

Return ONLY JSON:
{
  "title": "...",
  "description": "...",
  "inputFormat": "...",
  "outputFormat": "...",
  "constraints": ["..."],
  "hints": ["...", "...", "..."],
  "testCases": [{"input": "...", "output": "...", "explanation": "..."}],
  "starterCode": "class Solution {\\n  ...\\n}",
  "expectedTime": "O(...)",
  "expectedSpace": "O(...)"
}`;
      problemData = await askGemini(prompt, { temperature: 0.8 });
      if (!problemData.title || !problemData.description) throw new Error('Incomplete AI problem');
    } catch (aiError) {
      console.error('GENERATE fallback used:', aiError.message);
      usedFallback = true;
      const randId = Math.floor(100 + Math.random() * 900);
      problemData = {
        title: `${topic}: Practice Challenge #${randId}`,
        description: `Practice problem on ${topic} (${difficulty}).\n\n(AI service unavailable, this is a placeholder. Try generating again.)`,
        constraints: ['1 <= N <= 10^5'],
        hints: [`Think about the core ${topic} pattern.`, 'Consider edge cases.', 'Aim for linear time.']
      };
    }

    // AI fail hua to placeholder DB mein save mat karo, user ko error dikhao
    if (usedFallback) {
      return res.status(503).json({
        message: 'AI abhi busy hai ya available nahi hai. Thodi der baad dobara try karo.'
      });
    }

    const newProblem = await Problem.create({
      title: problemData.title,
      topic,
      difficulty,
      description: problemData.description,
      inputFormat: problemData.inputFormat || 'Standard input',
      outputFormat: problemData.outputFormat || 'Standard output',
      constraints: problemData.constraints || ['1 <= N <= 10^5'],
      tags: [topic, 'AI Generated'],
      hints: problemData.hints || [],
      testCases: (problemData.testCases || []).filter((t) => t.input && t.output),
      starterCode: problemData.starterCode ? { java: problemData.starterCode } : undefined,
      expectedComplexity: {
        time: problemData.expectedTime || '',
        space: problemData.expectedSpace || ''
      },
      generatedByAI: true
    });

    res.status(201).json({ ...newProblem.toObject(), usedFallback });
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate AI problem', error: error.message });
  }
});

// 3. GET SINGLE PROBLEM
router.get('/:id', async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ message: 'Problem not found' });
    res.json(problem);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching problem details', error: error.message });
  }
});

// 4. SUBMIT: compile check + AI/static complexity analysis
router.post('/:id/submit', async (req, res) => {
  try {
    const { code } = req.body;
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ message: 'Problem not found' });
    if (!code || !code.includes('class Solution')) {
      return res.json({
        success: false,
        verdict: 'Compilation Error ❌',
        passed: 0,
        total: 1,
        output: "Compilation Error: Missing 'class Solution'"
      });
    }

    const compiled = await compileJava(code);
    if (!compiled.ok) {
      return res.json({
        success: false,
        verdict: 'Compilation Error ❌',
        passed: 0,
        total: 1,
        output: compiled.error
      });
    }

    let analysis = analyzeJavaCodeStatically(code);
    let aiUsed = false;

    try {
      const ai = await askGemini(
        `You are a strict Big-O analyzer. Problem: "${problem.title}".
Compute the ACTUAL time and space complexity of the Java code below (nested loops = O(N^2), sorting = O(N log N), extra HashMap/array = O(N) space). Do not return the ideal complexity.
Return ONLY JSON: {"timeComplexity":"O(...)","spaceComplexity":"O(...)","feedback":"1-2 sentences"}

Code:
${code}`,
        { temperature: 0.2 }
      );
      if (ai.timeComplexity) analysis.timeComplexity = ai.timeComplexity;
      if (ai.spaceComplexity) analysis.spaceComplexity = ai.spaceComplexity;
      if (ai.feedback) analysis.feedback = ai.feedback;
      aiUsed = true;
    } catch (e) {
      console.error('SUBMIT: using static analysis only:', e.message);
    }

    const output = `VERDICT: Compiled Successfully ✅
----------------------------------
⏱️ Time Complexity:  ${analysis.timeComplexity}
📦 Space Complexity: ${analysis.spaceComplexity}
💡 Feedback:         ${analysis.feedback}
(${aiUsed ? 'Analysed by AI' : 'Analysed by static analyzer'})`;

    res.json({
      success: true,
      verdict: 'Accepted 🎉',
      passed: 1,
      total: 1,
      analysis,
      output
    });
  } catch (error) {
    res.status(500).json({ message: 'Submission failed', error: error.message });
  }
});

// 5. HINT (level 1/2/3, code-aware, no answer leak)
router.post('/:id/hint', async (req, res) => {
  try {
    const { code = '' } = req.body;
    const level = Math.min(3, Math.max(1, parseInt(req.body.level, 10) || 1));
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ message: 'Problem not found' });

    const levelGuide = {
      1: 'Level 1: only a conceptual nudge. Do not mention any specific data structure or algorithm.',
      2: 'Level 2: suggest the general approach or data structure type, without steps.',
      3: 'Level 3: describe the key logic step by step in words, but write NO code.'
    }[level];

    // Fallback: DB mein stored staged hint
    let hint = problem.hints[level - 1] || problem.hints[0] || 'Re-read the constraints and think about edge cases.';
    let source = 'stored';

    try {
      const ai = await askGemini(
        `You are a DSA mentor helping a student.
Problem: "${problem.title}" (${problem.topic}, ${problem.difficulty})
Description: ${problem.description}
Constraints: ${JSON.stringify(problem.constraints)}

Student's current code:
${code || '(nothing written yet)'}

${levelGuide}
Rules:
- Max 2 sentences.
- Never write code or reveal the final answer.
- If their code has a bug or inefficiency, point to it as a guiding question.
Return ONLY JSON: {"hint":"..."}`,
        { temperature: 0.3 }
      );
      if (ai.hint) {
        hint = ai.hint;
        source = 'ai';
      }
    } catch (e) {
      console.error('HINT fallback to stored hint:', e.message);
    }

    res.json({ success: true, hint, level, source });
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate hint', error: error.message });
  }
});

module.exports = router;