const { GoogleGenAI } = require('@google/genai');

const getKey = () => (process.env.GEMINI_API_KEY || '').replace(/['"]/g, '').trim();
const PRIMARY_MODEL = () => process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const FALLBACK_MODEL = () => (process.env.GEMINI_FALLBACK_MODEL || '').trim();

const GROQ_KEY = () => (process.env.GROQ_API_KEY || '').replace(/['"]/g, '').trim();
const GROQ_MODEL = () => process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

const CALL_TIMEOUT_MS = 12000; // har call ke liye max wait

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clean = (t) => (t || '').replace(/```json|```java|```/g, '').trim();
const isBusy = (err) =>
  err.status === 503 || err.status === 429 || err.code === 'TIMEOUT' ||
  /high demand|overloaded|unavailable|timeout/i.test(err.message || '');

// Promise ko time limit dena (Gemini hang ho to bhi aage badhe)
function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const e = new Error(`${label} timed out after ${ms / 1000}s`);
      e.code = 'TIMEOUT';
      reject(e);
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function callGemini(ai, model, prompt, json, temperature) {
  const response = await withTimeout(
    ai.models.generateContent({
      model,
      contents: prompt,
      config: { temperature, ...(json && { responseMimeType: 'application/json' }) }
    }),
    CALL_TIMEOUT_MS,
    `Gemini ${model}`
  );
  const text = clean(response.text);
  if (!text) throw new Error('Empty response from Gemini');
  return json ? JSON.parse(text) : text;
}

async function callGroq(prompt, json, temperature) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY()}` },
      body: JSON.stringify({
        model: GROQ_MODEL(),
        temperature,
        messages: [{ role: 'user', content: json ? prompt + '\n\nRespond with valid JSON only.' : prompt }],
        ...(json && { response_format: { type: 'json_object' } })
      })
    });
    if (!res.ok) {
      const err = new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 200)}`);
      err.status = res.status;
      throw err;
    }
    const data = await res.json();
    const text = clean(data.choices?.[0]?.message?.content);
    if (!text) throw new Error('Empty response from Groq');
    return json ? JSON.parse(text) : text;
  } catch (err) {
    if (err.name === 'AbortError') {
      const e = new Error(`Groq timed out after ${CALL_TIMEOUT_MS / 1000}s`);
      e.code = 'TIMEOUT';
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Order: Gemini primary (2 tries) -> Gemini fallback model (1 try) -> Groq (2 tries)
 * Har call par 12s ka time limit.
 */
async function askGemini(prompt, { json = true, temperature = 0.4 } = {}) {
  let lastErr;

  const apiKey = getKey();
  if (apiKey) {
    const ai = new GoogleGenAI({ apiKey });
    const plan = [
      { model: PRIMARY_MODEL(), attempts: 2 },
      { model: FALLBACK_MODEL(), attempts: 1 }
    ].filter((p) => p.model);

    for (const { model, attempts } of plan) {
      for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
          return await callGemini(ai, model, prompt, json, temperature);
        } catch (err) {
          lastErr = err;
          console.error(`GEMINI FAIL [${model}] attempt ${attempt}:`, err.status || err.code || '', (err.message || '').slice(0, 200));
          if (attempt < attempts && (isBusy(err) || err instanceof SyntaxError)) {
            await sleep(1500);
            continue;
          }
          break;
        }
      }
    }
  } else {
    lastErr = new Error('GEMINI_API_KEY missing in .env');
  }

  if (GROQ_KEY()) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log('Switching to Groq backup...');
        return await callGroq(prompt, json, temperature);
      } catch (err) {
        lastErr = err;
        console.error(`GROQ FAIL attempt ${attempt}:`, err.status || err.code || '', (err.message || '').slice(0, 200));
        if (err instanceof SyntaxError || isBusy(err)) {
          await sleep(1000);
          continue;
        }
        break;
      }
    }
  } else {
    console.log('Groq backup skipped: GROQ_API_KEY nahi mili');
  }

  throw lastErr;
}

module.exports = { askGemini };