import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';

export default function LoginScreen() {
  const { login, branding } = useCRM();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [showDemoCreds, setShowDemoCreds] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    const res = login(email, password);
    if (res === true || (res && res.success)) {
      // Login success
    } else {
      const reason = res && res.reason;
      if (reason === 'deactivated') {
        setErrorMsg('❌ This account has been deactivated. Please contact an Admin.');
      } else {
        setErrorMsg('❌ Invalid credentials. Please use the demo credentials below.');
      }
    }
  };

  const handleQuickFill = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrorMsg('');
  };

  const demoAccounts = [
    { label: '🔥 Admin (Stefan)', email: 'admin', pass: 'admin', desc: 'Stefan Salvatore • Full access' },
    { label: '⚡ Manager (Irfan)', email: 'manager', pass: 'manager', desc: 'Irfan • Medium access' },
    { label: '📞 Counselor (Maha)', email: 'counselor', pass: 'counselor', desc: 'Maha • Queue access' }
  ];

  return (
    <div className="login-screen-wrapper">
      <div className="login-split-layout">
        {/* Left Side: Branded Identity Panel */}
        <div className="login-brand-panel" style={{ background: 'var(--sidebar-bg, #0A1E44)', color: 'var(--sidebar-text, #ffffff)' }}>
          <div className="login-brand-logo-area">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt={branding.instituteName} className="brand-logo-img" style={{ maxHeight: '42px', objectFit: 'contain' }} />
            ) : (
              <div className="brand-logo" style={{ color: 'var(--sidebar-active-bg, #2F6BFF)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <h1 className="brand-name" style={{ fontSize: '19px', fontWeight: '800', margin: 0, color: 'var(--sidebar-text, #ffffff)', display: 'flex', alignItems: 'center' }}>
                  {branding.instituteName === 'TechZone Academy' ? (
                    <>TechZone<span style={{ color: 'var(--sidebar-active-bg, #2F6BFF)' }}>Academy</span></>
                  ) : branding.instituteName === 'LeadCRM' ? (
                    <>Lead<span style={{ color: 'var(--sidebar-active-bg, #2F6BFF)' }}>CRM</span></>
                  ) : (
                    branding.instituteName
                  )}
                </h1>
              </div>
            )}
          </div>
          
          <div className="login-brand-hero">
            <span className="login-badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--sidebar-active-bg, #2F6BFF)', border: '1px solid rgba(255,255,255,0.1)' }}>Admissions Portal</span>
            <h2 className="login-hero-title">Streamline Student Admissions & Inquiries</h2>
            <p className="login-hero-subtitle">Experience a premium, unified CRM workspace engineered to convert high-intent prospects into enrolled graduates in real-time.</p>
          </div>

          <div className="login-brand-footer">
            © 2026 {branding.instituteName}. Powered by Antigravity CRM.
          </div>
        </div>

        {/* Right Side: White Forms Panel */}
        <div className="login-form-panel">
          <div className="login-form-container">
            <div className="login-form-header">
              <h2 className="login-form-title">Welcome Back</h2>
              <p className="login-form-subtitle">Enter your credentials to access the console</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="login-form">
              {errorMsg && <div className="login-error-banner">{errorMsg}</div>}

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '11px', fontWeight: '650', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Username or Demo Email</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. admin or stefan@academy.com"
                  required
                  style={{ height: '40px', borderRadius: 'var(--sidebar-radius, 8px)', border: '1px solid var(--border-color)', fontSize: '13px' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group mt-3">
                <label className="form-label" style={{ fontSize: '11px', fontWeight: '650', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Password</label>
                <input 
                  type="password" 
                  className="form-control" 
                  placeholder="••••••••"
                  required
                  style={{ height: '40px', borderRadius: 'var(--sidebar-radius, 8px)', border: '1px solid var(--border-color)', fontSize: '13px' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                className="primary-btn w-full mt-4 justify-center" 
                style={{ 
                  height: '42px', 
                  fontSize: '13.5px', 
                  fontWeight: '750',
                  background: 'var(--sidebar-active-bg, #2F6BFF)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--sidebar-radius, 8px)',
                  boxShadow: '0 4px 14px var(--primary-glow)'
                }}
              >
                Authenticate Session
              </button>
            </form>

            {/* Demo Credentials Section */}
            <div className="login-demo-panel">
              <button 
                type="button"
                className="login-demo-toggle-btn"
                style={{ borderRadius: 'var(--sidebar-radius, 8px)' }}
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
                      style={{ 
                        borderRadius: 'var(--sidebar-radius, 8px)',
                        border: '1px solid var(--border-color)',
                        padding: '12px'
                      }}
                      onClick={() => handleQuickFill(account.email, account.pass)}
                    >
                      <div style={{ fontWeight: '750', color: 'var(--sidebar-active-bg, #2F6BFF)', fontSize: '11.5px' }}>{account.label}</div>
                      <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', marginTop: '3px' }}>{account.desc}</div>
                      <div style={{ fontSize: '9.5px', color: 'var(--text-secondary)', fontFamily: 'monospace', marginTop: '5px', background: 'rgba(0,0,0,0.03)', padding: '3px 6px', borderRadius: '4px' }}>
                        {account.email} / {account.pass}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
