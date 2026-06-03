import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import DetailTimeline from './DetailTimeline';

export default function FollowUps() {
  const { leads, setSelectedLeadId, setActiveView } = useCRM();
  const [activeTab, setActiveTab] = useState('overdue'); // Default to overdue as in the mockup
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Filter leads that have followupDate set
  const followUpLeads = leads.filter(lead => lead.followupDate);

  // Group into overdue and upcoming
  const now = new Date();
  const overdueLeads = followUpLeads.filter(lead => new Date(lead.followupDate) < now);
  const upcomingLeads = followUpLeads.filter(lead => new Date(lead.followupDate) >= now);

  const displayedLeads = activeTab === 'overdue' ? overdueLeads : upcomingLeads;

  // Format date nicely: e.g. "Wednesday, May 13 at 9:00 AM"
  const formatFollowupDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const options = { weekday: 'long', month: 'short', day: 'numeric' };
      const formattedDate = date.toLocaleDateString('en-US', options);
      const formattedTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      return `${formattedDate} at ${formattedTime}`;
    } catch (e) {
      return dateString;
    }
  };

  const handleCallClick = (lead) => {
    setSelectedLeadId(lead.id);
    setShowDetailModal(true);
  };

  return (
    <div className="followups-page fade-in">
      <div className="welcome-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="welcome-title">Follow-ups</h2>
          <p className="welcome-subtitle">Scheduled callbacks and reminders.</p>
        </div>
        <button 
          className="refresh-btn-mock"
          onClick={() => window.location.reload()}
          title="Refresh List"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
          </svg>
        </button>
      </div>

      <div className="followups-tab-selector-row">
        <button 
          type="button"
          className={`followup-tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming <span className="badge badge-gray">{upcomingLeads.length}</span>
        </button>
        <button 
          type="button"
          className={`followup-tab-btn ${activeTab === 'overdue' ? 'active' : ''}`}
          onClick={() => setActiveTab('overdue')}
        >
          Overdue <span className="badge badge-red">{overdueLeads.length}</span>
        </button>
      </div>

      <div className="followups-list-container">
        {displayedLeads.length === 0 ? (
          <div className="empty-state-card text-center" style={{ padding: '60px 24px', background: '#fff', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)' }}>
            <svg viewBox="0 0 24 24" width="60" height="60" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ margin: '0 auto 16px', display: 'block' }}>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '8px' }}>No Scheduled Follow-ups</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>All caught up! There are no {activeTab} follow-ups scheduled.</p>
          </div>
        ) : (
          <div className="followups-grid">
            {displayedLeads.map(lead => {
              const isOverdue = activeTab === 'overdue';
              return (
                <div key={lead.id} className={`followup-lead-card ${isOverdue ? 'card-overdue' : 'card-upcoming'}`} onClick={() => handleCallClick(lead)}>
                  <div className="card-left-icon-container">
                    <div className={`calendar-icon-block ${isOverdue ? 'bg-red-light' : 'bg-blue-light'}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </div>
                  </div>

                  <div className="card-middle-info">
                    <div className="card-name-row">
                      <span className="lead-name">{lead.name}</span>
                      <span className={`status-pill ${isOverdue ? 'pill-late' : 'pill-scheduled'}`}>
                        {isOverdue ? 'Late' : 'Scheduled'}
                      </span>
                    </div>

                    <div className="card-detail-item" style={{ marginTop: '4px' }}>
                      <svg viewBox="0 0 24 24" className="detail-icon" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      <span className="detail-text">{lead.phone}</span>
                    </div>

                    <div className="card-detail-item">
                      <svg viewBox="0 0 24 24" className="detail-icon" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span className="detail-text text-semibold">{formatFollowupDate(lead.followupDate)}</span>
                    </div>

                    <p className="lead-note">
                      "{lead.followupReason || 'No special note provided.'}"
                    </p>
                  </div>

                  <div className="card-right-actions" onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="call-now-btn" onClick={() => handleCallClick(lead)}>
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" style={{ marginRight: '4px' }}>
                        <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-2.2 2.2a15.045 15.045 0 0 1-6.59-6.59l2.2-2.21a.96.96 0 0 0 .25-1A11.36 11.36 0 0 1 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.58c0-.56-.45-1.04-1-1.04z" />
                      </svg>
                      Call Now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ──────────── LEAD DETAIL MODAL ──────────── */}
      {showDetailModal && (
        <div className="lead-detail-modal-overlay" onClick={() => { setSelectedLeadId(null); setShowDetailModal(false); }}>
          <div className="lead-detail-modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              className="lead-detail-modal-close" 
              onClick={() => { setSelectedLeadId(null); setShowDetailModal(false); }}
              title="Close Details"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <DetailTimeline 
              onClose={() => { setSelectedLeadId(null); setShowDetailModal(false); }} 
              backText="Back to Follow-ups"
              hideTimeline={false} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
