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
    if (newRole === 'Counselor') {
      setActiveUser(counselors[0]?.name || 'Maha');
    } else if (newRole === 'Manager') {
      setActiveUser('Irfan');
    } else {
      setActiveUser('Stefan Salvatore');
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
      <div className="search-container">
        <svg viewBox="0 0 24 24" className="search-icon">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input 
          type="text" 
          placeholder="Search leads by name, email, phone..." 
          className="search-input"
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
        />
      </div>

      {/* Dynamic Actions */}
      <div className="topbar-actions">
        {/* Firebase Connection Status Badge */}
        <div className="firebase-status-badge" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '11px',
          fontWeight: '600',
          background: isFirebaseEnabled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)',
          color: isFirebaseEnabled ? '#10B981' : '#6B7280',
          border: isFirebaseEnabled ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(107, 114, 128, 0.2)',
          marginRight: '12px'
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: isFirebaseEnabled ? '#10B981' : '#6B7280',
            boxShadow: isFirebaseEnabled ? '0 0 8px #10B981' : 'none'
          }} />
          {isFirebaseEnabled ? 'Firestore Live' : 'Offline Mode (Local Cache)'}
        </div>

        {/* Simulated Session Control */}
        <div className="role-switcher-container">
          <span className="role-switcher-label">Role:</span>
          <select 
            value={activeRole} 
            onChange={handleRoleChange}
            className="role-select"
          >
            <option value="Admin">Admin</option>
            <option value="Manager">Manager</option>
            <option value="Counselor">Counselor</option>
          </select>
        </div>

        {activeRole === 'Counselor' && (
          <div className="role-switcher-container">
            <span className="role-switcher-label">Agent:</span>
            <select 
              value={activeUser} 
              onChange={handleUserChange}
              className="role-select"
            >
              {counselors.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Notifications feed */}
        <div style={{ position: 'relative' }}>
          <button 
            className="notification-bell-btn"
            onClick={() => setNotifOpen(!notifOpen)}
          >
            <svg viewBox="0 0 24 24">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            {unreadCount > 0 && <div className="notification-badge" />}
          </button>

          {notifOpen && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <span>Alerts Feed ({unreadCount})</span>
                {notifications.length > 0 && (
                  <button 
                    className="notification-clear-btn"
                    onClick={clearNotifications}
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="notification-list">
                {notifications.length === 0 ? (
                  <div className="text-center" style={{ padding: '20px 0', color: 'var(--text-muted)' }}>
                    No pending alarms.
                  </div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      className="notification-item"
                      onClick={() => handleNotifClick(n)}
                      style={{ cursor: 'pointer' }}
                    >
                      <span className="notification-item-title">{n.title}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{n.content}</span>
                      <span className="notification-item-time">
                        {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
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
                  <div className="cmd-item" onClick={() => { setActiveView('analytics'); setCmdOpen(false); }}>
                    <span>📈 Go to Visual Analytics Report</span>
                    <span className="cmd-shortcut">G + A</span>
                  </div>
                  <div className="cmd-item" onClick={() => { setActiveView('whatsapp'); setCmdOpen(false); }}>
                    <span>💬 Go to WhatsApp Chat Console</span>
                    <span className="cmd-shortcut">G + W</span>
                  </div>
                  <div className="cmd-item" onClick={() => { setActiveView('settings'); setCmdOpen(false); }}>
                    <span>⚙️ Go to System Configurations</span>
                    <span className="cmd-shortcut">G + S</span>
                  </div>

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
