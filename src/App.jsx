import React, { useState, useEffect } from 'react';
import { CRMProvider, useCRM } from './context/CRMContext';
import Sidebar from './components/Sidebar';
import LoginScreen from './components/LoginScreen';
import { verifySoftwareLicense, checkClockIntegrity } from './utils/licenseChecker';
import ActivationScreen from './components/ActivationScreen';

// Page Modules
import Dashboard from './modules/Dashboard';
import GridView from './modules/GridView';
import DetailTimeline from './modules/DetailTimeline';
import WhatsAppConsole from './modules/WhatsAppConsole';
import Analytics from './modules/Analytics';
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
  const { activeView, isLoggedIn, activeRole, setActiveView, leads } = useCRM();
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigatedView, setNavigatedView] = useState(activeView);

  // Licensing Verification States
  const [licenseStatus, setLicenseStatus] = useState('checking');
  const [checkingLicense, setCheckingLicense] = useState(true);
  const currentProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'leads-management-tz';

  const runLicenseVerification = async () => {
    setCheckingLicense(true);
    let localLicense = localStorage.getItem('crm_license_file');

    // Tauri AppData Check: If in Tauri and not in localStorage, load from AppData/com.tz.leadmanagement/
    if (!localLicense && window.__TAURI__) {
      try {
        const fetched = await window.__TAURI__.core.invoke('read_license_file');
        if (fetched) {
          JSON.parse(fetched);
          localLicense = fetched;
          // Sync it to localStorage for immediate caching
          localStorage.setItem('crm_license_file', fetched);
        }
      } catch (e) {
        console.log("No Tauri AppData license found. Bypassing.");
      }
    }

    // Fallback: If still empty, try to fetch the pre-packaged license
    if (!localLicense) {
      try {
        const response = await fetch('/license.dat');
        if (response.ok) {
          const fetchedLicense = await response.text();
          // Verify it is valid JSON
          JSON.parse(fetchedLicense);
          localLicense = fetchedLicense;
        }
      } catch (e) {
        console.log("No pre-packaged license found. Bypassing fallback.");
      }
    }

    if (!localLicense) {
      setLicenseStatus('missing');
      setCheckingLicense(false);
      return;
    }

    try {
      const parsed = JSON.parse(localLicense);
      // 1. Signature & Expiry & Project ID verification
      const verifyResult = await verifySoftwareLicense(parsed, currentProjectId);
      if (!verifyResult.success) {
        setLicenseStatus(verifyResult.reason);
        setCheckingLicense(false);
        return;
      }

      // 2. Clock Rollback validation
      const clockResult = await checkClockIntegrity(isLoggedIn ? leads : []);
      if (!clockResult.success) {
        setLicenseStatus('rollback');
        setCheckingLicense(false);
        return;
      }

      setLicenseStatus('valid');
    } catch (e) {
      setLicenseStatus('tampered');
    } finally {
      setCheckingLicense(false);
    }
  };

  useEffect(() => {
    runLicenseVerification();
  }, [isLoggedIn, leads?.length]);

  // Trigger quick shimmer loading state when swapping tabs or when role changes and view needs redirection
  useEffect(() => {
    // Guard check: redirect if role tries to access a restricted view
    const isCounselor = activeRole === 'Counselor';
    const isManager = activeRole === 'Manager' || activeRole === 'Telecaller';
    const isAdmin = activeRole === 'Admin';

    const isCounselorRestricted = isCounselor && ['analytics', 'sandbox', 'settings', 'history', 'integrations'].includes(activeView);
    const isManagerRestricted = isManager && ['sandbox', 'settings', 'analytics', 'integrations'].includes(activeView);
    const isAdminRestricted = isAdmin && ['history'].includes(activeView);
    const isTelecallerRestricted = activeRole === 'Telecaller' && (activeView === 'whatsapp' || activeView === 'gowhatsapp' || activeView === 'history');

    if (isCounselorRestricted || isManagerRestricted || isAdminRestricted || isTelecallerRestricted) {
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

  if (checkingLicense) {
    return <ShimmerLoader />;
  }

  if (licenseStatus !== 'valid') {
    return (
      <ActivationScreen 
        status={licenseStatus} 
        currentProjectId={currentProjectId} 
        onLicenseActivated={runLicenseVerification} 
      />
    );
  }

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
      case 'gowhatsapp':
        return <GoWhatsApp />;
      case 'analytics':
        return <Analytics />;
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
      {/* Visual Navigation Sidebar */}
      {activeView !== 'gowhatsapp' && <Sidebar />}

      {/* Core main dashboard panel */}
      <div className="main-wrapper" style={activeView === 'gowhatsapp' ? { padding: 0 } : {}}>
        {/* Responsive Scrolling Canvas */}
        <main className="content-area" style={activeView === 'gowhatsapp' ? { padding: 0 } : {}}>
          <div className="fade-in" style={activeView === 'gowhatsapp' ? { height: '100%' } : {}}>
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
