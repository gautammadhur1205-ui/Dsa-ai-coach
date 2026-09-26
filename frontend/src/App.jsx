import React from 'react';

export default function App() {
  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif', backgroundColor: '#f1f5f9' }}>
      {/* Sidebar Wireframe */}
      <aside style={{ width: '240px', background: '#0f172a', color: '#fff', padding: '24px' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', letterSpacing: '0.5px' }}>DSA AI Coach</h3>
        
        <nav style={{ marginTop: '32px' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li style={{ padding: '10px 14px', background: '#1e293b', borderRadius: '6px', cursor: 'pointer' }}>Dashboard</li>
            <li style={{ padding: '10px 14px', color: '#94a3b8', cursor: 'pointer' }}>Problem Sets</li>
            <li style={{ padding: '10px 14px', color: '#94a3b8', cursor: 'pointer' }}>Mock Interview</li>
            <li style={{ padding: '10px 14px', color: '#94a3b8', cursor: 'pointer' }}>Analytics</li>
          </ul>
        </nav>
      </aside>

      {/* Main Content Dashboard */}
      <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        <header style={{ borderBottom: '1px solid #cbd5e1', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, color: '#1e293b' }}>Student Performance Dashboard</h2>
          </div>
        </header>

        {/* Metric Cards Grid */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginTop: '24px' }}>
          <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Problems Solved</p>
            <h3 style={{ margin: '8px 0 0', fontSize: '1.8rem', color: '#0f172a' }}>0 / 150</h3>
          </div>

          <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Current Track</p>
            <h3 style={{ margin: '8px 0 0', fontSize: '1.4rem', color: '#2563eb' }}>Arrays & Strings</h3>
          </div>

          <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>AI Readiness Score</p>
            <h3 style={{ margin: '8px 0 0', fontSize: '1.8rem', color: '#10b981' }}>--%</h3>
          </div>
        </section>

        {/* Code Workspace Wireframe Placeholder */}
        <section style={{ marginTop: '28px', background: '#fff', padding: '24px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h4 style={{ margin: '0 0 12px', color: '#1e293b' }}>Interactive Workspace (Week 5 Target)</h4>
          <div style={{ height: '180px', border: '2px dashed #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            Problem Description & AI Code Editor will mount here
          </div>
        </section>
      </main>
    </div>
  );
}