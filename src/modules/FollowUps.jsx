import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import DetailTimeline from './DetailTimeline';

export default function FollowUps() {
  const { leads, selectedLeadId, setSelectedLeadId, setActiveView, showDetailModal, setShowDetailModal, logCall, pipelineStages } = useCRM();
  const [activeTab, setActiveTab] = useState('overdue'); // Default to overdue as in the mockup

  const [modalStep, setModalStep] = useState(1); // 1 = simple contact view, 2 = call outcome form
  const [callStatus, setCallStatus] = useState('Connected');
  const [callInterest, setCallInterest] = useState('Interested');
  const [callQuestions, setCallQuestions] = useState([]);
  const [callNotes, setCallNotes] = useState('');
  const [callUpdateStage, setCallUpdateStage] = useState('');
  const [callSchedFollowup, setCallSchedFollowup] = useState(false);
  const [callFollowupDate, setCallFollowupDate] = useState('');
  const [callFollowupReason, setCallFollowupReason] = useState('');

  const handleQuestionToggle = (qName) => {
    setCallQuestions(prev => 
      prev.includes(qName) ? prev.filter(q => q !== qName) : [...prev, qName]
    );
  };

  const handleSubmitCall = (leadId) => {
    logCall(leadId, {
      status: callStatus,
      interest: callInterest,
      questions: callQuestions,
      notes: callNotes,
      updateStage: callUpdateStage,
      scheduleFollowup: callSchedFollowup,
      followupDate: callFollowupDate,
      followupReason: callFollowupReason
    });

    // Reset Form & Close
    setCallStatus('Connected');
    setCallInterest('Interested');
    setCallQuestions([]);
    setCallNotes('');
    setCallUpdateStage('');
    setCallSchedFollowup(false);
    setCallFollowupDate('');
    setCallFollowupReason('');
    setSelectedLeadId(null);
    setShowDetailModal(false);
  };

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
    setModalStep(1);
    setCallStatus('Connected');
    setCallInterest('Interested');
    setCallQuestions([]);
    setCallNotes('');
    setCallUpdateStage('');
    setCallSchedFollowup(false);
    setCallFollowupDate('');
    setCallFollowupReason('');
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
      {showDetailModal && (() => {
        const selectedLead = leads.find(l => l.id === selectedLeadId);
        return (
          <div className="lead-detail-modal-overlay" onClick={() => { setSelectedLeadId(null); setShowDetailModal(false); }}>
            <div className="lead-detail-modal-content" onClick={(e) => e.stopPropagation()} style={modalStep === 1 ? { maxWidth: '440px', height: 'auto', padding: '36px 24px', textAlign: 'center' } : { maxWidth: '540px', height: 'auto', maxHeight: '90vh', overflowY: 'auto', padding: '0' }}>
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

              {modalStep === 1 && selectedLead && (
                <div>
                  <div style={{ 
                    width: '64px', 
                    height: '64px', 
                    borderRadius: '50%', 
                    background: 'var(--primary-glow, rgba(37, 99, 235, 0.08))', 
                    color: 'var(--primary, #2563eb)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '24px', 
                    fontWeight: '700', 
                    margin: '0 auto 16px' 
                  }}>
                    {selectedLead.name ? selectedLead.name.split(' ').map(n => n[0]).join('').toUpperCase() : '?'}
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary, #0f172a)', marginBottom: '8px' }}>
                    {selectedLead.name}
                  </h3>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px', 
                    fontSize: '15px', 
                    color: 'var(--text-secondary, #475569)',
                    fontWeight: '600',
                    marginBottom: '28px'
                  }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--primary, #2563eb)' }}>
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    {selectedLead.phone}
                  </div>
                  <button 
                    type="button" 
                    className="primary-btn" 
                    onClick={() => setModalStep(2)}
                    style={{ 
                      margin: '0 auto', 
                      padding: '8px 24px', 
                      borderRadius: '8px', 
                      fontSize: '13px', 
                      fontWeight: '700',
                      cursor: 'pointer',
                      border: 'none',
                      background: 'var(--primary, #2563eb)',
                      color: '#fff'
                    }}
                  >
                    Submit
                  </button>
                </div>
              )}

              {modalStep === 2 && selectedLead && (
                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                  {/* Header */}
                  <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb' }}>
                    <h4 className="modal-title" style={{ margin: '0', fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>Log Phone/WhatsApp Call Outcome</h4>
                  </div>

                  {/* Body */}
                  <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>Call Connection Status</label>
                        <select 
                          className="form-control" 
                          value={callStatus} 
                          onChange={(e) => setCallStatus(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                        >
                          <option value="Connected">Connected / Talked</option>
                          <option value="No Answer">No Answer / Ringing</option>
                          <option value="Busy">Busy</option>
                          <option value="Switched Off">Switched Off / Switched Off</option>
                          <option value="Wrong Number">Wrong Number</option>
                        </select>
                      </div>
                      <div>
                        <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>Interest Level</label>
                        <select 
                          className="form-control" 
                          value={callInterest} 
                          onChange={(e) => setCallInterest(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                        >
                          <option value="Highly Interested">🔥 Highly Interested</option>
                          <option value="Interested">☀️ Interested</option>
                          <option value="Needs Time">⏳ Needs Time</option>
                          <option value="Not Interested">❄️ Not Interested</option>
                        </select>
                      </div>
                    </div>

                    {/* Key Topics / Student Inquiries */}
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column' }}>
                      <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>Key Topics / Student Inquiries</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12.5px', color: 'var(--text-primary)' }}>
                        {['Fees Structure', 'Course Duration', 'Job Placements', 'Internships', 'Demo Class Required', 'Timing Batches'].map(q => (
                          <label key={q} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                            <input 
                              type="checkbox" 
                              checked={callQuestions.includes(q)}
                              onChange={() => handleQuestionToggle(q)}
                            />
                            {q}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Detailed Interaction Notes */}
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column' }}>
                      <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>Detailed Interaction Notes</label>
                      <textarea 
                        className="form-control" 
                        placeholder="Detail what was discussed..."
                        value={callNotes}
                        onChange={(e) => setCallNotes(e.target.value)}
                        style={{ width: '100%', minHeight: '80px', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', resize: 'vertical' }}
                      />
                    </div>

                    {/* Pipeline Stage Shift (Optional) */}
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column' }}>
                      <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>Pipeline Stage Shift (Optional)</label>
                      <select 
                        className="form-control"
                        value={callUpdateStage}
                        onChange={(e) => setCallUpdateStage(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                      >
                        <option value="">Keep current stage ({selectedLead?.stage})</option>
                        {pipelineStages.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>

                    {/* Schedule Follow-up callback? */}
                    <div className="form-group" style={{ background: 'var(--bg-card-hover, rgba(0,0,0,0.01))', border: '1px solid var(--border-color)', padding: '12px 14px', borderRadius: 'var(--radius-md)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)', marginBottom: callSchedFollowup ? '10px' : '0' }}>
                        <input 
                          type="checkbox" 
                          checked={callSchedFollowup}
                          onChange={(e) => setCallSchedFollowup(e.target.checked)}
                        />
                        Schedule Follow-up callback?
                      </label>

                      {callSchedFollowup && (
                        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div>
                            <label className="form-label" style={{ display: 'block', fontSize: '11.5px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>Callback Date & Time</label>
                            <input 
                              type="datetime-local" 
                              className="form-control"
                              required={callSchedFollowup}
                              value={callFollowupDate}
                              onChange={(e) => setCallFollowupDate(e.target.value)}
                              style={{ width: '100%', padding: '6px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                            />
                          </div>
                          <div>
                            <label className="form-label" style={{ display: 'block', fontSize: '11.5px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>Follow-up Goal / Objective</label>
                            <input 
                              type="text" 
                              className="form-control" 
                              placeholder="e.g. brochures feedback check, Zoom call"
                              value={callFollowupReason}
                              onChange={(e) => setCallFollowupReason(e.target.value)}
                              style={{ width: '100%', padding: '6px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="modal-footer" style={{ padding: '16px 20px', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f9fafb' }}>
                    <button 
                      type="button" 
                      className="secondary-btn" 
                      onClick={() => { setSelectedLeadId(null); setShowDetailModal(false); }}
                      style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', border: '1px solid var(--border-color)', background: '#fff', color: 'var(--text-secondary)' }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      className="primary-btn" 
                      onClick={() => handleSubmitCall(selectedLead.id)}
                      style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', border: 'none', background: 'var(--primary, #2563eb)', color: '#fff' }}
                    >
                      Commit Log
                    </button>
                  </div>
                </div>
              )}

              {!selectedLead && (
                <p style={{ color: 'var(--text-muted)' }}>Lead not found.</p>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
