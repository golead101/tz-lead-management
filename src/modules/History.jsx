import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';

export default function History() {
  const { leads, activeRole, activeUser } = useCRM();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');

  // Filter leads based on counselor permissions
  const visibleLeads = leads.filter(lead => {
    if (activeRole === 'Counselor') {
      const src = (lead.source || '').toLowerCase();
      const isGlobal = src.includes('meta') || src.includes('google') || src.includes('website');
      return lead.counselor === activeUser || isGlobal;
    }
    return true;
  });

  // Extract and flatten all timeline nodes from visible leads
  const allHistory = [];
  visibleLeads.forEach(lead => {
    if (lead.timeline && Array.isArray(lead.timeline)) {
      lead.timeline.forEach(node => {
        allHistory.push({
          ...node,
          leadId: lead.id,
          leadName: lead.name,
          leadEmail: lead.email,
          leadPhone: lead.phone
        });
      });
    }
  });

  // Sort by timestamp descending
  allHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Filter by search query and type
  const filteredHistory = allHistory.filter(item => {
    if (filterType !== 'All' && item.type !== filterType) return false;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.leadName.toLowerCase().includes(q) ||
        (item.title || '').toLowerCase().includes(q) ||
        (item.content || '').toLowerCase().includes(q) ||
        (item.user || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getEventIcon = (type) => {
    switch (type) {
      case 'call':
        return (
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 2.2 1.64z"/></svg>
          </div>
        );
      case 'whatsapp':
        return (
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          </div>
        );
      case 'system':
        return (
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#faf5ff', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>
          </div>
        );
      default:
        return (
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          </div>
        );
    }
  };

  return (
    <div className="fade-in">
      <div className="welcome-header" style={{ marginBottom: '20px' }}>
        <h2 className="welcome-title">Activity History & Audit Log</h2>
        <p className="welcome-subtitle">Chronological archive of all customer interactions, call outcomes, WhatsApp messages, and automated system events.</p>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search history by student name, log content, or agent..."
            style={{ paddingLeft: '38px', borderRadius: '10px' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#64748b" strokeWidth="2.5" style={{ position: 'absolute', left: '14px', top: '12px' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>

        <select
          className="form-control"
          style={{ width: '160px', borderRadius: '10px' }}
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="All">All Event Types</option>
          <option value="call">Phone Calls</option>
          <option value="whatsapp">WhatsApp Messages</option>
          <option value="system">System Updates</option>
        </select>
      </div>

      {/* Timeline Stream */}
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.01)' }}>
        {filteredHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '12px', opacity: 0.7 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>No history records matched</h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '12.5px' }}>Try modifying your filters or search terms.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {filteredHistory.map(item => (
              <div key={item.id} style={{ display: 'flex', gap: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                {getEventIcon(item.type)}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
                    <div>
                      <span style={{ fontWeight: '750', fontSize: '13.5px', color: '#0f172a' }}>{item.title}</span>
                      <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '8px' }}>
                        for <strong style={{ color: 'var(--primary)' }}>{item.leadName}</strong>
                      </span>
                    </div>
                    <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                      {new Date(item.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '12.5px', color: '#475569', lineHeight: '1.5' }}>{item.content}</p>
                  <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#e2e8f0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7.5px', fontWeight: '700' }}>
                      {(item.user || 'System').split(' ').map(n=>n[0]).join('').toUpperCase()}
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Action by: {item.user || 'System'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
