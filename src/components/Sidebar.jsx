import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import {
  LayoutDashboard,
  Inbox,
  Send,
  TrendingUp,
  Users,
  FileText,
  Bot
} from 'lucide-react';

export default function Sidebar({ mobileMenuOpen, setMobileMenuOpen }) {
  const {
    activeView,
    setActiveView,
    activeRole,
    activeUser,
    logout,
    branding,
    whatsappSubView,
    setWhatsappSubView
  } = useCRM();

  // Local collapsible state removed

  // Local state to track WhatsApp menu expansion in Sidebar
  const [isWhatsAppExpanded, setIsWhatsAppExpanded] = useState(() => {
    return activeView === 'gowhatsapp' || sessionStorage.getItem('gowha_expanded') === 'true';
  });

  const toggleWhatsAppExpand = () => {
    const nextState = !isWhatsAppExpanded;
    setIsWhatsAppExpanded(nextState);
    sessionStorage.setItem('gowha_expanded', nextState ? 'true' : 'false');
    if (activeView !== 'gowhatsapp') {
      setActiveView('gowhatsapp');
    }
  };

  // Local state to track Leads menu expansion
  const [isLeadsExpanded, setIsLeadsExpanded] = useState(() => {
    return ['grid', 'followups', 'history'].includes(activeView) || sessionStorage.getItem('leads_expanded') === 'true';
  });

  const toggleLeadsExpand = () => {
    const nextState = !isLeadsExpanded;
    setIsLeadsExpanded(nextState);
    sessionStorage.setItem('leads_expanded', nextState ? 'true' : 'false');
    if (nextState && !['grid', 'followups', 'history'].includes(activeView)) {
      setActiveView('grid');
    }
  };

  // Local state to track Reports menu expansion
  const [isReportsExpanded, setIsReportsExpanded] = useState(() => {
    return ['analytics', 'basic-reports'].includes(activeView) || sessionStorage.getItem('reports_expanded') === 'true';
  });

  const toggleReportsExpand = () => {
    const nextState = !isReportsExpanded;
    setIsReportsExpanded(nextState);
    sessionStorage.setItem('reports_expanded', nextState ? 'true' : 'false');
    if (nextState && !['analytics', 'basic-reports'].includes(activeView)) {
      setActiveView('analytics');
    }
  };

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
    if (item.id === 'reports') return activeView === 'analytics' || activeView === 'basic-reports';
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
    // Shield icon decoration for TechZone Academy or LeadCRM
    const showShield = branding.instituteName === 'LeadCRM';
    const hasName = !!branding.instituteName?.trim();

    return (
      <div className="brand-logo" style={{ 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: hasName ? 'flex-start' : 'center',
        width: hasName ? 'auto' : '100%',
        gap: hasName ? '8px' : '0'
      }}>
        {branding.logoUrl && (
          <img src={branding.logoUrl} alt={branding.instituteName || ''} className="brand-logo-img" style={{ marginRight: hasName ? '8px' : '0px' }} />
        )}
        {!branding.logoUrl && showShield && (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--sidebar-active-bg, #2F6BFF)', marginRight: hasName ? '4px' : '0px' }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        )}
        {hasName && (
          <h1 className="brand-name">
            {branding.instituteName === 'TechZone Academy' ? (
              <>TechZone <span>Academy</span></>
            ) : branding.instituteName === 'LeadCRM' ? (
              <>Lead<span>CRM</span></>
            ) : (
              branding.instituteName
            )}
          </h1>
        )}
      </div>
    );
  };

  const isCompact = branding.sidebarWidth === 'compact';
  const hasName = !!branding.instituteName?.trim();

  return (
    <aside className={`sidebar ${isCompact ? 'compact-mode' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
      {/* Brand Profile section */}
      <div className="brand-section" style={{ 
        justifyContent: isCompact ? 'center' : (hasName ? 'space-between' : 'center'), 
        padding: isCompact ? '24px 0' : '24px 20px',
        position: 'relative'
      }}>
        {!isCompact && renderLogo()}
      </div>

      {/* Main navigation list */}
      <nav className="navigation-menu">
        {menuItems.map(item => {
          // Role-based tab exclusions
          if (activeRole === 'Counselor' && (item.id === 'settings' || item.id === 'reports' || item.id === 'integrations')) {
            return null;
          }
          if ((activeRole === 'Manager' || activeRole === 'Telecaller') && (item.id === 'settings' || item.id === 'reports' || item.id === 'integrations')) {
            return null;
          }
          if (activeRole === 'Telecaller' && (item.id === 'automation' || item.id === 'gowhatsapp' || item.id === 'history')) {
            return null;
          }

          // Hide these as they are now sub-items of Leads
          if (item.id === 'followups' || item.id === 'history') {
            return null;
          }

          if (item.id === 'leads') {
            const isActive = ['grid', 'followups', 'history'].includes(activeView);
            return (
              <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={toggleLeadsExpand}
                  title={item.label}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {!isCompact && (
                    <svg
                      viewBox="0 0 24 24"
                      width="14"
                      height="14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      style={{
                        transition: 'transform 0.2s ease',
                        transform: isLeadsExpanded ? 'rotate(0deg)' : 'rotate(-90deg)'
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  )}
                </button>

                {isLeadsExpanded && !isCompact && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '14px', borderLeft: '1px dashed rgba(255, 255, 255, 0.15)', marginLeft: '24px', marginTop: '2px', marginBottom: '6px' }}>
                    {[
                      { subTarget: 'grid', label: 'Total Leads' },
                      { subTarget: 'followups', label: 'Follow-ups' },
                      { subTarget: 'history', label: 'Activity History' }
                    ].map(sub => {
                      if (sub.subTarget === 'history') {
                        if (activeRole === 'Telecaller') return null;
                      }

                      const isSubActive = activeView === sub.subTarget;
                      return (
                        <button
                          key={sub.subTarget}
                          className="nav-sub-item"
                          onClick={() => setActiveView(sub.subTarget)}
                          style={{
                            padding: '8px 12px',
                            fontSize: '13px',
                            opacity: isSubActive ? 1 : 0.65,
                            background: isSubActive ? 'var(--sidebar-active-bg, #2F6BFF)' : 'transparent',
                            color: '#ffffff',
                            fontWeight: isSubActive ? '600' : '500',
                            borderRadius: '8px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            display: 'block',
                            width: '100%'
                          }}
                        >
                          {sub.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
          if (item.id === 'gowhatsapp') {
            const isActive = activeView === 'gowhatsapp';
            return (
              <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={toggleWhatsAppExpand}
                  title={item.label}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {!isCompact && (
                    <svg
                      viewBox="0 0 24 24"
                      width="14"
                      height="14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      style={{
                        transition: 'transform 0.2s ease',
                        transform: isWhatsAppExpanded ? 'rotate(0deg)' : 'rotate(-90deg)'
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  )}
                </button>

                {isWhatsAppExpanded && !isCompact && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '14px', borderLeft: '1px dashed rgba(255, 255, 255, 0.15)', marginLeft: '24px', marginTop: '2px', marginBottom: '6px' }}>
                    {[
                      { subTarget: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                      { subTarget: 'inbox', label: 'Inbox', icon: Inbox },
                      { subTarget: 'new-campaign', label: 'New Campaign', icon: Send },
                      { subTarget: 'campaigns', label: 'Campaigns', icon: TrendingUp },
                      { subTarget: 'contacts', label: 'Contacts', icon: Users },
                      { subTarget: 'templates', label: 'Templates', icon: FileText },
                      { subTarget: 'chatbot', label: 'Chatbot', icon: Bot }
                    ].map(sub => {
                      const IconComponent = sub.icon;
                      const isSubActive = activeView === 'gowhatsapp' && (whatsappSubView === sub.subTarget || (sub.subTarget === 'campaigns' && whatsappSubView === 'campaign-report'));
                      return (
                        <button
                          key={sub.subTarget}
                          className="nav-sub-item"
                          onClick={() => {
                            setWhatsappSubView(sub.subTarget);
                            setActiveView('gowhatsapp');
                          }}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            opacity: isSubActive ? 1 : 0.65,
                            background: isSubActive ? 'var(--sidebar-active-bg, #2F6BFF)' : 'transparent',
                            color: '#ffffff',
                            fontWeight: isSubActive ? '700' : '500',
                            borderRadius: '6px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <IconComponent size={14} />
                          {sub.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          if (item.id === 'reports') {
            const isActive = ['analytics', 'basic-reports'].includes(activeView);
            return (
              <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={toggleReportsExpand}
                  title={item.label}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {!isCompact && (
                    <svg
                      viewBox="0 0 24 24"
                      width="14"
                      height="14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      style={{
                        transition: 'transform 0.2s ease',
                        transform: isReportsExpanded ? 'rotate(0deg)' : 'rotate(-90deg)'
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  )}
                </button>

                {isReportsExpanded && !isCompact && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '14px', borderLeft: '1px dashed rgba(255, 255, 255, 0.15)', marginLeft: '24px', marginTop: '2px', marginBottom: '6px' }}>
                    {[
                      { subTarget: 'analytics', label: 'Performance Analytics' },
                      { subTarget: 'basic-reports', label: 'Basic Reports' }
                    ].map(sub => {
                      const isSubActive = activeView === sub.subTarget;
                      return (
                        <button
                          key={sub.subTarget}
                          className="nav-sub-item"
                          onClick={() => setActiveView(sub.subTarget)}
                          style={{
                            padding: '8px 12px',
                            fontSize: '13px',
                            opacity: isSubActive ? 1 : 0.65,
                            background: isSubActive ? 'var(--sidebar-active-bg, #2F6BFF)' : 'transparent',
                            color: '#ffffff',
                            fontWeight: isSubActive ? '600' : '500',
                            borderRadius: '8px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            display: 'block',
                            width: '100%'
                          }}
                        >
                          {sub.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
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
      <div className="user-profile-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
          <div className="user-avatar" style={{ border: '2px solid var(--sidebar-active-bg, #2F6BFF)', flexShrink: 0 }}>
            {getInitials(activeUser)}
          </div>
          {!isCompact && (
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span className="user-name" style={{ fontSize: '12.5px', fontWeight: '600', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeUser}</span>
              <span className="user-role-badge" style={{ color: 'var(--sidebar-active-bg, #2F6BFF)', fontSize: '9.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{activeRole}</span>
            </div>
          )}
        </div>
        {!isCompact && (
          <button 
            className="sidebar-logout-btn-always" 
            onClick={logout}
            title="Log Out"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ef4444';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
              e.currentTarget.style.color = '#ef4444';
            }}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease'
            }}
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Log Out</span>
          </button>
        )}
      </div>
    </aside>
  );
}
