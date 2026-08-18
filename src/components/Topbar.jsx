import React, { useState, useEffect } from 'react';
import { useCRM } from '../context/CRMContext';

export default function Topbar() {
  const {
    activeRole,
    setActiveRole,
    activeUser,
    setActiveUser,
    counselors,
    notifications,
    clearNotifications,
    setActiveView,
    setSelectedLeadId,
    leads,
    setShowDetailModal,
    isFirebaseEnabled
  } = useCRM();

  const [notifOpen, setNotifOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  
  // Custom search query setter in global context (we will inject it shortly)
  const { searchQuery, setSearchQuery } = useCRM();

  // Command Palette Specialist States
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdSearch, setCmdSearch] = useState('');

  // Sync search input
  useEffect(() => {
    if (setSearchQuery) {
      setSearchQuery(searchVal);
    }
  }, [searchVal, setSearchQuery]);

  // Global Ctrl + K Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(prev => !prev);
        setCmdSearch('');
      }
      if (e.key === 'Escape') {
        setCmdOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Adjust active user automatically depending on role selected
  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    setActiveRole(newRole);
    const matchedUser = counselors.find(c => c.role === newRole);
    if (matchedUser) {
      setActiveUser(matchedUser.name);
    } else {
      setActiveUser(counselors[0]?.name || '');
    }
  };

  const handleUserChange = (e) => {
    setActiveUser(e.target.value);
  };

  // Find unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Handle notification click to navigate to related lead
  const handleNotifClick = (notif) => {
    setNotifOpen(false);
    // Find lead related to notification
    const matchedLead = leads.find(l => 
      notif.content.includes(l.name) || 
      notif.title.includes(l.name)
    );
    if (matchedLead) {
      setSelectedLeadId(matchedLead.id);
      setShowDetailModal(true);
      setActiveView('grid');
    }
  };

  return (
    <header className="topbar">
      {/* Search Input bar */}
      <div className="search-wrapper">
        <div className="search-container">
          <svg viewBox="0 0 24 24" className="search-icon">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input 
            type="text" 
            placeholder="Search tasks, users, reports..." 
            className="search-input"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            onClick={() => setCmdOpen(true)}
          />
          <div className="search-shortcut">
            <span>Ctrl</span>
            <span>K</span>
          </div>
        </div>
      </div>

      {/* Dynamic Actions */}
      <div className="topbar-actions">

        <div className="profile-group">
          <button className="notification-bell-btn" onClick={() => setNotifOpen(!notifOpen)}>
            <svg viewBox="0 0 24 24" className="bell-icon">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && <span className="notif-badge"></span>}
          </button>
          
          <div className="user-profile-dropdown">
            <div className="avatar-circle" style={{ width: '32px', height: '32px', fontSize: '13px', background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)' }}>
              {activeUser ? activeUser.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
              <div className="status-dot"></div>
            </div>
            <div className="user-info">
              <span className="user-name">{activeUser || 'User'}</span>
              <span className="user-role">{activeRole || 'Role'}</span>
            </div>
          </div>
        </div>

      </div>

      {/* ==================================================================
          FLOATING COMMAND PALETTE SYSTEM OVERLAY (Ctrl + K)
          ================================================================== */}
      {cmdOpen && (
        <div className="command-palette-overlay" onClick={() => setCmdOpen(false)}>
          <div className="cmd-palette" onClick={(e) => e.stopPropagation()}>
            <input 
              type="text" 
              className="cmd-search-input" 
              placeholder="Search menus, leads, or quick actions... (ESC to exit)"
              autoFocus
              value={cmdSearch}
              onChange={(e) => setCmdSearch(e.target.value)}
            />
            <div className="cmd-list">
              {/* If no search query, show default navigation controls */}
              {!cmdSearch.trim() ? (
                <>
                  <div className="cmd-section-title">Navigation Shortcuts</div>
                  <div className="cmd-item" onClick={() => { setActiveView('dashboard'); setCmdOpen(false); }}>
                    <span>📊 Go to Dashboard Overview</span>
                    <span className="cmd-shortcut">G + D</span>
                  </div>
                  <div className="cmd-item" onClick={() => { setActiveView('grid'); setCmdOpen(false); }}>
                    <span>🗂️ Go to Leads spreadsheet Grid</span>
                    <span className="cmd-shortcut">G + G</span>
                  </div>
                  {activeRole !== 'Counselor' && (
                    <div className="cmd-item" onClick={() => { setActiveView('analytics'); setCmdOpen(false); }}>
                      <span>📈 Go to Visual Analytics Report</span>
                      <span className="cmd-shortcut">G + A</span>
                    </div>
                  )}

                  {activeRole === 'Admin' && (
                    <div className="cmd-item" onClick={() => { setActiveView('settings'); setCmdOpen(false); }}>
                      <span>⚙️ Go to System Configurations</span>
                      <span className="cmd-shortcut">G + S</span>
                    </div>
                  )}


                  <div className="cmd-section-title">Quick Actions</div>
                  <div className="cmd-item" onClick={() => { setSelectedLeadId(null); setShowDetailModal(true); setActiveView('grid'); setCmdOpen(false); }}>
                    <span>✨ Create New Student Inquiry</span>
                    <span className="cmd-shortcut">/add</span>
                  </div>
                </>
              ) : (
                <>
                  {/* Lead Matches Search Results */}
                  <div className="cmd-section-title">Matched Student Leads</div>
                  {leads.filter(l => 
                    l.name.toLowerCase().includes(cmdSearch.toLowerCase()) ||
                    l.email.toLowerCase().includes(cmdSearch.toLowerCase()) ||
                    l.phone.includes(cmdSearch)
                  ).length === 0 ? (
                    <div className="text-center" style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                      No student inquiries found matching "{cmdSearch}"
                    </div>
                  ) : (
                    leads.filter(l => 
                      l.name.toLowerCase().includes(cmdSearch.toLowerCase()) ||
                      l.email.toLowerCase().includes(cmdSearch.toLowerCase()) ||
                      l.phone.includes(cmdSearch)
                    ).slice(0, 5).map(l => (
                      <div 
                        key={l.id} 
                        className="cmd-item" 
                        onClick={() => {
                          setSelectedLeadId(l.id);
                          setShowDetailModal(true);
                          setActiveView('grid');
                          setCmdOpen(false);
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{l.name}</span>
                          <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>{l.course} • {l.phone}</span>
                        </div>
                        <span className="status-badge" style={{ fontSize: '9px', textTransform: 'uppercase' }}>{l.stage}</span>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
