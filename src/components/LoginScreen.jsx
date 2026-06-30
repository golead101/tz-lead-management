import React, { useState, useEffect, useRef } from 'react';
import { useCRM } from '../context/CRMContext';

// --- Animated Orb Background ---
function AnimatedBackground() {
  return (
    <div className="lgl-bg-canvas" aria-hidden="true">
      <div className="lgl-orb lgl-orb-1" />
      <div className="lgl-orb lgl-orb-2" />
      <div className="lgl-orb lgl-orb-3" />
      <div className="lgl-orb lgl-orb-4" />
      <div className="lgl-mesh-grid" />
    </div>
  );
}

// --- Feature Highlight Card ---
function FeatureCard({ icon, title, description, delay }) {
  return (
    <div className="lgl-feature-card" style={{ animationDelay: `${delay}ms` }}>
      <div className="lgl-feature-icon">{icon}</div>
      <div className="lgl-feature-text">
        <p className="lgl-feature-title">{title}</p>
        <p className="lgl-feature-desc">{description}</p>
      </div>
    </div>
  );
}

// --- Stat Pill ---
function StatPill({ value, label }) {
  return (
    <div className="lgl-stat-pill">
      <span className="lgl-stat-value">{value}</span>
      <span className="lgl-stat-label">{label}</span>
    </div>
  );
}

// --- Premium Floating Label Input ---
function FloatingInput({ id, type, label, value, onChange, autoComplete, rightAddon }) {
  const [focused, setFocused] = useState(false);
  const isFilled = value && value.length > 0;

  return (
    <div className={`lgl-field-wrap${focused ? ' lgl-field-focused' : ''}${isFilled ? ' lgl-field-filled' : ''}`}>
      <label htmlFor={id} className="lgl-float-label">{label}</label>
      <input
        id={id}
        type={type}
        className="lgl-float-input"
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete={autoComplete}
        required
        aria-label={label}
      />
      {rightAddon && <div className="lgl-field-addon">{rightAddon}</div>}
    </div>
  );
}

export default function LoginScreen() {
  const { login, branding } = useCRM();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const instituteName = branding?.instituteName || 'TechZone Academy';
  const logoUrl = branding?.logoUrl || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setErrorMsg('');
    setIsLoading(true);
    try {
      const res = await login(email, password);
      if (res === true || (res && res.success)) {
        setSuccess(true);
      } else {
        const reason = res && res.reason;
        if (reason === 'deactivated') {
          setErrorMsg('This account has been deactivated. Please contact an Admin.');
        } else {
          setErrorMsg('Invalid credentials. Please check your email and password.');
        }
      }
    } catch (err) {
      setErrorMsg('Authentication failed: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const eyeIcon = showPassword ? (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  const features = [
    {
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      title: 'Lead Management',
      description: 'Capture, track & convert high-intent student leads in real-time.',
      delay: 100,
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
      title: 'WhatsApp Integration',
      description: 'Engage prospects on WhatsApp with AI-powered automated replies.',
      delay: 200,
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
      title: 'Telecaller Monitoring',
      description: 'Track call volumes, follow-ups & performance in one dashboard.',
      delay: 300,
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
      title: 'Analytics Dashboard',
      description: 'Visualize conversions, pipeline health & revenue forecasts.',
      delay: 400,
    },
  ];

  return (
    <div className="lgl-root">
      <AnimatedBackground />

      <div className="lgl-layout">
        {/* ── LEFT BRAND PANEL ── */}
        <div className="lgl-brand-panel">
          {/* Logo */}
          <div className="lgl-logo-area">
            {logoUrl ? (
              <img src={logoUrl} alt={instituteName} className="lgl-brand-img" />
            ) : (
              <div className="lgl-wordmark">
                <div className="lgl-icon-badge">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <span className="lgl-brand-name">
                  {instituteName}
                </span>
              </div>
            )}
            <div className="lgl-badge-pill">Admissions Portal</div>
          </div>

          {/* Hero copy */}
          <div className="lgl-hero-copy">
            <h1 className="lgl-hero-title">
              The smartest way to<br />
              <span className="lgl-hero-highlight">enroll students.</span>
            </h1>
            <p className="lgl-hero-subtitle">
              A premium CRM built for modern admissions teams — from first inquiry to final enrollment.
            </p>
          </div>

          {/* Feature cards */}
          <div className="lgl-features-grid">
            {features.map((f, i) => (
              <FeatureCard key={i} {...f} />
            ))}
          </div>

          {/* Trust / Stats Bar */}
          <div className="lgl-stats-bar">
            <StatPill value="5,000+" label="Leads Tracked" />
            <div className="lgl-stats-divider" />
            <StatPill value="98%" label="Uptime SLA" />
            <div className="lgl-stats-divider" />
            <StatPill value="3x" label="Conversion Lift" />
          </div>

          {/* Footer */}
          <p className="lgl-brand-footer">
            © 2026 {instituteName} &middot; Powered by{' '}
            <span className="lgl-footer-accent">Yuva Intelli AI Solutions</span>
          </p>
        </div>

        {/* ── RIGHT FORM PANEL ── */}
        <div className="lgl-form-panel">
          <div className="lgl-glass-card">
            {/* Card header */}
            <div className="lgl-card-header">
              <div className="lgl-card-icon-ring">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div>
                <h2 className="lgl-card-title">Welcome back</h2>
                <p className="lgl-card-subtitle">Sign in to your admin console</p>
              </div>
            </div>

            {/* Error banner */}
            {errorMsg && (
              <div className="lgl-error-banner" role="alert">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {errorMsg}
              </div>
            )}

            {/* Success state */}
            {success && (
              <div className="lgl-success-banner" role="status">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Authenticated! Redirecting to dashboard…
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="lgl-form" noValidate>
              <FloatingInput
                id="lg-email"
                type="text"
                label="Email address or username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />

              <FloatingInput
                id="lg-password"
                type={showPassword ? 'text' : 'password'}
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                rightAddon={
                  <button
                    type="button"
                    className="lgl-eye-btn"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {eyeIcon}
                  </button>
                }
              />

              {/* Forgot password */}
              <div className="lgl-form-meta">
                <button type="button" className="lgl-forgot-link">
                  Forgot password?
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className={`lgl-submit-btn${isLoading ? ' lgl-submit-loading' : ''}`}
                disabled={isLoading || success}
                aria-busy={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="lgl-spinner" aria-hidden="true" />
                    Authenticating…
                  </>
                ) : success ? (
                  <>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Signed in
                  </>
                ) : (
                  <>
                    Login
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </>
                )}
              </button>
            </form>


          </div>
        </div>
      </div>
    </div>
  );
}
