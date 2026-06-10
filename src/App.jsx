import React, { useState, useEffect } from 'react';
import { CRMProvider, useCRM } from './context/CRMContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import LoginScreen from './components/LoginScreen';

// Page Modules
import Dashboard from './modules/Dashboard';
import GridView from './modules/GridView';
import DetailTimeline from './modules/DetailTimeline';
import WhatsAppConsole from './modules/WhatsAppConsole';
import Analytics from './modules/Analytics';
import Sandbox from './modules/Sandbox';
import ConfigSettings from './modules/ConfigSettings';
import Integrations from './modules/Integrations';
import FollowUps from './modules/FollowUps';
import LiveFormEmbed from './modules/LiveFormEmbed';

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
  const { activeView, isLoggedIn, activeRole, setActiveView } = useCRM();
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigatedView, setNavigatedView] = useState(activeView);

  // Trigger quick shimmer loading state when swapping tabs or when role changes and view needs redirection
  useEffect(() => {
    // Guard check: redirect if role tries to access a restricted view
    const isCounselor = activeRole === 'Counselor';
    const isManager = activeRole === 'Manager';

    const isCounselorRestricted = isCounselor && ['analytics', 'sandbox', 'settings'].includes(activeView);
    const isManagerRestricted = isManager && ['sandbox', 'settings'].includes(activeView);

    if (isCounselorRestricted || isManagerRestricted) {
      setActiveView('dashboard');
      return;
    }

    setIsNavigating(true);
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
      case 'whatsapp':
        return <WhatsAppConsole />;
      case 'analytics':
        return <Analytics />;
      case 'sandbox':
        return <Sandbox />;
      case 'integrations':
        return <Integrations />;
      case 'settings':
        return <ConfigSettings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      {/* Visual Navigation Sidebar */}
      <Sidebar />

      {/* Core main dashboard panel */}
      <div className="main-wrapper">
        <Topbar />

        {/* Responsive Scrolling Canvas */}
        <main className="content-area">
          <div className="fade-in">
            {renderView()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const isLiveForm = window.location.pathname === '/live-form';

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
