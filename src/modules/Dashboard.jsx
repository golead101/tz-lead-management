import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';

export default function Dashboard() {
  const {
    leads,
    courses,
    activeRole,
    activeUser,
    setActiveView,
    setSelectedLeadId,
    completeFollowup
  } = useCRM();

  // Filter leads based on counselor permissions
  const visibleLeads = leads.filter(lead => {
    if (activeRole === 'Counselor') {
      return lead.counselor === activeUser;
    }
    return true;
  });

  // Calculate dynamic KPIs
  const newLeadsCount = visibleLeads.filter(l => l.stage === 'New Lead').length;
  const activePipelineCount = visibleLeads.filter(l => 
    !['Converted', 'Closed', 'Not Interested'].includes(l.stage)
  ).length;
  const convertedCount = visibleLeads.filter(l => l.stage === 'Converted').length;

  // Overdue followups count (scheduled in the past)
  const overdueFollowups = visibleLeads.filter(l => {
    if (!l.followupDate) return false;
    return new Date(l.followupDate) < new Date();
  });

  const overdueCount = overdueFollowups.length;

  // Today's/All pending follow-ups sorted by date
  const pendingFollowups = visibleLeads
    .filter(l => l.followupDate)
    .sort((a, b) => new Date(a.followupDate) - new Date(b.followupDate));

  // Course Popularity metrics
  const getCourseLeadCount = (courseName) => {
    return visibleLeads.filter(l => l.course === courseName).length;
  };

  // Counselor Workloads
  const getCounselorLoad = (counselorName) => {
    return leads.filter(l => l.counselor === counselorName && !['Converted', 'Closed', 'Not Interested'].includes(l.stage)).length;
  };

  const handleActionClick = (leadId, subView = 'detail') => {
    setSelectedLeadId(leadId);
    setActiveView(subView);
  };

  return (
    <div className="fade-in">
      {/* Welcome Message */}
      <div className="welcome-header">
        <h2 className="welcome-title">Welcome back, {activeUser}</h2>
        <p className="welcome-subtitle">Here is the active enrollment pipeline metrics for your dashboard today.</p>
      </div>

      {/* KPI Counters */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-details">
            <span className="kpi-label">New Inquiries</span>
            <span className="kpi-value">{newLeadsCount}</span>
            <span className="kpi-delta up">Fresh captures</span>
          </div>
          <div className="kpi-icon icon-new">
            <svg viewBox="0 0 24 24"><path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-details">
            <span className="kpi-label">Active Pipeline</span>
            <span className="kpi-value">{activePipelineCount}</span>
            <span className="kpi-delta up">Leads in progress</span>
          </div>
          <div className="kpi-icon icon-active">
            <svg viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-details">
            <span className="kpi-label">Converted Students</span>
            <span className="kpi-value">{convertedCount}</span>
            <span className="kpi-delta up">Fully enrolled</span>
          </div>
          <div className="kpi-icon icon-convert">
            <svg viewBox="0 0 24 24"><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
          </div>
        </div>

        <div className="kpi-card" style={overdueCount > 0 ? { border: '1px solid rgba(244, 63, 94, 0.4)' } : {}}>
          <div className="kpi-details">
            <span className="kpi-label">Overdue Callbacks</span>
            <span className="kpi-value" style={overdueCount > 0 ? { color: '#f43f5e' } : {}}>{overdueCount}</span>
            <span className="kpi-delta down" style={overdueCount > 0 ? { color: '#f43f5e' } : {}}>Requires attention</span>
          </div>
          <div className="kpi-icon icon-urgent">
            <svg viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
          </div>
        </div>
      </div>

      {/* Real-Time System Captures & Actions Ticker Announcement Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '24px' }}>
        <div style={{ fontSize: '10px', fontWeight: '850', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px', paddingLeft: '2px' }}>
          <span className="live-pulse" style={{ width: '6px', height: '6px', background: '#e11d48', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1.8s infinite ease-in-out' }}></span>
          Real-Time System Captures & Actions Ticker
        </div>
        <div className="dashboard-live-ticker" style={{ margin: 0, height: '38px', background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
          <div className="ticker-track">
            {(() => {
              const alerts = [];
              leads.forEach(l => {
                if (l.timeline && l.timeline.length > 0) {
                  const lastNode = l.timeline[l.timeline.length - 1];
                  alerts.push({
                    text: `${l.name} - ${lastNode.title} (${new Date(lastNode.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                  });
                }
              });
              if (alerts.length < 3) {
                alerts.push({ text: 'System active: Snip Webhook capture listening.' });
                alerts.push({ text: 'CRM balanced: Counselor loads monitored.' });
                alerts.push({ text: 'Enrollments running: Next-gen counselor widgets live.' });
              }
              // Quadruple alerts for a super-long loop that glides slowly
              const fullList = [...alerts, ...alerts, ...alerts, ...alerts];
              return fullList.map((a, i) => (
                <div key={i} className="ticker-item" style={{ gap: '8px' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>⚡</span>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>{a.text}</span>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="dashboard-layout-grid">
        {/* Left Hand: Follow-ups List */}
        <div className="dashboard-panel">
          <div className="panel-header">
            <h3 className="panel-title">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              Actionable Counselor Follow-ups ({pendingFollowups.length})
            </h3>
            <button className="secondary-btn" onClick={() => setActiveView('board')}>
              Pipeline Board
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
            {pendingFollowups.length === 0 ? (
              <div className="text-center" style={{ padding: '40px 0', color: 'var(--text-muted)' }}>
                🎉 Great job! No pending callback followups in your queue.
              </div>
            ) : (
              pendingFollowups.map(lead => {
                const isOverdue = new Date(lead.followupDate) < new Date();
                return (
                  <div key={lead.id} className="followup-row">
                    <div className="followup-lead-info">
                      <span className="followup-name" onClick={() => handleActionClick(lead.id, 'detail')} style={{ cursor: 'pointer' }}>
                        {lead.name}
                      </span>
                      <span className="followup-desc">
                        {lead.course} • <strong>Reason:</strong> {lead.followupReason}
                      </span>
                    </div>

                    <div className="flex align-center gap-2">
                      <span className={`followup-time-badge ${isOverdue ? '' : 'upcoming'}`}>
                        {isOverdue ? '⚠️ Overdue' : '⏰ Scheduled'}: {new Date(lead.followupDate).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      
                      <button 
                        className="action-icon-btn" 
                        title="Open WhatsApp Chat" 
                        onClick={() => handleActionClick(lead.id, 'whatsapp')}
                        style={{ color: '#10b981' }}
                      >
                        <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
                      </button>

                      <button 
                        className="action-icon-btn" 
                        title="Log Interaction Outcome"
                        onClick={() => handleActionClick(lead.id, 'detail')}
                        style={{ color: '#3b82f6' }}
                      >
                        <svg viewBox="0 0 24 24"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
                      </button>

                      <button 
                        className="action-icon-btn" 
                        title="Clear Task"
                        onClick={() => completeFollowup(lead.id)}
                        style={{ color: '#10b981' }}
                      >
                        <svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" fill="none"/></svg>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Hand: Course breakdown & Counselor loads */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Courses enrollment load */}
          <div className="dashboard-panel">
            <h3 className="panel-title mb-4">
              <svg viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
              Program Interest Load
            </h3>
            <div className="funnel-container">
              {courses.slice(0, 4).map(course => {
                const count = getCourseLeadCount(course.name);
                const percentage = visibleLeads.length > 0 ? (count / visibleLeads.length) * 100 : 0;
                return (
                  <div key={course.id} className="funnel-stage-row" style={{ height: 'auto', marginBottom: '8px' }}>
                    <div className="funnel-stage-label" title={course.name} style={{ width: '130px', fontSize: '11.5px' }}>{course.code}</div>
                    <div className="funnel-stage-bar-outer" style={{ height: '8px' }}>
                      <div 
                        className="funnel-stage-bar-inner" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="funnel-stage-value" style={{ width: '30px', fontSize: '11.5px' }}>{count}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Counselor Workloads (Visible to Admin/Manager only) */}
          {activeRole !== 'Counselor' && (
            <div className="dashboard-panel">
              <h3 className="panel-title mb-4">
                <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m12-10a4 4 0 11-8 0 4 4 0 018 0z" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
                Counselor Workload Monitor
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {['Elena Gilbert', 'Damon Salvatore', 'Stefan Salvatore'].map(name => {
                  const load = getCounselorLoad(name);
                  return (
                    <div key={name} className="counselor-performance-row">
                      <div className="counselor-prof-avatar">
                        <div className="card-counselor-avatar" style={{ width: '22px', height: '22px', fontSize: '9px' }}>
                          {name.split(' ').map(n=>n[0]).join('')}
                        </div>
                        <span style={{ fontSize: '12.5px', fontWeight: '500' }}>{name}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-val">{load} Leads</span>
                        <span className="stat-lbl">Active load</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
