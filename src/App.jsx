import React, { useState, useEffect } from 'react';
import { CRMProvider, useCRM } from './context/CRMContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import LoginScreen from './components/LoginScreen';

// Page Modules
import Dashboard from './modules/Dashboard';
import GridView from './modules/GridView';
import DetailTimeline from './modules/DetailTimeline';
import Analytics from './modules/Analytics';
import BasicReports from './modules/BasicReports';
import GoWhatsApp from './modules/gowhatsapp/GoWhatsApp';
import Sandbox from './modules/Sandbox';
import ConfigSettings from './modules/ConfigSettings';
import Integrations from './modules/Integrations';
import FollowUps from './modules/FollowUps';
import LiveFormEmbed from './modules/LiveFormEmbed';
import History from './modules/History';

// Beautiful visual page skeleton shimmer loader
function ShimmerLoader() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', padding: '10px' }}>
      {/* Header Shimmer */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="shimmer-placeholder" style={{ width: '220px', height: '24px' }}></div>
        <div className="shimmer-placeholder" style={{ width: '380px', height: '14px' }}></div>
      </div>

      {/* KPI Counters Grid Shimmer */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="shimmer-placeholder" style={{ height: '90px' }}></div>
        <div className="shimmer-placeholder" style={{ height: '90px' }}></div>
        <div className="shimmer-placeholder" style={{ height: '90px' }}></div>
        <div className="shimmer-placeholder" style={{ height: '90px' }}></div>
      </div>

      {/* Main Layout Grid Shimmer */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', minHeight: '360px' }}>
        <div className="shimmer-placeholder" style={{ flex: 1, minHeight: '320px' }}></div>
        <div className="shimmer-placeholder" style={{ flex: 1, minHeight: '320px' }}></div>
      </div>
    </div>
  );
}

function MainAppContent() {
  const { activeView, isLoggedIn, activeRole, setActiveView, branding } = useCRM();
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigatedView, setNavigatedView] = useState(activeView);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Trigger quick shimmer loading state when swapping tabs or when role changes and view needs redirection
  useEffect(() => {
    // Guard check: redirect if role tries to access a restricted view
    const isCounselor = activeRole === 'Counselor';
    const isManager = activeRole === 'Manager' || activeRole === 'Telecaller';
    const isAdmin = activeRole === 'Admin';

    const isCounselorRestricted = isCounselor && ['analytics', 'sandbox', 'settings', 'integrations'].includes(activeView);
    const isManagerRestricted = isManager && ['sandbox', 'settings', 'analytics', 'integrations'].includes(activeView);
    const isTelecallerRestricted = activeRole === 'Telecaller' && (activeView === 'gowhatsapp' || activeView === 'history');

    if (isCounselorRestricted || isManagerRestricted || isTelecallerRestricted) {
      setActiveView('dashboard');
      return;
    }

    setIsNavigating(true);
    setMobileMenuOpen(false); // Close mobile menu on navigate
    const timer = setTimeout(() => {
      setNavigatedView(activeView);
      setIsNavigating(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [activeView, activeRole, setActiveView]);

  if (!isLoggedIn) {
    return <LoginScreen />;
  }

  // SPA router page switcher
  const renderView = () => {
    if (isNavigating) {
      return <ShimmerLoader />;
    }

    switch (navigatedView) {
      case 'dashboard':
        return <Dashboard />;
      case 'grid':
        return <GridView />;
      case 'detail':
        return <DetailTimeline />;
      case 'followups':
        return <FollowUps />;
      case 'gowhatsapp':
        return <GoWhatsApp />;
      case 'analytics':
        return <Analytics />;
      case 'basic-reports':
        return <BasicReports />;
      case 'sandbox':
        return <Sandbox />;
      case 'integrations':
        return <Integrations />;
      case 'settings':
        return <ConfigSettings />;
      case 'history':
        return <History />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      {/* Mobile Top Header */}
      <div className="mobile-top-header">
        <div className="mobile-logo-container">
          {branding?.logoUrl ? (
            <img src={branding.logoUrl} alt={branding.instituteName || 'Logo'} className="brand-logo-img" style={{ height: '32px' }} />
          ) : (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--sidebar-active-bg, #2F6BFF)' }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          )}
          <span className="mobile-brand-name">
            {branding?.instituteName === 'TechZone Academy' ? (
              <>TechZone <span>Academy</span></>
            ) : branding?.instituteName === 'LeadCRM' ? (
              <>Lead<span>CRM</span></>
            ) : (
              branding?.instituteName || 'Leads'
            )}
          </span>
        </div>
        <button className="mobile-hamburger-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </div>

      {/* Visual Navigation Sidebar */}
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

      {/* Core main dashboard panel */}
      <div className="main-wrapper" style={activeView === 'gowhatsapp' ? { padding: 0 } : {}}>
        {activeView !== 'gowhatsapp' && <Topbar />}
        {/* Responsive Scrolling Canvas */}
        <main className="content-area" style={activeView === 'gowhatsapp' ? { padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' } : {}}>
          <div className="fade-in" style={activeView === 'gowhatsapp' ? { height: '100%', display: 'flex', flexDirection: 'column', flex: 1 } : {}}>
            {renderView()}
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="mobile-sidebar-overlay" onClick={() => setMobileMenuOpen(false)}></div>
      )}
    </div>
  );
}

import QRFormEmbed from './modules/QRFormEmbed';

export default function App() {
  const isLiveForm = window.location.pathname === '/live-form';
  const isQRForm = window.location.pathname === '/qr-form';

  if (isQRForm) {
    return <QRFormEmbed />;
  }

  if (isLiveForm) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'transparent' }}>
        <LiveFormEmbed />
      </div>
    );
  }

  return (
    <CRMProvider>
      <MainAppContent />
    </CRMProvider>
  );
}
