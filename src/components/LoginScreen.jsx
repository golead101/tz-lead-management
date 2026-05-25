import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';

export default function LoginScreen() {
  const { login } = useCRM();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [showDemoCreds, setShowDemoCreds] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    const success = login(email, password);
    if (!success) {
      setErrorMsg('❌ Invalid credentials. Please use the demo credentials below.');
    }
  };

  const handleQuickFill = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrorMsg('');
  };

  const demoAccounts = [
    { label: '🔥 Admin (Stefan)', email: 'admin', pass: 'admin', desc: 'Stefan Salvatore • Full access' },
    { label: '⚡ Manager (Damon)', email: 'manager', pass: 'manager', desc: 'Damon Salvatore • Medium access' },
    { label: '📞 Counselor (Elena)', email: 'counselor', pass: 'counselor', desc: 'Elena Gilbert • Queue access' }
  ];

  return (
    <div className="login-screen-wrapper">
      <div className="login-glass-card">
        {/* Brand Header */}
        <div className="login-brand-header">
          <div className="login-logo-orb">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          </div>
          <h2 className="login-brand-title">Lead Management</h2>
          <p className="login-brand-subtitle">Enterprise Admissions CRM Portal</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          {errorMsg && <div className="login-error-banner">{errorMsg}</div>}

          <div className="form-group">
            <label className="form-label">Username or Demo Email</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="e.g. admin or stefan@academy.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group mt-3">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="primary-btn w-full mt-4 justify-center" style={{ height: '42px', fontSize: '13.5px', fontWeight: '750' }}>
            Authenticate Session
          </button>
        </form>

        {/* Demo Credentials Section */}
        <div className="login-demo-panel">
          <button 
            type="button"
            className="login-demo-toggle-btn"
            onClick={() => setShowDemoCreds(!showDemoCreds)}
          >
            <span>✨ Click to Quick-Fill Demo Credentials</span>
            <svg 
              width="12" 
              height="12" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              viewBox="0 0 24 24"
              style={{ 
                transform: showDemoCreds ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform var(--transition-fast)'
              }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>

          {showDemoCreds && (
            <div className="login-demo-grid fade-in" style={{ marginTop: '8px' }}>
              {demoAccounts.map((account, idx) => (
                <button 
                  key={idx}
                  type="button" 
                  className="login-demo-pill"
                  onClick={() => handleQuickFill(account.email, account.pass)}
                >
                  <div style={{ fontWeight: '750', color: 'var(--primary)' }}>{account.label}</div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>{account.desc}</div>
                  <div style={{ fontSize: '9.5px', color: 'var(--text-secondary)', fontFamily: 'monospace', marginTop: '4px', background: 'rgba(0,0,0,0.03)', padding: '2px 4px', borderRadius: '4px' }}>
                    {account.email} / {account.pass}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
