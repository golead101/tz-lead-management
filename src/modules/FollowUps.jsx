import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import DetailTimeline from './DetailTimeline';

export default function FollowUps() {
  const { leads, selectedLeadId, setSelectedLeadId, setActiveView, showDetailModal, setShowDetailModal, logCall, pipelineStages } = useCRM();
  const [activeTab, setActiveTab] = useState('overdue'); // Default to overdue as in the mockup

  // New filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterSource, setFilterSource] = useState('');

  const [modalStep, setModalStep] = useState(1); // 1 = simple contact view, 2 = call outcome form
  const [callStatus, setCallStatus] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
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
    const isFollowupSched = (callStatus === 'Interested' || callStatus === 'Call Later' || callStatus === 'No Answer') && !!callFollowupDate;
    logCall(leadId, {
      status: callStatus,
      interest: callInterest,
      questions: callQuestions,
      notes: callNotes,
      updateStage: callUpdateStage,
      scheduleFollowup: isFollowupSched,
      followupDate: isFollowupSched ? callFollowupDate : '',
      followupReason: isFollowupSched ? (callNotes || 'Scheduled callback') : ''
    });

    // Reset Form & Close
    setCallStatus('');
    setCallInterest('Interested');
    setCallQuestions([]);
    setCallNotes('');
    setCallUpdateStage('');
    setCallSchedFollowup(false);
    setCallFollowupDate('');
    setSelectedLeadId(null);
    setShowDetailModal(false);
  };

  // Filter leads that have followupDate set OR stage is Follow-up
  let followUpLeads = leads.filter(lead => lead.followupDate || lead.stage === 'Follow-up');

  // Apply search and dropdown filters
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    followUpLeads = followUpLeads.filter(l => l.name?.toLowerCase().includes(q) || l.phone?.includes(q));
  }
  if (filterStage) {
    followUpLeads = followUpLeads.filter(l => l.stage === filterStage);
  }
  if (filterSource) {
    followUpLeads = followUpLeads.filter(l => l.source === filterSource);
  }

  // Group into overdue and upcoming
  const now = new Date();
  const overdueLeads = followUpLeads.filter(lead => lead.followupDate && new Date(lead.followupDate) < now);
  const upcomingLeads = followUpLeads.filter(lead => !lead.followupDate || new Date(lead.followupDate) >= now);

  const displayedLeads = activeTab === 'overdue' ? overdueLeads : upcomingLeads;

  // Format date nicely: e.g. "Wednesday, May 13 at 9:00 AM"
  const formatFollowupDate = (dateString) => {
    if (!dateString) return 'Time not specified';
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
    setCallStatus('');
    setCallInterest('Interested');
    setCallQuestions([]);
    setCallNotes('');
    setCallUpdateStage('');
    setCallSchedFollowup(false);
    setCallFollowupDate('');
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

      <div className="followups-filters" style={{ display: 'flex', gap: '12px', padding: '0 24px 16px 24px', flexWrap: 'wrap' }}>
        <input 
          type="text" 
          placeholder="Search name or phone..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', minWidth: '220px', fontSize: '13px', outline: 'none' }}
        />
        <select 
          value={filterStage} 
          onChange={(e) => setFilterStage(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', minWidth: '160px', fontSize: '13px', outline: 'none', backgroundColor: '#fff' }}
        >
          <option value="">All Stages</option>
          {pipelineStages.map(stage => (
            <option key={stage.id} value={stage.name}>{stage.name}</option>
          ))}
        </select>
        <select 
          value={filterSource} 
          onChange={(e) => setFilterSource(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', minWidth: '160px', fontSize: '13px', outline: 'none', backgroundColor: '#fff' }}
        >
          <option value="">All Sources</option>
          {Array.from(new Set(leads.map(l => l.source).filter(Boolean))).map(source => (
            <option key={source} value={source}>{source}</option>
          ))}
        </select>
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
                <div key={lead.id} className="followup-lead-card" onClick={() => handleCallClick(lead)}>
                  <div className="card-left-icon-container">
                    <div className="calendar-icon-block-circle">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '22px', height: '22px' }}>
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </div>
                  </div>

                  <div className="card-middle-info">
                    <div className="card-name-row" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="lead-name" style={{ fontSize: '15.5px', fontWeight: '750', color: '#111827' }}>{lead.name}</span>
                      {isOverdue ? (
                        <span className="followup-status-badge overdue">
                          <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '3px' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                          Overdue
                        </span>
                      ) : (
                        <span className="followup-status-badge upcoming">
                          <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '3px' }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          Upcoming
                        </span>
                      )}
                    </div>

                    <div className="card-meta-row" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginTop: '6px' }}>
                      <div className="card-detail-inline" style={{ display: 'flex', alignItems: 'center' }}>
                        <svg viewBox="0 0 24 24" className="detail-icon" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '13px', height: '13px', marginRight: '4px', color: '#9ca3af' }}>
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                        <span style={{ fontSize: '13px', color: '#6b7280' }}>{lead.phone}</span>
                      </div>

                      <div className="card-detail-inline" style={{ display: 'flex', alignItems: 'center' }}>
                        <svg viewBox="0 0 24 24" className="detail-icon" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '13px', height: '13px', marginRight: '4px', color: '#2563eb' }}>
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span style={{ fontSize: '13px', color: '#2563eb', fontWeight: '600' }}>
                          {lead.followupDate ? formatFollowupDate(lead.followupDate) : 'Time not set'}
                        </span>
                      </div>
                    </div>

                    <p className="lead-note-line">
                      {lead.followupReason || 'No special note provided.'}
                    </p>
                  </div>

                  <div className="card-right-actions" onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="call-now-btn-pill" onClick={() => handleCallClick(lead)}>
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
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
            <div className="lead-detail-modal-content" onClick={(e) => e.stopPropagation()} style={modalStep === 1 ? { maxWidth: '440px', height: 'auto', padding: '32px 24px', borderRadius: '24px', textAlign: 'left' } : { maxWidth: '540px', height: 'auto', maxHeight: '90vh', overflow: 'visible', padding: '0', borderRadius: '16px' }}>
              <button 
                type="button" 
                className="lead-detail-modal-close" 
                onClick={() => { setSelectedLeadId(null); setShowDetailModal(false); }}
                title="Close Details"
                style={{ top: '8px', marginRight: '0px' }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>

              {modalStep === 1 && selectedLead && (
                <div style={{ textAlign: 'left' }}>
                  {/* Title Header Section */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '6px', paddingRight: '24px' }}>
                    <div style={{ color: '#0b4ec2', marginTop: '2px' }}>
                      <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </div>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: '0 0 4px 0' }}>
                        Call Lead
                      </h3>
                      <p style={{ fontSize: '13px', color: '#64748b', margin: '0', lineHeight: '1.4' }}>
                        Use the details below to contact this lead. Click "Done" after your call.
                      </p>
                    </div>
                  </div>

                  {/* Main Contact Card Container */}
                  <div style={{ 
                    background: '#ffffff', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '20px', 
                    padding: '20px', 
                    marginTop: '20px', 
                    marginBottom: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}>
                    {/* Top User Row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ 
                        width: '54px', 
                        height: '54px', 
                        borderRadius: '50%', 
                        background: '#eff6ff', 
                        color: '#1e40af', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: '18px', 
                        fontWeight: '700' 
                      }}>
                        {selectedLead.name ? selectedLead.name.split(' ').map(n => n[0]).join('').toUpperCase() : '?'}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '16px', fontWeight: '750', color: '#0f172a' }}>{selectedLead.name}</span>
                        <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '500' }}>Lead Contact</span>
                      </div>
                    </div>

                    {/* Bottom Phone Details Subcard */}
                    <div style={{ 
                      background: '#f8fafc', 
                      borderRadius: '16px', 
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px'
                    }}>
                      <div style={{ 
                        width: '38px', 
                        height: '38px', 
                        borderRadius: '50%', 
                        background: '#dbeafe', 
                        color: '#1e40af', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Phone</span>
                        <span style={{ fontSize: '16.5px', color: '#0b4ec2', fontWeight: '750' }}>{selectedLead.phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Buttons Action Bar */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '14px' 
                  }}>
                    <button 
                      type="button" 
                      onClick={() => { setSelectedLeadId(null); setShowDetailModal(false); }}
                      style={{ 
                        padding: '10px 24px', 
                        borderRadius: '9999px', 
                        fontSize: '13px', 
                        fontWeight: '700',
                        cursor: 'pointer',
                        background: '#ffffff',
                        border: '1.5px solid #1e293b',
                        color: '#1e293b',
                        transition: 'background 0.2s'
                      }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setModalStep(2)}
                      style={{ 
                        padding: '10px 24px', 
                        borderRadius: '9999px', 
                        fontSize: '13px', 
                        fontWeight: '700',
                        cursor: 'pointer',
                        border: 'none',
                        background: '#0b4ec2',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'background 0.2s'
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ background: 'transparent' }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Done — Log Result
                    </button>
                  </div>
                </div>
              )}

              {modalStep === 2 && selectedLead && (
                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', background: '#fff', borderRadius: '16px', overflow: 'visible' }}>
                  {/* Header */}
                  <div className="modal-header" style={{ padding: '20px 24px 12px', borderBottom: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#fff' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1e293b', fontFamily: 'var(--font-heading)' }}>Log Call Result</h3>
                      <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Record the outcome of your call with {selectedLead.name}.</p>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="modal-body" style={{ padding: '12px 24px 20px', display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'visible' }}>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
                      <label className="form-label" style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                        Call Outcome <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      
                      {/* Custom select trigger */}
                      <div style={{ position: 'relative' }}>
                        <button 
                          type="button"
                          onClick={() => setDropdownOpen(!dropdownOpen)}
                          style={{ 
                            width: '100%', 
                            padding: '10px 14px', 
                            borderRadius: '10px', 
                            border: '1px solid #cbd5e1', 
                            background: '#fff', 
                            color: callStatus ? '#1e293b' : '#94a3b8', 
                            fontSize: '14px', 
                            fontWeight: '555',
                            textAlign: 'left',
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center' }}>
                            {callStatus === '' && '— Select an outcome —'}
                            {callStatus === 'Interested' && (
                              <>
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#22c55e" strokeWidth="2.5" style={{ marginRight: '8px' }}><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" /></svg>
                                Interested
                              </>
                            )}
                            {callStatus === 'Converted' && (
                              <>
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#f97316" strokeWidth="2.5" style={{ marginRight: '8px' }}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" /><path d="M12 2a7 7 0 0 0-7 7c0 2.62 1.34 4.5 3 5.34a8.26 8.26 0 0 0 8 0c1.66-.84 3-2.72 3-5.34a7 7 0 0 0-7-7z" /></svg>
                                Converted / Won
                              </>
                            )}
                            {callStatus === 'Call Later' && (
                              <>
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#2563eb" strokeWidth="2.5" style={{ marginRight: '8px' }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><path d="M12 14v4M10 16h4" /></svg>
                                Call Later / Follow up
                              </>
                            )}
                            {callStatus === 'Not Interested' && (
                              <>
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ef4444" strokeWidth="2.5" style={{ marginRight: '8px' }}><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                                Not Interested
                              </>
                            )}
                            {callStatus === 'No Answer' && (
                              <>
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ea580c" strokeWidth="2.5" style={{ marginRight: '8px' }}><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" /><line x1="23" y1="1" x2="1" y2="23" /></svg>
                                No Answer
                              </>
                            )}
                            {callStatus === 'Invalid Number' && (
                              <>
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#64748b" strokeWidth="2.5" style={{ marginRight: '8px' }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                                Invalid Number
                              </>
                            )}
                          </span>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#64748b" strokeWidth="2.5" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>

                        {dropdownOpen && (
                          <div 
                            style={{ 
                              position: 'absolute', 
                              top: '100%', 
                              left: 0, 
                              right: 0, 
                              marginTop: '6px', 
                              background: '#fff', 
                              border: '1px solid #cbd5e1', 
                              borderRadius: '12px', 
                              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', 
                              zIndex: 1200,
                              padding: '6px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px'
                            }}
                          >
                            {[
                              { val: 'Interested', label: 'Interested', stroke: '#22c55e', path: <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" /> },
                              { val: 'Converted', label: 'Converted / Won', stroke: '#f97316', path: <><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" /><path d="M12 2a7 7 0 0 0-7 7c0 2.62 1.34 4.5 3 5.34a8.26 8.26 0 0 0 8 0c1.66-.84 3-2.72 3-5.34a7 7 0 0 0-7-7z" /></> },
                              { val: 'Call Later', label: 'Call Later / Follow up', stroke: '#2563eb', path: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><path d="M12 14v4M10 16h4" /></> },
                              { val: 'Not Interested', label: 'Not Interested', stroke: '#ef4444', path: <><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></> },
                              { val: 'No Answer', label: 'No Answer', stroke: '#ea580c', path: <><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" /><line x1="23" y1="1" x2="1" y2="23" /></> }
                            ].map(item => (
                              <div 
                                key={item.val}
                                onClick={() => {
                                  setCallStatus(item.val);
                                  setDropdownOpen(false);
                                }}
                                style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  padding: '10px 12px', 
                                  borderRadius: '8px', 
                                  fontSize: '14px', 
                                  fontWeight: '550',
                                  color: '#1e293b',
                                  cursor: 'pointer',
                                  background: callStatus === item.val ? '#fef3c7' : 'transparent',
                                  transition: 'all 0.15s'
                                }}
                                onMouseEnter={(e) => { if (callStatus !== item.val) e.currentTarget.style.background = '#f1f5f9'; }}
                                onMouseLeave={(e) => { if (callStatus !== item.val) e.currentTarget.style.background = 'transparent'; }}
                              >
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={item.stroke} strokeWidth="2.5" style={{ marginRight: '8px' }}>
                                  {item.path}
                                </svg>
                                {item.label}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label className="form-label" style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155' }}>Notes</label>
                      <textarea 
                        className="form-control" 
                        placeholder="What was discussed?"
                        value={callNotes}
                        onChange={(e) => setCallNotes(e.target.value)}
                        style={{ width: '100%', minHeight: '110px', padding: '12px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', color: '#1e293b', fontSize: '14px', outline: 'none', resize: 'vertical' }}
                      />
                    </div>

                    {/* Schedule Follow-up card */}
                    {(callStatus === 'Interested' || callStatus === 'Call Later' || callStatus === 'No Answer') && (
                      <div 
                        className="fade-in" 
                        style={{ 
                          background: '#eff6ff', 
                          border: '1px dashed #bfdbfe', 
                          borderRadius: '16px', 
                          padding: '16px', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '12px',
                          marginTop: '4px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e3a8a', fontWeight: '700', fontSize: '14px' }}>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          Schedule Follow-up
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Follow-up Date & Time</label>
                          <input 
                            type="datetime-local" 
                            value={callFollowupDate}
                            onChange={(e) => setCallFollowupDate(e.target.value)}
                            style={{ 
                              width: '100%', 
                              padding: '10px 14px', 
                              borderRadius: '10px', 
                              border: '1px solid #cbd5e1', 
                              background: '#fff', 
                              color: '#1e293b', 
                              fontSize: '14px', 
                              outline: 'none'
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="modal-footer" style={{ padding: '16px 24px 24px', borderTop: 'none', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#fff' }}>
                    <button 
                      type="button" 
                      onClick={() => setModalStep(1)}
                      style={{ padding: '8px 24px', borderRadius: '24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', border: '1px solid #cbd5e1', background: '#fff', color: '#334155', transition: 'all 0.2s' }}
                    >
                      Back
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleSubmitCall(selectedLead.id)}
                      disabled={!callStatus}
                      style={{ padding: '8px 24px', borderRadius: '24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', border: 'none', background: '#0b57d0', color: '#fff', opacity: !callStatus ? 0.65 : 1, transition: 'all 0.2s' }}
                    >
                      Save Call Log
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
