import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5001/api',
});

// Attach Token automatically if logged in
API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

const TOPICS = [
  'Array',
  'Arrays & Hashing',
  'Two Pointers',
  'Sliding Window',
  'Stack',
  'Binary Search',
  'Linked List',
  'Trees',
  'Tries',
  'Backtracking',
  'Heap / Priority Queue',
  'Graphs',
  'Advanced Graphs',
  '1-D Dynamic Programming',
  '2-D Dynamic Programming',
  'Greedy',
  'Intervals',
  'Math & Geometry',
  'Bit Manipulation'
];

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // Navigation & Filtering States
  const [activeTab, setActiveTab] = useState('practice'); // 'practice' (Standard Qs) or 'ai-problems' (AI Generated Qs)
  const [selectedTopic, setSelectedTopic] = useState('Arrays & Hashing');
  const [selectedDifficulty, setSelectedDifficulty] = useState('Easy');
  const [problems, setProblems] = useState([]);
  const [activeProblem, setActiveProblem] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verdictResult, setVerdictResult] = useState(null);
  const [showHint, setShowHint] = useState(false);

  // 🚀 Code Execution States
  const [userCode, setUserCode] = useState(
`public class Solution {
    public static void main(String[] args) {
        System.out.println("Hello, DSA Platform!");
    }
}`
  );
  const [output, setOutput] = useState('');
  const [executing, setExecuting] = useState(false);

  // Fetch problems when logged in, filters change, or tab switches
  useEffect(() => {
    if (token) {
      fetchProblems();
    }
  }, [token, selectedTopic, selectedDifficulty, activeTab]);

  // Reset hint visibility when switching problems
  useEffect(() => {
    setShowHint(false);
  }, [activeProblem?._id]);

  const fetchProblems = async () => {
    try {
      const isAI = activeTab === 'ai-problems' ? 'true' : 'false';
      const res = await API.get(
        `/problems?topic=${encodeURIComponent(selectedTopic)}&difficulty=${encodeURIComponent(selectedDifficulty)}&isAI=${isAI}`
      );
      setProblems(res.data);
      
      // 🎯 FIXED: Automatically select the first problem whenever list updates
      if (res.data.length > 0) {
        handleSelectProblem(res.data[0]._id);
      } else {
        setActiveProblem(null);
      }
    } catch (err) {
      console.error('Failed to fetch problems', err);
    }
  };

  // 🎯 Fetch specific problem details from backend on click
  const handleSelectProblem = async (id) => {
    try {
      const res = await API.get(`/problems/${id}`);
      setActiveProblem(res.data);
    } catch (err) {
      console.error('Failed to fetch problem details', err);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const payload = isRegister ? { name, email, password } : { email, password };
      const res = await API.post(endpoint, payload);
      
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
    } catch (err) {
      alert(err.response?.data?.message || 'Authentication failed');
    }
  };

  const handleGenerateAI = async () => {
    setLoadingAI(true);
    try {
      const res = await API.post('/problems/generate', {
        topic: selectedTopic,
        difficulty: selectedDifficulty
      });
      alert('✨ AI Problem generated successfully!');
      
      setActiveTab('ai-problems');
      
      const resList = await API.get(
        `/problems?topic=${encodeURIComponent(selectedTopic)}&difficulty=${encodeURIComponent(selectedDifficulty)}&isAI=true`
      );
      setProblems(resList.data);
      if (resList.data.length > 0) {
        handleSelectProblem(resList.data[0]._id);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        setToken('');
        alert('Your session has expired. Please log in again.');
        return;
      }
      alert(err.response?.data?.error || err.response?.data?.message || 'AI Generation failed');
    } finally {
      setLoadingAI(false);
    }
  };

  // 🚀 Local Java Compiler Execution Handler
  const handleRunCode = async () => {
    setExecuting(true);
    setOutput('');

    try {
      const res = await API.post('/execute', {
        language: 'java',
        code: userCode,
        input: ''
      });

      if (res.data.success) {
        setOutput(res.data.stderr || res.data.output || 'Code executed successfully with no output.');
      } else {
        setOutput('Error: ' + res.data.error);
      }
    } catch (err) {
      console.error('Execution failed:', err);
      setOutput('Server se connect nahi ho paya!');
    } finally {
      setExecuting(false);
    }
  };

  const handleSubmitCode = async () => {
    if (!activeProblem) return;
    setSubmitting(true);
    setVerdictResult(null);

    try {
      const res = await API.post(`/problems/${activeProblem._id}/submit`, {
        language: 'java',
        code: userCode
      });
      setVerdictResult(res.data);
      setOutput(`VERDICT: ${res.data.verdict}\nPassed: ${res.data.passed}/${res.data.total}\n${res.data.output}`);
    } catch (err) {
      console.error('Submission failed:', err);
      setOutput('Submission server error!');
    } finally {
      setSubmitting(false);
    }
  };

  // If not logged in, show Auth Screen
  if (!token) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9', fontFamily: 'system-ui, sans-serif' }}>
        <form onSubmit={handleAuth} style={{ background: '#fff', padding: '32px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '380px' }}>
          <h2 style={{ margin: '0 0 20px', color: '#0f172a', textAlign: 'center' }}>DSA AI Coach — {isRegister ? 'Register' : 'Login'}</h2>
          {isRegister && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '6px' }}>Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>
          )}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '6px' }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '6px' }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
          </div>
          <button type="submit" style={{ width: '100%', padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            {isRegister ? 'Sign Up' : 'Login'}
          </button>
          <p onClick={() => setIsRegister(!isRegister)} style={{ marginTop: '16px', textAlign: 'center', fontSize: '0.85rem', color: '#2563eb', cursor: 'pointer' }}>
            {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
          </p>
        </form>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif', backgroundColor: '#f1f5f9', textAlign: 'left' }}>
      {/* Sidebar */}
      <aside style={{ width: '240px', background: '#0f172a', color: '#fff', padding: '24px', boxSizing: 'border-box' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', letterSpacing: '0.5px' }}>DSA AI Coach</h3>
        
        <nav style={{ marginTop: '32px' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li 
              onClick={() => setActiveTab('practice')} 
              style={{ padding: '10px 14px', background: activeTab === 'practice' ? '#1e293b' : 'transparent', borderRadius: '6px', cursor: 'pointer' }}
            >
              Dashboard & Practice
            </li>
            <li 
              onClick={() => setActiveTab('ai-problems')} 
              style={{ padding: '10px 14px', background: activeTab === 'ai-problems' ? '#1e293b' : 'transparent', color: activeTab === 'ai-problems' ? '#fff' : '#94a3b8', borderRadius: '6px', cursor: 'pointer' }}
            >
              Problem Sets (AI Qs)
            </li>
            <li style={{ padding: '10px 14px', color: '#f87171', cursor: 'pointer', marginTop: '40px' }} onClick={() => { localStorage.removeItem('token'); setToken(''); }}>Logout</li>
          </ul>
        </nav>
      </aside>

      {/* Main Content Dashboard */}
      <main style={{ flex: 1, padding: '32px', overflowY: 'auto', boxSizing: 'border-box' }}>
        <header style={{ borderBottom: '1px solid #cbd5e1', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, color: '#1e293b' }}>
              {activeTab === 'practice' ? 'Student Performance Dashboard & Practice' : 'AI Generated Problem Sets'}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <select value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={selectedDifficulty} onChange={(e) => setSelectedDifficulty(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <button onClick={handleGenerateAI} disabled={loadingAI} style={{ padding: '8px 16px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              {loadingAI ? 'Generating...' : '✨ Generate AI Problem'}
            </button>
          </div>
        </header>

        {/* Metric Cards Grid */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginTop: '24px' }}>
          <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Problems Available</p>
            <h3 style={{ margin: '8px 0 0', fontSize: '1.8rem', color: '#0f172a' }}>{problems.length}</h3>
          </div>

          <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Current Topic Track</p>
            <h3 style={{ margin: '8px 0 0', fontSize: '1.4rem', color: '#2563eb' }}>{selectedTopic} ({selectedDifficulty})</h3>
          </div>
        </section>

        {/* Problem Workspace & List */}
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', marginTop: '28px' }}>
          {/* Problems List Column */}
          <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', height: '600px', overflowY: 'auto' }}>
            <h4 style={{ margin: '0 0 12px', color: '#1e293b' }}>
              {activeTab === 'practice' ? 'Standard Question Bank' : 'AI Generated List'}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {problems.map((p) => (
                <div 
                  key={p._id} 
                  onClick={() => handleSelectProblem(p._id)} 
                  style={{ 
                    padding: '12px', 
                    background: activeProblem?._id === p._id ? '#eff6ff' : '#f8fafc', 
                    border: activeProblem?._id === p._id ? '1px solid #3b82f6' : '1px solid #e2e8f0', 
                    borderRadius: '6px', 
                    cursor: 'pointer' 
                  }}
                >
                  <div style={{ fontWeight: '500', color: '#1e293b', fontSize: '0.95rem' }}>{p.title}</div>
                  {p.generatedByAI && <span style={{ fontSize: '0.7rem', background: '#ede9fe', color: '#7c3aed', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '4px' }}>AI Generated</span>}
                </div>
              ))}
              {problems.length === 0 && <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No problems found for this section.</p>}
            </div>
          </div>

          {/* Active Problem Description + Code Editor & Runner */}
          <div style={{ background: '#fff', padding: '24px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', height: '600px', overflowY: 'auto', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: '0 0 8px', color: '#0f172a' }}>{activeProblem ? activeProblem.title : "Select a Problem"}</h3>
                {activeProblem && (
                  <button 
                    onClick={() => setShowHint(!showHint)} 
                    style={{ background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    {showHint ? '🙈 Hide Hint' : '💡 Get AI Hint'}
                  </button>
                )}
              </div>

              <p style={{ color: '#334155', lineHeight: '1.5', marginBottom: '12px', fontSize: '0.95rem', whiteSpace: 'pre-line' }}>
                {activeProblem ? activeProblem.description : "Left side list se koi problem select karein."}
              </p>

              {/* 💡 AI Hint Box */}
              {showHint && activeProblem && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '12px 16px', borderRadius: '8px', color: '#92400e', fontSize: '0.9rem', marginBottom: '10px' }}>
                  <strong>💡 AI Hint:</strong>
                  <p style={{ margin: '6px 0 0' }}>
                    {activeProblem.hints?.[0] || `Think about utilizing optimal ${activeProblem.topic || 'algorithmic'} data structures to reduce time and space complexity.`}
                  </p>
                </div>
              )}
            </div>

            {/* 🚀 Code Editor Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>Java Solution Editor</label>
              <textarea 
                value={userCode}
                onChange={(e) => setUserCode(e.target.value)}
                rows={10}
                style={{ 
                  width: '100%', 
                  background: '#0f172a', 
                  color: '#f8fafc', 
                  fontFamily: 'monospace', 
                  fontSize: '13px', 
                  padding: '12px', 
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  boxSizing: 'border-box'
                }}
              />

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={handleRunCode}
                  disabled={executing}
                  style={{ 
                    padding: '10px 16px', 
                    background: '#3b82f6', 
                    color: '#fff', 
                    border: 'none', 
                    borderRadius: '6px', 
                    fontWeight: 'bold', 
                    cursor: 'pointer'
                  }}
                >
                  {executing ? 'Running...' : '▶ Run Code'}
                </button>

                <button 
                  onClick={handleSubmitCode}
                  disabled={submitting}
                  style={{ 
                    padding: '10px 16px', 
                    background: '#10b981', 
                    color: '#fff', 
                    border: 'none', 
                    borderRadius: '6px', 
                    fontWeight: 'bold', 
                    cursor: 'pointer'
                  }}
                >
                  {submitting ? 'Evaluating...' : '🚀 Submit Solution'}
                </button>
              </div>

              {/* Output Terminal */}
              <div style={{ background: '#0f172a', padding: '12px', borderRadius: '6px', color: '#38bdf8', fontFamily: 'monospace', fontSize: '0.85rem', minHeight: '80px', maxHeight: '120px', overflowY: 'auto' }}>
                <div style={{ color: '#94a3b8', marginBottom: '4px', fontSize: '0.75rem' }}>OUTPUT CONSOLE:</div>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{output || 'Click "Run Code" or "Submit Solution" to execute your solution...'}</pre>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}