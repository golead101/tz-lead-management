import React from 'react';
import { useCRM } from '../context/CRMContext';

export default function Sidebar() {
  const { 
    activeView, 
    setActiveView, 
    branding, 
    activeRole, 
    activeUser,
    logout
  } = useCRM();

  // Define navigation tabs. Settings is only visible to Admin.
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg viewBox="0 0 24 24">
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
      )
    },
    {
      id: 'board',
      label: 'Lead Board',
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M4 5a1 1 0 011-1h4a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v8a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z" />
          <path d="M14 17a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1v-2z" />
        </svg>
      )
    },
    {
      id: 'grid',
      label: 'Lead Grid',
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M3 10h18M3 14h18M3 18h18M3 6h18M3 4h18a2 2 0 012 2v12a2 2 0 01-2 2H3a2 2 0 01-2-2V6a2 2 0 012-2z" />
        </svg>
      )
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp Chat',
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
        </svg>
      )
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M18 20V10M12 20V4M6 20v-6" />
        </svg>
      )
    },
    {
      id: 'sandbox',
      label: 'Form Sandbox',
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      )
    }
  ];

  // Admin and Manager can see configurations, Counselors are excluded
  if (activeRole === 'Admin') {
    menuItems.push({
      id: 'settings',
      label: 'System Settings',
      icon: (
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      )
    });
  }

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

  return (
    <aside className="sidebar">
      {/* Brand Profile section */}
      <div className="brand-section">
        <div className="brand-logo">
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="2.5" fill="none"/>
          </svg>
        </div>
        <div className="brand-info">
          <h1 className="brand-name">{branding.instituteName}</h1>
          <span className="brand-tagline">Lead CRM Console</span>
        </div>
      </div>

      {/* Main navigation list */}
      <nav className="navigation-menu">
        {menuItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activeView === item.id || (item.id === 'grid' && activeView === 'detail') ? 'active' : ''}`}
            onClick={() => setActiveView(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Bottom Profile details */}
      <div className="user-profile-section">
        <div className="user-avatar">
          {getInitials(activeUser)}
        </div>
        <div className="user-details-wrapper">
          <div className="user-details">
            <span className="user-name">{activeUser}</span>
            <span className="user-role-badge">{activeRole}</span>
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
