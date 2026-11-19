const express = require('express');
const router = express.Router();
const fs = require('fs');
const os = require('os');
const path = require('path');
const { exec } = require('child_process');
const Problem = require('./models/Problem');
const { askGemini } = require('./geminihelper');

router.post('/execute', async (req, res) => {
  const { code, problemId } = req.body;
  if (!code) return res.status(400).json({ success: false, error: 'No code provided' });

  // Har request ka apna temp folder -> do users ek saath ho to clash nahi
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'run-'));
  const cleanup = () => fs.rmSync(dir, { recursive: true, force: true });

  try {
    let problem = null;
    if (problemId) {
      try { problem = await Problem.findById(problemId); } catch (_) { /* invalid id */ }
    }

    let executableCode = code;
    let entryClass = /class\s+Main\b/.test(code) ? 'Main' : 'Solution';

    if (!code.includes('public static void main')) {
      entryClass = 'Main';

      // Default runner (AI fail ho to)
      let runner = `
class Main {
    public static void main(String[] args) {
        System.out.println("Code compiled and ran successfully ✅");
        System.out.println("(No test runner available, AI was unreachable.)");
    }
}`;

      try {
        // Agar problem mein saved testCases hain to AI ko wahi do (sahi expected output)
        const savedTests = problem && problem.testCases && problem.testCases.length
          ? `Use exactly these test cases: ${JSON.stringify(problem.testCases.map(t => ({ input: t.input, output: t.output })))}`
          : 'Create 2 simple test cases yourself.';

        const aiText = await askGemini(
          `You are a Java test runner generator.
Problem: "${problem ? problem.title : 'DSA Problem'}"
Description: "${problem ? problem.description : ''}"

User's code:
${code}

Write a NON-public Java class named 'Main' with 'public static void main(String[] args)' that calls the user's 'Solution' class method.
${savedTests}
For each test print: Test N: input, expected, actual, PASSED or FAILED.
Do NOT include imports inside Main (use fully qualified names like java.util.Arrays).
Return ONLY raw Java code for class Main, no markdown.`,
          { json: false, temperature: 0.2 }
        );
        if (aiText.includes('class Main')) runner = aiText;
      } catch (e) {
        console.error('EXECUTE: using default runner:', e.message);
      }

      executableCode = code + '\n\n' + runner;
    }

    fs.writeFileSync(path.join(dir, 'Solution.java'), executableCode);

    exec(
      `javac Solution.java && java ${entryClass}`,
      { cwd: dir, timeout: 8000 },
      (error, stdout, stderr) => {
        cleanup();
        if (error) {
          return res.json({
            success: true,
            output: stdout ? stdout.trim() : '',
            stderr: error.killed ? 'Time Limit Exceeded ⏱️' : (stderr || error.message)
          });
        }
        res.json({ success: true, output: stdout.trim(), stderr });
      }
    );
  } catch (err) {
    cleanup();
    console.error('EXECUTE error:', err);
    res.status(500).json({ success: false, error: 'Server internal execution failed.' });
  }
});

module.exports = router;