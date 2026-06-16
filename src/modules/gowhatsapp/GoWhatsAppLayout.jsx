import React, { useState } from 'react';
import {
  MessageCircle,
  LayoutDashboard,
  Send,
  Users,
  FileText,
  Settings,
  LogOut,
  ArrowLeft,
  Inbox,
  TrendingUp,
  Bot
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';

const BRAND_BLUE = '#2563eb';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, view: 'dashboard' },
  { label: 'Inbox', icon: Inbox, view: 'inbox' },
  { label: 'New Campaign', icon: Send, view: 'new-campaign' },
  { label: 'Campaigns', icon: TrendingUp, view: 'campaigns' }, // Wait, in friend's code it used BarChart3 for campaigns, we can use TrendingUp or other icons
  { label: 'Contacts', icon: Users, view: 'contacts' },
  { label: 'Templates', icon: FileText, view: 'templates' },
  { label: 'Chatbot', icon: Bot, view: 'chatbot' }
];

const GoWhatsAppLayout = ({ children, subView, setSubView }) => {
  const { activeUser, logout, setActiveView } = useCRM();
  const [mobileOpen, setMobileOpen] = useState(false);

  const displayName = activeUser || 'User';

  const handleNavClick = (view) => {
    setSubView(view);
    setMobileOpen(false);
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleBackToDashboard = () => {
    setActiveView('dashboard');
  };

  return (
    <div className="app-shell">
      {/* Mobile Menu Button */}
      <button
        type="button"
        className="mobile-menu-button"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {mobileOpen && (
        <div
          className="mobile-menu-overlay"
          onClick={() => setMobileOpen(false)}
          role="button"
          tabIndex={0}
          aria-label="Close menu"
          onKeyDown={(e) => e.key === 'Escape' && setMobileOpen(false)}
        />
      )}

      {/* WhatsApp Sub-Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div 
          className="sidebar__brand" 
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} 
          onClick={handleBackToDashboard}
          title="Back to CRM Dashboard"
        >
          <ArrowLeft size={16} color="#ffffff" style={{ opacity: 0.7 }} />
          <MessageCircle size={20} color="#ffffff" className="sidebar__logo" />
          <span className="sidebar__brand-name" style={{ color: '#ffffff', fontSize: '1.15rem', fontWeight: 700 }}>WhatsApp</span>
        </div>

        <nav className="sidebar__nav">
          <ul>
            {navItems.map(({ label, icon: Icon, view }) => {
              const isActive = subView === view || (view === 'campaigns' && subView === 'campaign-report');
              return (
                <li
                  key={view}
                  className={isActive ? 'is-active' : ''}
                  onClick={() => handleNavClick(view)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleNavClick(view);
                  }}
                  role="button"
                  tabIndex={0}
                  style={isActive ? { backgroundColor: '#2F6BFF', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '12px' } : { display: 'flex', alignItems: 'center', gap: '12px' }}
                >
                  <Icon size={18} className="nav-icon" style={isActive ? { color: '#ffffff' } : {}} />
                  {label}
                </li>
              );
            })}
          </ul>
        </nav>

        <footer className="sidebar__footer">
          <div className="sidebar__profile">
            <div className="sidebar__avatar" style={{ backgroundColor: '#2F6BFF' }}>
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="sidebar__profile-name" style={{ color: '#ffffff' }}>{displayName}</div>
            </div>
          </div>
          <button
            type="button"
            className="button ghost"
            onClick={handleLogout}
            style={{ width: '100%', justifyContent: 'flex-start', gap: 10, display: 'flex', alignItems: 'center', borderRadius: '12px' }}
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </footer>
      </aside>

      {/* Main Content Area */}
      <main className="main">
        <div className={`main__content ${subView === 'inbox' ? 'no-padding' : ''}`}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default GoWhatsAppLayout;
