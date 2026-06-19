import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';

export default function Sidebar() {
  const {
    activeView,
    setActiveView,
    activeRole,
    activeUser,
    logout,
    branding
  } = useCRM();

  // Local collapsible state for left navigation sidebar
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Define navigation tabs to match the mockup screenshot exactly
  const menuItems = [
    {
      id: 'dashboard',
      target: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
        </svg>
      )
    },

    {
      id: 'leads',
      target: 'grid',
      label: 'Leads',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )
    },
    {
      id: 'followups',
      target: 'followups',
      label: 'Follow Ups',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L21 8" />
          <path d="M21 3v5h-5" />
        </svg>
      )
    },

    {
      id: 'integrations',
      target: 'integrations',
      label: 'Integrations',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 3v4M6 3v4M12 2v20M20 7H4c0 0 0 4 2 6l2 2v5c0 1 1 2 2 2h4c1 0 2-1 2-2v-5l2-2c2-2 2-6 2-6z" />
        </svg>
      )
    },

    {
      id: 'reports',
      target: 'analytics',
      label: 'Reports',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
          <path d="M22 12A10 10 0 0 0 12 2v10z" />
        </svg>
      )
    },

    {
      id: 'gowhatsapp',
      target: 'gowhatsapp',
      label: 'WhatsApp',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      )
    },
    {
      id: 'history',
      target: 'history',
      label: 'History',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <polyline points="3 3 3 8 8 8" />
          <line x1="12" y1="7" x2="12" y2="12" />
          <line x1="12" y1="12" x2="16" y2="14" />
        </svg>
      )
    },
    {
      id: 'settings',
      target: 'settings',
      label: 'Settings',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      )
    }
  ];

  // Helper to check active state based on current context view
  const isItemActive = (item) => {
    if (item.id === 'dashboard') return activeView === 'dashboard';
    if (item.id === 'leads') return activeView === 'grid' || activeView === 'detail';
    if (item.id === 'followups') return activeView === 'followups';
    if (item.id === 'integrations') return activeView === 'integrations';
    if (item.id === 'reports') return activeView === 'analytics';
    if (item.id === 'automation') return activeView === 'whatsapp';
    if (item.id === 'history') return activeView === 'history';
    if (item.id === 'settings') return activeView === 'settings';
    return activeView === item.target;
  };

  // Get user initials for avatar
  const getInitials = (name) => {
    return name
      ? name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
      : '';
  };

  // Modern dynamic logo renderer
  const renderLogo = () => {
    if (branding.logoUrl) {
      return <img src={branding.logoUrl} alt={branding.instituteName} className="brand-logo-img" />;
    }

    // Shield icon decoration for TechZone Academy or LeadCRM
    const showShield = branding.instituteName === 'TechZone Academy' || branding.instituteName === 'LeadCRM';

    return (
      <div className="brand-logo">
        {showShield && (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--sidebar-active-bg, #2F6BFF)', marginRight: '4px' }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        )}
        <h1 className="brand-name">
          {branding.instituteName === 'TechZone Academy' ? (
            <>TechZone<span>Academy</span></>
          ) : branding.instituteName === 'LeadCRM' ? (
            <>Lead<span>CRM</span></>
          ) : (
            branding.instituteName
          )}
        </h1>
      </div>
    );
  };

  const isCompact = isCollapsed || branding.sidebarWidth === 'compact';

  return (
    <aside className={`sidebar ${isCompact ? 'compact-mode' : ''}`}>
      {/* Brand Profile section */}
      <div className="brand-section" style={{ justifyContent: isCompact ? 'center' : 'space-between', padding: isCompact ? '24px 0' : '24px 20px' }}>
        {!isCompact && renderLogo()}
        <div
          className="brand-hamburger"
          onClick={() => setIsCollapsed(prev => !prev)}
          style={{ cursor: 'pointer', margin: isCompact ? '0 auto' : '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title={isCompact ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCompact ? (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          )}
        </div>
      </div>

      {/* Main navigation list */}
      <nav className="navigation-menu">
        {menuItems.map(item => {
          // Role-based tab exclusions
          if (activeRole === 'Counselor' && (item.id === 'settings' || item.id === 'reports' || item.id === 'history' || item.id === 'integrations')) {
            return null;
          }
          if (activeRole === 'Admin' && item.id === 'history') {
            return null;
          }
          if ((activeRole === 'Manager' || activeRole === 'Telecaller') && (item.id === 'settings' || item.id === 'reports' || item.id === 'integrations')) {
            return null;
          }
          if (activeRole === 'Telecaller' && (item.id === 'automation' || item.id === 'gowhatsapp' || item.id === 'history')) {
            return null;
          }
          // Admin has all tabs access, no exclusions
          return (
            <button
              key={item.id}
              className={`nav-item ${isItemActive(item) ? 'active' : ''}`}
              onClick={() => setActiveView(item.target)}
              title={item.label}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Profile details */}
      <div className="user-profile-section">
        <div className="user-avatar" style={{ border: '2px solid var(--sidebar-active-bg, #2F6BFF)' }}>
          {getInitials(activeUser)}
        </div>
        <div className="user-details-wrapper">
          <div className="user-details">
            <span className="user-name">{activeUser}</span>
            <span className="user-role-badge" style={{ color: 'var(--sidebar-active-bg, #2F6BFF)' }}>{activeRole}</span>
          </div>
          <button className="sidebar-logout-btn" onClick={logout}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
