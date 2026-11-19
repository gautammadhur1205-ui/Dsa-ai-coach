const express = require('express');
const router = express.Router();
const { askGemini } = require('./geminihelper');

// GET /api/ai/status  -> Gemini key + model sahi chal raha hai ya nahi, ek call mein test
router.get('/status', async (req, res) => {
  const hasKey = !!(process.env.GEMINI_API_KEY || '').trim();
  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const hasGroq = !!(process.env.GROQ_API_KEY || '').trim();
  const helperHasGroq = require('fs').readFileSync(require('path').join(__dirname, 'geminihelper.js'), 'utf8').includes('callGroq');

  // /api/ai/status?quick=1 -> AI call kiye bina turant config dikhata hai
  if (req.query.quick) {
    return res.json({ quick: true, hasKey, hasGroq, helperHasGroq, model });
  }

  try {
    const reply = await askGemini('Reply with exactly: {"pong": true}', { temperature: 0 });
    res.json({ ok: true, hasKey, hasGroq, helperHasGroq, model, reply });
  } catch (err) {
    res.status(502).json({ ok: false, hasKey, hasGroq, helperHasGroq, model, status: err.status || null, error: err.message });
  }
});

module.exports = router;